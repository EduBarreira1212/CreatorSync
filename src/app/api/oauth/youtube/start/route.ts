import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { createYouTubeAuthUrl } from '@/lib/oauth/youtube';
import { handleApiError } from '@/lib/api';

export const runtime = 'nodejs';

export const GET = async (request: NextRequest) => {
  try {
    const userId = requireUserId(request);
    const url = createYouTubeAuthUrl(userId);

    return NextResponse.redirect(url);
  } catch (error) {
    return handleApiError(error, 'Failed to start YouTube OAuth');
  }
};
