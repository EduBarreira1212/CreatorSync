import type { NextRequest } from 'next/server';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const requireUserId = (request: NextRequest): string => {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    throw new HttpError(401, 'Missing x-user-id header');
  }

  return userId;
};
