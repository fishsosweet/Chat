# Step 3 - Backend Bootstrap (Production Foundation)

## Completed Scope
A production-oriented backend foundation has been initialized in the server workspace with:
- Express + TypeScript architecture
- Security middleware baseline
- Structured logging
- Prisma + PostgreSQL connection layer
- Redis cache client layer (graceful degraded mode)
- Swagger API docs
- Health check endpoint
- Centralized error handling

## Server Structure
- src/app.ts: express app composition
- src/index.ts: server bootstrap and graceful shutdown
- src/config/env.ts: environment schema validation (zod)
- src/config/logger.ts: pino logger
- src/config/cors.ts: dynamic CORS whitelist
- src/config/prisma.ts: PrismaClient with Prisma PostgreSQL adapter
- src/config/redis.ts: ioredis client (lazy + non-blocking startup)
- src/common/errors/app-error.ts: typed app error
- src/common/middlewares/*: requestId, validation, notFound, errorHandler
- src/common/utils/async-handler.ts: async route wrapper
- src/modules/health/*: health API module
- src/routes/index.ts: versioned API router
- src/docs/swagger.ts: OpenAPI generator config

## Security Baseline
- Helmet
- CORS whitelist
- Global rate limit
- Request ID tracing
- Body size limit and standardized JSON errors

## API Endpoints
- GET /
- GET /docs
- GET /api/v1/health

## Run Commands
From repository root:

```bash
npm --prefix server run prisma:generate
npm --prefix server run dev
```

Build and run:

```bash
npm --prefix server run build
npm --prefix server run start
```

## Validation Status
- Type check: PASS
- Build: PASS
- Runtime start: PASS
- Root endpoint: HTTP 200
- Health endpoint: reachable (returns HTTP 503 when dependencies are unavailable)

## Notes
- Prisma 7 requires a driver adapter at runtime; server is configured with `@prisma/adapter-pg`.
- Redis is optional for startup in this step; if Redis is down, server still starts in degraded mode.
