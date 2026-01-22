import { Platform } from '@prisma/client';
import type { PlatformAdapter } from './types';
import { facebookAdapter } from './facebook.adapter';
import { instagramAdapter } from './instagram.adapter';
import { tiktokAdapter } from './tiktok.adapter';
import { youtubeAdapter } from './youtube.adapter';

const adapters: Record<Platform, PlatformAdapter> = {
  [Platform.YOUTUBE]: youtubeAdapter,
  [Platform.INSTAGRAM]: instagramAdapter,
  [Platform.FACEBOOK]: facebookAdapter,
  [Platform.TIKTOK]: tiktokAdapter,
};

export const getPlatformAdapter = (platform: Platform): PlatformAdapter => {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return adapter;
};
