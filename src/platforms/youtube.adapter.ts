import { Platform, Visibility } from '@prisma/client';
import { google } from 'googleapis';
import { getStorageStream } from '@/lib/storage';
import {
  getValidYouTubeAccessToken,
  getYouTubeOAuthClient,
} from '@/lib/oauth/youtube';
import type { PlatformAdapter } from './types';

const mapVisibility = (visibility?: Visibility | null) => {
  switch (visibility) {
    case Visibility.PRIVATE:
      return 'private';
    case Visibility.UNLISTED:
      return 'unlisted';
    case Visibility.PUBLIC:
    default:
      return 'public';
  }
};

export const youtubeAdapter: PlatformAdapter = {
  platform: Platform.YOUTUBE,
  publish: async ({ post, destination, mediaAsset, userId }) => {
    if (mediaAsset.type !== 'VIDEO') {
      throw new Error('YouTube only supports video uploads');
    }

    const accessToken = await getValidYouTubeAccessToken(userId);
    const oauth2Client = getYouTubeOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const mediaStream = await getStorageStream(mediaAsset.storageKey);

    const title = destination.platformTitle ?? post.title ?? 'Untitled video';
    const description = destination.platformDescription ?? post.description ?? '';
    const privacyStatus = mapVisibility(
      destination.platformVisibility ?? post.visibility
    );

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
        },
        status: {
          privacyStatus,
        },
      },
      media: {
        body: mediaStream,
        mimeType: mediaAsset.mimeType ?? undefined,
      },
    });

    const videoId = response.data.id;
    if (!videoId) {
      throw new Error('YouTube did not return a video id');
    }

    return { externalPostId: videoId };
  },
};
