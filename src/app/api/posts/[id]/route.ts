import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { errorResponse, handleApiError } from '@/lib/api';

export const runtime = 'nodejs';

type RouteParams = {
  params: { id: string };
};

const platformSchema = z.enum(['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK']);
const visibilitySchema = z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']);

const updatePostSchema = z.object({
  title: z.string().min(1).nullable().optional(),
  description: z.string().min(1).nullable().optional(),
  hashtags: z.string().min(1).nullable().optional(),
  visibility: visibilitySchema.optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  destinations: z
    .array(
      z.object({
        platform: platformSchema,
        platformTitle: z.string().min(1).nullable().optional(),
        platformDescription: z.string().min(1).nullable().optional(),
        platformVisibility: visibilitySchema.nullable().optional(),
      })
    )
    .optional(),
});

export const GET = async (request: NextRequest, { params }: RouteParams) => {
  try {
    const userId = requireUserId(request);
    const postId = params.id;

    const post = await db.post.findFirst({
      where: { id: postId, userId },
      include: { destinations: true },
    });

    if (!post) {
      return errorResponse(404, 'NOT_FOUND', 'Post not found');
    }

    return NextResponse.json(post, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch post');
  }
};

export const PATCH = async (request: NextRequest, { params }: RouteParams) => {
  try {
    const userId = requireUserId(request);
    const postId = params.id;
    const payload = updatePostSchema.parse(await request.json());

    const post = await db.post.findFirst({
      where: { id: postId, userId },
      select: { id: true },
    });

    if (!post) {
      return errorResponse(404, 'NOT_FOUND', 'Post not found');
    }

    const postData: Prisma.PostUpdateInput = {};
    if (payload.title !== undefined) {
      postData.title = payload.title;
    }
    if (payload.description !== undefined) {
      postData.description = payload.description;
    }
    if (payload.hashtags !== undefined) {
      postData.hashtags = payload.hashtags;
    }
    if (payload.visibility !== undefined) {
      postData.visibility = payload.visibility;
    }
    if (payload.scheduledFor !== undefined) {
      postData.scheduledFor = payload.scheduledFor
        ? new Date(payload.scheduledFor)
        : null;
    }

    const updatedPost = await db.$transaction(async (tx) => {
      if (Object.keys(postData).length > 0) {
        await tx.post.update({
          where: { id: postId },
          data: postData,
        });
      }

      if (payload.destinations) {
        for (const destination of payload.destinations) {
          const destinationData: Prisma.PostDestinationUpdateInput = {};
          if (destination.platformTitle !== undefined) {
            destinationData.platformTitle = destination.platformTitle;
          }
          if (destination.platformDescription !== undefined) {
            destinationData.platformDescription = destination.platformDescription;
          }
          if (destination.platformVisibility !== undefined) {
            destinationData.platformVisibility = destination.platformVisibility;
          }

          if (Object.keys(destinationData).length > 0) {
            await tx.postDestination.upsert({
              where: {
                postId_platform: {
                  postId,
                  platform: destination.platform,
                },
              },
              update: destinationData,
              create: {
                postId,
                platform: destination.platform,
                ...(destination.platformTitle !== undefined
                  ? { platformTitle: destination.platformTitle }
                  : {}),
                ...(destination.platformDescription !== undefined
                  ? { platformDescription: destination.platformDescription }
                  : {}),
                ...(destination.platformVisibility !== undefined
                  ? { platformVisibility: destination.platformVisibility }
                  : {}),
              },
            });
          }
        }
      }

      return tx.post.findFirst({
        where: { id: postId, userId },
        include: { destinations: true },
      });
    });

    if (!updatedPost) {
      return errorResponse(404, 'NOT_FOUND', 'Post not found');
    }

    return NextResponse.json(updatedPost, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Failed to update post');
  }
};
