import { NextRequest, NextResponse } from 'next/server';
import { JobStatus, JobType, PublishStatus } from '@prisma/client';
import { db } from '@/lib/prisma';
import { HttpError, requireUserId } from '@/lib/auth';
import { publishQueue } from '@/lib/queue';

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
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.destinations.length === 0) {
      return NextResponse.json(
        { error: 'Post has no destinations to publish' },
        { status: 400 }
      );
    }

    const platforms = post.destinations.map((destination) => destination.platform);

    const job = await db.job.create({
      data: {
        userId,
        postId: post.id,
        type: JobType.PUBLISH_POST,
        status: JobStatus.PENDING,
        payload: { postId: post.id, platforms },
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
      }
    );

    return NextResponse.json(
      { jobId: job.id, postId: post.id, status: job.status },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to enqueue publish job', error);
    return NextResponse.json(
      { error: 'Failed to enqueue publish job' },
      { status: 500 }
    );
  }
};
