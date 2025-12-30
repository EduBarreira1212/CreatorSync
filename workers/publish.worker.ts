import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import {
  PrismaClient,
  DestinationStatus,
  JobStatus,
  PublishStatus,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL is required to run the worker');
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const logJob = async (
  jobId: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Prisma.InputJsonValue
) => {
  await prisma.jobLog.create({
    data: {
      jobId,
      level,
      message,
      data,
    },
  });
};

const worker = new Worker(
  'publish',
  async (bullJob) => {
    const { jobId } = bullJob.data as { jobId: string };
    const jobRecord = await prisma.job.findUnique({
      where: { id: jobId },
      include: { post: { include: { destinations: true } } },
    });

    if (!jobRecord || !jobRecord.post) {
      throw new Error('Job record or post not found');
    }

    const { post } = jobRecord;
    if (post.destinations.length === 0) {
      throw new Error('Post has no destinations to publish');
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    await logJob(jobId, 'info', 'Starting publish job', {
      postId: post.id,
      destinations: post.destinations.map((dest) => dest.platform),
    });

    let publishedCount = 0;

    for (const destination of post.destinations) {
      try {
        await prisma.postDestination.update({
          where: { id: destination.id },
          data: {
            status: DestinationStatus.UPLOADING,
            attempts: { increment: 1 },
          },
        });
        await logJob(jobId, 'info', `Uploading to ${destination.platform}`);
        await delay(300);

        await prisma.postDestination.update({
          where: { id: destination.id },
          data: { status: DestinationStatus.PROCESSING },
        });
        await logJob(jobId, 'info', `Processing ${destination.platform}`);
        await delay(500);

        await prisma.postDestination.update({
          where: { id: destination.id },
          data: {
            status: DestinationStatus.PUBLISHED,
            externalPostId: `mock_${destination.platform.toLowerCase()}_${Date.now()}`,
          },
        });
        await logJob(jobId, 'info', `Published to ${destination.platform}`);
        publishedCount += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error during publish';
        await prisma.postDestination.update({
          where: { id: destination.id },
          data: {
            status: DestinationStatus.FAILED,
            lastError: message,
            lastErrorAt: new Date(),
          },
        });
        await logJob(jobId, 'error', `Failed to publish ${destination.platform}`, {
          error: message,
        });
      }
    }

    const totalDestinations = post.destinations.length;
    const postStatus =
      publishedCount === totalDestinations
        ? PublishStatus.PUBLISHED
        : publishedCount === 0
          ? PublishStatus.FAILED
          : PublishStatus.PARTIALLY_PUBLISHED;

    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: postStatus,
        ...(postStatus === PublishStatus.PUBLISHED
          ? { publishedAt: new Date() }
          : {}),
      },
    });

    if (postStatus === PublishStatus.FAILED) {
      await logJob(jobId, 'error', 'Publish job failed for all destinations', {
        postStatus,
      });
      throw new Error('All destinations failed to publish');
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.SUCCESS,
        finishedAt: new Date(),
      },
    });

    await logJob(jobId, 'info', 'Publish job completed', {
      postStatus,
    });
  },
  { connection }
);

worker.on('failed', async (bullJob, error) => {
  if (!bullJob) {
    return;
  }

  const jobId = (bullJob.data as { jobId?: string }).jobId;
  if (!jobId) {
    return;
  }

  const jobRecord = await prisma.job.findUnique({ where: { id: jobId } });
  const maxAttempts = jobRecord?.maxAttempts ?? 1;
  const attemptsMade = bullJob.attemptsMade + 1;
  const isFinalAttempt = attemptsMade >= maxAttempts;
  const message = error instanceof Error ? error.message : 'Unknown worker error';

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: isFinalAttempt ? JobStatus.FAILED : JobStatus.PENDING,
      lastError: message,
      ...(isFinalAttempt ? { finishedAt: new Date() } : {}),
    },
  });

  await logJob(jobId, 'error', 'Publish job failed', {
    error: message,
    attemptsMade,
    maxAttempts,
  });
});

const shutdown = async () => {
  await worker.close();
  await prisma.$disconnect();
  await connection.quit();
};

process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  shutdown().finally(() => process.exit(0));
});
