"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const prisma_1 = require("./config/prisma");
const redis_1 = require("./config/redis");
const socket_server_1 = require("./realtime/socket.server");
const socket_gateway_1 = require("./realtime/socket.gateway");
const server = (0, node_http_1.createServer)(app_1.app);
const io = (0, socket_server_1.createSocketServer)(server);
(0, socket_gateway_1.setSocketServer)(io);
const startServer = async () => {
    try {
        try {
            await prisma_1.prisma.$connect();
            logger_1.logger.info("Prisma connected");
        }
        catch (error) {
            logger_1.logger.warn({ err: error }, "Database unavailable at startup, continuing in degraded mode");
        }
        if (redis_1.isRedisEnabled) {
            try {
                await redis_1.redis.connect();
                logger_1.logger.info("Redis connected");
            }
            catch (error) {
                logger_1.logger.warn({ err: error }, "Redis unavailable at startup, continuing without cache");
            }
        }
        server.listen(env_1.env.PORT, () => {
            logger_1.logger.info({ port: env_1.env.PORT, env: env_1.env.NODE_ENV }, "Server started");
        });
    }
    catch (error) {
        logger_1.logger.fatal({ err: error }, "Failed to start server");
        process.exit(1);
    }
};
const shutdown = async (signal) => {
    logger_1.logger.info({ signal }, "Shutdown signal received");
    server.close(async () => {
        try {
            await io.close();
            await prisma_1.prisma.$disconnect();
            if (redis_1.redis.status !== "end") {
                redis_1.redis.disconnect(false);
            }
            logger_1.logger.info("Server shutdown complete");
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Error during shutdown");
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
    logger_1.logger.fatal({ err: error }, "Uncaught exception");
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    logger_1.logger.fatal({ err: reason }, "Unhandled rejection");
    process.exit(1);
});
void startServer();
