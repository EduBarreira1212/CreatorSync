import { Platform } from '@prisma/client';
import type { PlatformAdapter } from './types';

export const facebookAdapter: PlatformAdapter = {
  platform: Platform.FACEBOOK,
  publish: async () => {
    throw new Error('Facebook publishing is not available yet.');
  },
};
