import { Platform } from '@prisma/client';
import type { PlatformAdapter } from './types';

export const tiktokAdapter: PlatformAdapter = {
  platform: Platform.TIKTOK,
  publish: async () => {
    throw new Error('TikTok publishing is not available yet.');
  },
};
