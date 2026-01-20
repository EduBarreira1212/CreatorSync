import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { errorResponse, handleApiError } from '@/lib/api';

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
  scheduledFor: z.string().datetime().optional(),
});

const listPostsSchema = z.object({
  take: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = async (request: NextRequest) => {
  try {
    const userId = requireUserId(request);
    const { searchParams } = new URL(request.url);
    const payload = listPostsSchema.parse({
      take: searchParams.get('take') ?? undefined,
    });

    const posts = await db.post.findMany({
      where: { userId },
      include: { destinations: true },
      orderBy: { createdAt: 'desc' },
      take: payload.take,
    });

    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Failed to list posts');
  }
};

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
      return errorResponse(404, 'NOT_FOUND', 'Media asset not found');
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
        ...(payload.scheduledFor
          ? { scheduledFor: new Date(payload.scheduledFor) }
          : {}),
        ...(destinations.length
          ? { destinations: { create: destinations } }
          : {}),
      },
      include: { destinations: true },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create post');
  }
};
