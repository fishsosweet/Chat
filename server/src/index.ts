import { createServer } from "node:http";
import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { isRedisEnabled, redis } from "./config/redis";
import { createSocketServer } from "./realtime/socket.server";
import { setSocketServer } from "./realtime/socket.gateway";

const server = createServer(app);
const io = createSocketServer(server);
setSocketServer(io);

const startServer = async (): Promise<void> => {
  try {
    try {
      await prisma.$connect();
      logger.info("Prisma connected");
    } catch (error) {
      logger.warn({ err: error }, "Database unavailable at startup, continuing in degraded mode");
    }

    if (isRedisEnabled) {
      try {
        await redis.connect();
        logger.info("Redis connected");
      } catch (error) {
        logger.warn({ err: error }, "Redis unavailable at startup, continuing without cache");
      }
    }

    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, "Server started");
    });
  } catch (error) {
    logger.fatal({ err: error }, "Failed to start server");
    process.exit(1);
  }
};

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.info({ signal }, "Shutdown signal received");

  server.close(async () => {
    try {
      await io.close();
      await prisma.$disconnect();
      if (redis.status !== "end") {
        redis.disconnect(false);
      }
      logger.info("Server shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, "Error during shutdown");
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled rejection");
  process.exit(1);
});

void startServer();
