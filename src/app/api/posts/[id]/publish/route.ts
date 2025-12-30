import { NextRequest, NextResponse } from 'next/server';
import { JobStatus, JobType, PublishStatus } from '@prisma/client';
import { db } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { publishQueue } from '@/lib/queue';
import { errorResponse, handleApiError } from '@/lib/api';

export const runtime = 'nodejs';

type RouteParams = {
  params: { id: string };
};

export const POST = async (request: NextRequest, { params }: RouteParams) => {
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

    if (post.destinations.length === 0) {
      return errorResponse(
        400,
        'BAD_REQUEST',
        'Post has no destinations to publish'
      );
    }

    const platforms = post.destinations.map((destination) => destination.platform);
    const runAt = post.scheduledFor ?? null;
    const delay = runAt ? Math.max(runAt.getTime() - Date.now(), 0) : 0;

    const job = await db.job.create({
      data: {
        userId,
        postId: post.id,
        type: JobType.PUBLISH_POST,
        status: JobStatus.PENDING,
        payload: { postId: post.id, platforms },
        ...(runAt ? { runAt } : {}),
      },
    });

    await db.post.update({
      where: { id: post.id },
      data: { status: PublishStatus.QUEUED },
    });

    await publishQueue.add(
      'publish',
      { jobId: job.id },
      {
        attempts: job.maxAttempts,
        backoff: { type: 'exponential', delay: 5000 },
        ...(runAt ? { delay } : {}),
      }
    );

    return NextResponse.json(
      { jobId: job.id, postId: post.id, status: job.status },
      { status: 202 }
    );
  } catch (error) {
    return handleApiError(error, 'Failed to enqueue publish job');
  }
};
