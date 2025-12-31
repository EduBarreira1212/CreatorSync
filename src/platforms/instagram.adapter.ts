import { Platform } from '@prisma/client';
import type { PlatformAdapter } from './types';

export const instagramAdapter: PlatformAdapter = {
  platform: Platform.INSTAGRAM,
  publish: async () => {
    throw new Error('Instagram publishing is not available yet.');
  },
};
