import { NextRequest, NextResponse } from 'next/server';
import { Platform } from '@prisma/client';
import { db } from '@/lib/prisma';
import { encryptString } from '@/lib/crypto';
import {
  decodeState,
  fetchYouTubeProfile,
  getYouTubeOAuthClient,
} from '@/lib/oauth/youtube';
import { errorResponse, handleApiError } from '@/lib/api';

export const runtime = 'nodejs';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return errorResponse(400, 'BAD_REQUEST', 'Missing code or state');
    }

    const { userId } = decodeState(state);
    const oauth2Client = getYouTubeOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return errorResponse(400, 'BAD_REQUEST', 'Missing access token from Google');
    }

    oauth2Client.setCredentials(tokens);

    const profile = await fetchYouTubeProfile(tokens.access_token);
    const existingAccount = await db.connectedAccount.findUnique({
      where: { userId_platform: { userId, platform: Platform.YOUTUBE } },
    });

    const refreshToken = tokens.refresh_token
      ? encryptString(tokens.refresh_token)
      : existingAccount?.refreshToken ?? null;

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    const accessToken = encryptString(tokens.access_token);

    await db.connectedAccount.upsert({
      where: { userId_platform: { userId, platform: Platform.YOUTUBE } },
      update: {
        accessToken,
        refreshToken: refreshToken ?? existingAccount?.refreshToken ?? null,
        scope: tokens.scope ?? existingAccount?.scope ?? null,
        tokenType: tokens.token_type ?? existingAccount?.tokenType ?? null,
        expiresAt,
        isActive: true,
        externalUserId: profile.externalUserId ?? existingAccount?.externalUserId,
        externalUsername:
          profile.externalUsername ?? existingAccount?.externalUsername,
      },
      create: {
        userId,
        platform: Platform.YOUTUBE,
        accessToken,
        refreshToken,
        scope: tokens.scope ?? null,
        tokenType: tokens.token_type ?? null,
        expiresAt,
        isActive: true,
        externalUserId: profile.externalUserId ?? null,
        externalUsername: profile.externalUsername ?? null,
      },
    });

    return NextResponse.redirect(
      new URL('/settings/connections?connected=youtube', request.url)
    );
  } catch (error) {
    return handleApiError(error, 'Failed to complete YouTube OAuth');
  }
};
