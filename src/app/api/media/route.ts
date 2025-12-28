import { NextRequest, NextResponse } from 'next/server';
import { MediaType } from '@prisma/client';
import { db } from '@/lib/prisma';
import { HttpError, requireUserId } from '@/lib/auth';
import { uploadToStorage } from '@/lib/storage';

export const runtime = 'nodejs';

const isAcceptedMimeType = (mimeType: string) =>
  mimeType.startsWith('image/') || mimeType.startsWith('video/');

export const POST = async (request: NextRequest) => {
  try {
    const userId = requireUserId(request);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing file field' },
        { status: 400 }
      );
    }

    const mimeType = file.type || 'application/octet-stream';
    if (!isAcceptedMimeType(mimeType)) {
      return NextResponse.json(
        { error: 'Only image or video uploads are supported' },
        { status: 400 }
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
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to upload media', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
};
