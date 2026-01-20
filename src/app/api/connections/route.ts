import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { handleApiError } from '@/lib/api';

export const runtime = 'nodejs';

export const GET = async (request: NextRequest) => {
  try {
    const userId = requireUserId(request);

    const accounts = await db.connectedAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        externalUserId: true,
        externalUsername: true,
        externalPageId: true,
        externalIgAccountId: true,
        tokenType: true,
        scope: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(accounts, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Failed to load connections');
  }
};
