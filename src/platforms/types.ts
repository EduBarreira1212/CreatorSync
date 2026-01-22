import type { MediaAsset, Post, PostDestination, Platform } from '@prisma/client';

export type PublishParams = {
  post: Post;
  destination: PostDestination;
  mediaAsset: MediaAsset;
  userId: string;
};

export type PublishResult = {
  externalPostId: string;
  externalMediaId?: string | null;
};

export type PlatformAdapter = {
  platform: Platform;
  publish: (params: PublishParams) => Promise<PublishResult>;
};
