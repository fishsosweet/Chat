# Deploy Production (Docker Compose)

This guide deploys:
- API + Socket.IO server
- PostgreSQL
- Redis
- Web gateway (Nginx) serving:
  - User app at /
  - Admin app at /admin
  - API proxy at /api/*
  - Socket proxy at /socket.io/*

## 1. Prepare server

Install Docker Engine + Docker Compose plugin on your VPS.

## 2. Configure environment

From project root:

```bash
cp .env.prod.example .env.prod
```

Edit `.env.prod` and set all strong secrets and real domains.

Important variables:
- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EMAIL_VERIFY_SECRET`
- `JWT_RESET_PASSWORD_SECRET`
- `CORS_ORIGINS`
- `CLIENT_VITE_API_BASE_URL`
- `CLIENT_VITE_SOCKET_URL`
- `ADMIN_VITE_API_BASE_URL`

## 3. Build and run

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 4. Verify services

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f server
```

Check:
- `http://YOUR_SERVER_IP/` user app
- `http://YOUR_SERVER_IP/admin` admin app
- `http://YOUR_SERVER_IP/api/v1/health` API

## 5. Update deployment

```bash
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 6. Backup (recommended)

Postgres volume name:
- `chatrealtime_postgres_data`

Redis volume name:
- `chatrealtime_redis_data`

Use regular volume backups or managed DB snapshots.

## 7. TLS/HTTPS

This compose exposes port 80 by default. For production HTTPS, place Cloudflare/Nginx/Caddy in front, or extend Nginx config with certificates.
