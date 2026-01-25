# Creator Sync Full Stack

Full stack project in Next.js (App Router) to centralize media uploads, post creation, multi-platform publishing, and a web UI to operate the flow.

## Overview

This project provides an API and a web interface to:

- Upload images/videos and store locally or in S3.
- Create posts with platform destinations (YouTube, Instagram, etc.).
- Schedule publishes and enqueue publish jobs.
- Connect accounts via OAuth (YouTube) and list connections.
- Track publishing status in the dashboard.

## Stack

- Node.js 20+
- Next.js 16 (App Router)
- Prisma + PostgreSQL
- BullMQ + Redis
- AWS S3 (optional)
- Google OAuth (YouTube)

## Frontend (UI)

Main routes:

- `/`: home with shortcuts to app areas.
- `/settings/connections`: connect accounts (YouTube) and view token status.
- `/create`: media upload, post creation, and publish trigger.
- `/posts`: list of recent publishes.
- `/posts/:id`: post details and per-destination status.

Note: the UI uses the `x-user-id` stored in `localStorage` for all API calls.

## Main flow (API + Worker)

1. **Media upload**: the file is sent to `/api/media` and stored locally (`/tmp/uploads`) or in S3.
2. **Post creation**: the post is created with destinations (`platforms`) in `/api/posts`.
3. **Publish**: `/api/posts/:id/publish` enqueues a job in BullMQ (with delay if `scheduledFor` is set).
4. **Worker**: the worker consumes the queue, publishes to each destination, and updates status/errors in the database.

## Requirements

- Node.js 20+
- PostgreSQL
- Redis
- AWS S3 (optional; use `LOCAL_STORAGE=true` to store on disk)

## Quick setup

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
```

### Database and Redis

You can use your local services or adjust `docker-compose.yml` to run PostgreSQL. Redis is not included in the compose file, so run it separately.

## Run the app (frontend + API)

```bash
npm run dev
```

Open `http://localhost:3000` in the browser.

## Run the worker

In another terminal:

```bash
npm run worker:publish
```

## Useful scripts

- `npm run dev`: app in development mode
- `npm run build`: production build
- `npm run start`: run production build
- `npm run prisma:migrate`: run migrations
- `npm run prisma:studio`: open Prisma Studio
- `npm run worker:publish`: publish worker

## Authentication

The API uses a simple `x-user-id` header to identify the user. Without it, the API returns 401.

## Environment variables

| Variable | Description | Required |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `LOCAL_STORAGE` | `true` to save in `/tmp/uploads` | Yes |
| `S3_BUCKET` | S3 bucket for uploads | If `LOCAL_STORAGE=false` |
| `AWS_REGION` | AWS region | If `LOCAL_STORAGE=false` |
| `AWS_ACCESS_KEY_ID` | AWS credential | If `LOCAL_STORAGE=false` |
| `AWS_SECRET_ACCESS_KEY` | AWS credential | If `LOCAL_STORAGE=false` |
| `AWS_SESSION_TOKEN` | Temporary credential | Optional |
| `GOOGLE_CLIENT_ID` | Google OAuth client | Yes for OAuth |
| `GOOGLE_CLIENT_SECRET` | OAuth secret | Yes for OAuth |
| `GOOGLE_REDIRECT_URI` | OAuth callback | Yes for OAuth |
| `OAUTH_STATE_SECRET` | OAuth state secret | Yes for OAuth |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes base64 or hex | Yes |

## Endpoints

### Media upload

`POST /api/media`

```bash
curl -X POST http://localhost:3000/api/media \
  -H "x-user-id: user_123" \
  -F "file=@/path/to/file.jpg"
```

### Create post

`POST /api/posts`

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{
    "mediaAssetId": "MEDIA_ASSET_ID",
    "title": "My post",
    "description": "Description",
    "hashtags": "#mvp #creator",
    "visibility": "PUBLIC",
    "platforms": ["YOUTUBE", "INSTAGRAM"],
    "scheduledFor": "2026-01-30T15:00:00.000Z"
  }'
```

Supported values:

- `platforms`: `YOUTUBE`, `INSTAGRAM`, `FACEBOOK`, `TIKTOK`
- `visibility`: `PUBLIC`, `UNLISTED`, `PRIVATE`
- `scheduledFor`: ISO 8601 UTC (e.g., `2026-01-30T15:00:00.000Z`)

### List posts

`GET /api/posts?take=20`

```bash
curl -X GET "http://localhost:3000/api/posts?take=20" \
  -H "x-user-id: user_123"
```

### Get post

`GET /api/posts/:id`

```bash
curl -X GET http://localhost:3000/api/posts/POST_ID \
  -H "x-user-id: user_123"
```

### Update post

`PATCH /api/posts/:id`

```bash
curl -X PATCH http://localhost:3000/api/posts/POST_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{ "title": "New title" }'
```

### Enqueue publish

`POST /api/posts/:id/publish`

```bash
curl -X POST http://localhost:3000/api/posts/POST_ID/publish \
  -H "x-user-id: user_123"
```

### List connections

`GET /api/connections`

```bash
curl -X GET http://localhost:3000/api/connections \
  -H "x-user-id: user_123"
```

### YouTube OAuth

- `GET /api/oauth/youtube/start`: starts the flow and redirects to Google.
- `GET /api/oauth/youtube/callback`: callback configured in Google.
- `POST /api/oauth/youtube/refresh`: refreshes the access token server-side.

```bash
curl -X GET http://localhost:3000/api/oauth/youtube/start \
  -H "x-user-id: user_123"
```

```bash
curl -X POST http://localhost:3000/api/oauth/youtube/refresh \
  -H "x-user-id: user_123"
```

## Notes

- When `LOCAL_STORAGE=true`, files are stored in `/tmp/uploads`.
- When `LOCAL_STORAGE=false`, the backend generates a signed S3 URL (5 minute TTL) for access.
- The worker must be running to publish posts and update status.
