import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { forceRefreshYouTubeAccessToken } from '@/lib/oauth/youtube';
import { handleApiError } from '@/lib/api';

export const runtime = 'nodejs';

export const POST = async (request: NextRequest) => {
  try {
    const userId = requireUserId(request);
    await forceRefreshYouTubeAccessToken(userId);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Failed to refresh YouTube token');
  }
};
