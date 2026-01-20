import { Platform } from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { google } from 'googleapis';
import { db } from '@/lib/prisma';
import { decryptString, encryptString } from '@/lib/crypto';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

const getOAuthStateSecret = () => {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error('OAUTH_STATE_SECRET is required');
  }

  return secret;
};

export const getYouTubeOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are required');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

type OAuthStatePayload = {
  userId: string;
  nonce: string;
};

const encodeState = (payload: OAuthStatePayload) => {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', getOAuthStateSecret())
    .update(encoded)
    .digest('base64url');

  return `${encoded}.${signature}`;
};

export const decodeState = (state: string): OAuthStatePayload => {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) {
    throw new Error('Invalid OAuth state');
  }

  const expected = createHmac('sha256', getOAuthStateSecret())
    .update(encoded)
    .digest('base64url');

  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    throw new Error('Invalid OAuth state');
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OAuthStatePayload;
  if (!payload.userId || !payload.nonce) {
    throw new Error('Invalid OAuth state');
  }

  return payload;
};

export const createYouTubeAuthUrl = (userId: string) => {
  const oauth2Client = getYouTubeOAuthClient();
  const state = encodeState({ userId, nonce: randomUUID() });

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: YOUTUBE_SCOPES,
    include_granted_scopes: true,
    state,
  });
};

export const fetchYouTubeProfile = async (accessToken: string) => {
  const oauth2Client = getYouTubeOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const response = await youtube.channels.list({
    part: ['snippet'],
    mine: true,
  });

  const channel = response.data.items?.[0];
  if (!channel) {
    return {};
  }

  return {
    externalUserId: channel.id ?? undefined,
    externalUsername: channel.snippet?.title ?? undefined,
  };
};

const refreshYouTubeTokens = async (refreshToken: string) => {
  const oauth2Client = getYouTubeOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error('Failed to refresh YouTube access token');
  }

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token ?? null,
    tokenType: credentials.token_type ?? null,
    scope: credentials.scope ?? null,
    expiresAt,
  };
};

export const getValidYouTubeAccessToken = async (userId: string) => {
  const account = await db.connectedAccount.findUnique({
    where: { userId_platform: { userId, platform: Platform.YOUTUBE } },
  });

  if (!account || !account.isActive) {
    throw new Error('YouTube account not connected');
  }

  if (!account.accessToken) {
    throw new Error('YouTube account is missing access token');
  }

  const accessToken = decryptString(account.accessToken);
  const refreshToken = account.refreshToken ? decryptString(account.refreshToken) : null;
  const expiresAtMs = account.expiresAt ? account.expiresAt.getTime() : 0;
  const isExpired = !expiresAtMs || expiresAtMs <= Date.now() + 60_000;

  if (!isExpired) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error('YouTube token expired. Reconnect your account.');
  }

  const refreshed = await refreshYouTubeTokens(refreshToken);

  await db.connectedAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encryptString(refreshed.accessToken),
      ...(refreshed.refreshToken
        ? { refreshToken: encryptString(refreshed.refreshToken) }
        : {}),
      expiresAt: refreshed.expiresAt,
      tokenType: refreshed.tokenType ?? account.tokenType,
      scope: refreshed.scope ?? account.scope,
      isActive: true,
    },
  });

  return refreshed.accessToken;
};

export const forceRefreshYouTubeAccessToken = async (userId: string) => {
  const account = await db.connectedAccount.findUnique({
    where: { userId_platform: { userId, platform: Platform.YOUTUBE } },
  });

  if (!account || !account.isActive) {
    throw new Error('YouTube account not connected');
  }

  if (!account.refreshToken) {
    throw new Error('YouTube account does not have a refresh token');
  }

  const refreshToken = decryptString(account.refreshToken);
  const refreshed = await refreshYouTubeTokens(refreshToken);

  await db.connectedAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encryptString(refreshed.accessToken),
      ...(refreshed.refreshToken
        ? { refreshToken: encryptString(refreshed.refreshToken) }
        : {}),
      expiresAt: refreshed.expiresAt,
      tokenType: refreshed.tokenType ?? account.tokenType,
      scope: refreshed.scope ?? account.scope,
      isActive: true,
    },
  });

  return refreshed.accessToken;
};

export const getYouTubeScopes = () => YOUTUBE_SCOPES;
