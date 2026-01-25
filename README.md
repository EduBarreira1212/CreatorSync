# Creator Sync Full Stack

Projeto full stack em Next.js (App Router) para centralizar upload de midia, criacao de posts, publicacao em multiplas plataformas e uma interface web para operacao do fluxo.

## Visao geral

Este projeto fornece uma API e uma interface web para:

- Fazer upload de imagens/videos e armazenar localmente ou no S3.
- Criar posts com destinos por plataforma (YouTube, Instagram, etc.).
- Agendar publicacoes e enfileirar jobs de publicacao.
- Conectar contas via OAuth (YouTube) e listar conexoes.
- Acompanhar o status de publicacao pelo dashboard.

## Stack

- Node.js 20+
- Next.js 16 (App Router)
- Prisma + PostgreSQL
- BullMQ + Redis
- AWS S3 (opcional)
- Google OAuth (YouTube)

## Frontend (UI)

Rotas principais:

- `/`: home com atalhos para as areas do app.
- `/settings/connections`: conectar contas (YouTube) e ver status de tokens.
- `/create`: upload de midia, criacao de post e disparo de publicacao.
- `/posts`: lista de publicacoes recentes.
- `/posts/:id`: detalhes do post e status por destino.

Observacao: a UI usa o `x-user-id` salvo no `localStorage` para todas as chamadas da API.

## Fluxo principal (API + Worker)

1. **Upload de midia**: o arquivo e enviado para `/api/media` e armazenado localmente (`/tmp/uploads`) ou no S3.
2. **Criacao de post**: o post e criado com destinos (`platforms`) em `/api/posts`.
3. **Publicacao**: `/api/posts/:id/publish` enfileira um job no BullMQ (com delay se houver `scheduledFor`).
4. **Worker**: o worker consome a fila, publica em cada destino e atualiza status/erros no banco.

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

### Banco e Redis

Voce pode usar seus servicos locais ou ajustar o `docker-compose.yml` para subir o PostgreSQL. O Redis nao esta incluido no compose, entao rode-o separadamente.

## Rodar o app (frontend + API)

```bash
npm run dev
```

Acesse `http://localhost:3000` no navegador.

## Rodar o worker

Em outro terminal:

```bash
npm run worker:publish
```

## Scripts uteis

- `npm run dev`: app em modo desenvolvimento
- `npm run build`: build de producao
- `npm run start`: executar build
- `npm run prisma:migrate`: rodar migracoes
- `npm run prisma:studio`: abrir Prisma Studio
- `npm run worker:publish`: worker de publicacao

## Autenticacao

A API usa um cabecalho simples `x-user-id` para identificar o usuario. Sem ele, a API retorna 401.

## Variaveis de ambiente

| Variavel | Descricao | Obrigatorio |
| --- | --- | --- |
| `DATABASE_URL` | String de conexao do PostgreSQL | Sim |
| `REDIS_URL` | String de conexao do Redis | Sim |
| `LOCAL_STORAGE` | `true` para salvar em `/tmp/uploads` | Sim |
| `S3_BUCKET` | Bucket S3 para uploads | Se `LOCAL_STORAGE=false` |
| `AWS_REGION` | Regiao da AWS | Se `LOCAL_STORAGE=false` |
| `AWS_ACCESS_KEY_ID` | Credencial AWS | Se `LOCAL_STORAGE=false` |
| `AWS_SECRET_ACCESS_KEY` | Credencial AWS | Se `LOCAL_STORAGE=false` |
| `AWS_SESSION_TOKEN` | Credencial temporaria | Opcional |
| `GOOGLE_CLIENT_ID` | Cliente OAuth do Google | Sim para OAuth |
| `GOOGLE_CLIENT_SECRET` | Segredo OAuth do Google | Sim para OAuth |
| `GOOGLE_REDIRECT_URI` | Callback OAuth | Sim para OAuth |
| `OAUTH_STATE_SECRET` | Segredo para state OAuth | Sim para OAuth |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes base64 ou hex | Sim |

## Endpoints

### Upload de midia

`POST /api/media`

```bash
curl -X POST http://localhost:3000/api/media \
  -H "x-user-id: user_123" \
  -F "file=@/path/to/file.jpg"
```

### Criar post

`POST /api/posts`

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
    "platforms": ["YOUTUBE", "INSTAGRAM"],
    "scheduledFor": "2026-01-30T15:00:00.000Z"
  }'
```

Valores suportados:

- `platforms`: `YOUTUBE`, `INSTAGRAM`, `FACEBOOK`, `TIKTOK`
- `visibility`: `PUBLIC`, `UNLISTED`, `PRIVATE`
- `scheduledFor`: ISO 8601 em UTC (ex.: `2026-01-30T15:00:00.000Z`)

### Listar posts

`GET /api/posts?take=20`

```bash
curl -X GET "http://localhost:3000/api/posts?take=20" \
  -H "x-user-id: user_123"
```

### Buscar post

`GET /api/posts/:id`

```bash
curl -X GET http://localhost:3000/api/posts/POST_ID \
  -H "x-user-id: user_123"
```

### Atualizar post

`PATCH /api/posts/:id`

```bash
curl -X PATCH http://localhost:3000/api/posts/POST_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{ "title": "Novo titulo" }'
```

### Enfileirar publicacao

`POST /api/posts/:id/publish`

```bash
curl -X POST http://localhost:3000/api/posts/POST_ID/publish \
  -H "x-user-id: user_123"
```

### Listar conexoes

`GET /api/connections`

```bash
curl -X GET http://localhost:3000/api/connections \
  -H "x-user-id: user_123"
```

### OAuth YouTube

- `GET /api/oauth/youtube/start`: inicia o fluxo e redireciona para o Google.
- `GET /api/oauth/youtube/callback`: callback configurado no Google.
- `POST /api/oauth/youtube/refresh`: renova o access token no backend.

```bash
curl -X GET http://localhost:3000/api/oauth/youtube/start \
  -H "x-user-id: user_123"
```

```bash
curl -X POST http://localhost:3000/api/oauth/youtube/refresh \
  -H "x-user-id: user_123"
```

## Observacoes

- Quando `LOCAL_STORAGE=true`, os arquivos ficam em `/tmp/uploads`.
- Quando `LOCAL_STORAGE=false`, o backend gera uma URL assinada do S3 (TTL de 5 minutos) para acesso.
- O worker precisa estar rodando para publicar posts e atualizar status.
