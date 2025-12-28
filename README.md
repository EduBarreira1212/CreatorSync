# Creator Sync MVP Backend

Backend MVP em Next.js (App Router) com Prisma, BullMQ e upload de midia.

## Requisitos

- Node.js 20+
- PostgreSQL
- Redis
- AWS S3 (opcional; use `LOCAL_STORAGE=true` para salvar em disco)

## Configuracao rapida

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## Rodar a API

```bash
npm run dev
```

## Rodar o worker

```bash
npm run worker:publish
```

## Variaveis de ambiente

- `DATABASE_URL`
- `REDIS_URL`
- `LOCAL_STORAGE` ("true" para salvar em `/tmp/uploads`)
- `S3_BUCKET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` (opcional)

## Exemplos de request

### POST /api/media

```bash
curl -X POST http://localhost:3000/api/media \
  -H "x-user-id: user_123" \
  -F "file=@/path/to/file.jpg"
```

### POST /api/posts

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{
    "mediaAssetId": "MEDIA_ASSET_ID",
    "title": "Meu post",
    "description": "Descricao",
    "hashtags": "#mvp #creator",
    "visibility": "PUBLIC",
    "platforms": ["YOUTUBE", "INSTAGRAM"]
  }'
```

### POST /api/posts/:id/publish

```bash
curl -X POST http://localhost:3000/api/posts/POST_ID/publish \
  -H "x-user-id: user_123"
```
