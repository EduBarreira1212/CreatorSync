import { NextRequest, NextResponse } from 'next/server';
import { MediaType } from '@prisma/client';
import { db } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { uploadToStorage } from '@/lib/storage';
import { errorResponse, handleApiError } from '@/lib/api';

export const runtime = 'nodejs';

const isAcceptedMimeType = (mimeType: string) =>
  mimeType.startsWith('image/') || mimeType.startsWith('video/');

export const POST = async (request: NextRequest) => {
  try {
    const userId = requireUserId(request);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return errorResponse(400, 'BAD_REQUEST', 'Missing file field');
    }

    const mimeType = file.type || 'application/octet-stream';
    if (!isAcceptedMimeType(mimeType)) {
      return errorResponse(
        400,
        'BAD_REQUEST',
        'Only image or video uploads are supported'
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { storageKey, url } = await uploadToStorage(
      fileBuffer,
      file.name || 'upload',
      mimeType
    );

    const mediaAsset = await db.mediaAsset.create({
      data: {
        userId,
        type: mimeType.startsWith('image/') ? MediaType.IMAGE : MediaType.VIDEO,
        storageKey,
        url,
        mimeType,
        sizeBytes: BigInt(file.size),
        originalFilename: file.name || null,
      },
    });

    return NextResponse.json(
      {
        mediaAssetId: mediaAsset.id,
        type: mediaAsset.type,
        storageKey: mediaAsset.storageKey,
        url: mediaAsset.url,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'Failed to upload media');
  }
};
