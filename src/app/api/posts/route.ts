import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/prisma';
import { HttpError, requireUserId } from '@/lib/auth';

export const runtime = 'nodejs';

const platformSchema = z.enum(['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK']);
const visibilitySchema = z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']);

const createPostSchema = z.object({
  mediaAssetId: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  hashtags: z.string().min(1).optional(),
  visibility: visibilitySchema.optional(),
  platforms: z.array(platformSchema).default([]),
});

export const POST = async (request: NextRequest) => {
  try {
    const userId = requireUserId(request);
    const payload = createPostSchema.parse(await request.json());

    const mediaAsset = await db.mediaAsset.findFirst({
      where: {
        id: payload.mediaAssetId,
        userId,
      },
      select: { id: true },
    });

    if (!mediaAsset) {
      return NextResponse.json(
        { error: 'Media asset not found' },
        { status: 404 }
      );
    }

    const destinations = payload.platforms.map((platform) => ({ platform }));

    const post = await db.post.create({
      data: {
        userId,
        mediaAssetId: payload.mediaAssetId,
        title: payload.title ?? null,
        description: payload.description ?? null,
        hashtags: payload.hashtags ?? null,
        ...(payload.visibility ? { visibility: payload.visibility } : {}),
        ...(destinations.length
          ? { destinations: { create: destinations } }
          : {}),
      },
      include: { destinations: true },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: error.flatten() },
        { status: 400 }
      );
    }

    console.error('Failed to create post', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
};
