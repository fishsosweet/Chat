FROM node:22-alpine AS builder
WORKDIR /app

COPY server/package*.json ./
COPY server/prisma ./prisma
COPY server/prisma.config.ts ./prisma.config.ts
RUN npm ci

COPY server/tsconfig.json ./tsconfig.json
COPY server/src ./src
COPY server/scripts ./scripts

RUN npm run prisma:generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 8080

CMD ["sh", "-c", "npm run prisma:migrate:deploy && node dist/index.js"]
