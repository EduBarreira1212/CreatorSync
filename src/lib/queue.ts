import { Queue } from 'bullmq';
import IORedis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var bullmqConnection: IORedis | undefined;
  // eslint-disable-next-line no-var
  var publishQueue: Queue | undefined;
}

const getRedisUrl = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is required');
  }

  return redisUrl;
};

const createConnection = () => {
  const redisUrl = getRedisUrl();
  return new IORedis(redisUrl, { maxRetriesPerRequest: null });
};

const connection = global.bullmqConnection ?? createConnection();
if (process.env.NODE_ENV !== 'production') {
  global.bullmqConnection = connection;
}

export const publishQueue =
  global.publishQueue ?? new Queue('publish', { connection });

if (process.env.NODE_ENV !== 'production') {
  global.publishQueue = publishQueue;
}
