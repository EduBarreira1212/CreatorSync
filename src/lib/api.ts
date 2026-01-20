import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError } from '@/lib/auth';

type ErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

const statusToCode = (status: number) => {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    default:
      return 'ERROR';
  }
};

export const errorResponse = (
  status: number,
  code: string,
  message: string,
  details?: unknown
) =>
  NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    } satisfies ErrorPayload,
    { status }
  );

export const handleApiError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof HttpError) {
    return errorResponse(error.status, statusToCode(error.status), error.message);
  }

  if (error instanceof z.ZodError) {
    return errorResponse(
      400,
      'VALIDATION_ERROR',
      'Invalid request payload',
      error.flatten()
    );
  }

  console.error(fallbackMessage, error);
  return errorResponse(500, 'INTERNAL_ERROR', fallbackMessage);
};
