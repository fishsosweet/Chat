"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthStatus = void 0;
const prisma_1 = require("../../config/prisma");
const redis_1 = require("../../config/redis");
const getHealthStatus = async (req, res) => {
    let dbStatus = "down";
    let redisStatus = redis_1.isRedisEnabled ? "down" : "disabled";
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        dbStatus = "up";
    }
    catch {
        dbStatus = "down";
    }
    if (redis_1.isRedisEnabled) {
        try {
            if (redis_1.redis.status !== "ready") {
                await redis_1.redis.connect();
            }
            const pong = await redis_1.redis.ping();
            redisStatus = pong === "PONG" ? "up" : "down";
        }
        catch {
            redisStatus = "down";
        }
    }
    const allHealthy = dbStatus === "up" && (redisStatus === "up" || redisStatus === "disabled");
    res.status(allHealthy ? 200 : 503).json({
        success: allHealthy,
        service: "chatrealtime-server",
        env: process.env.NODE_ENV ?? "development",
        timestamp: new Date().toISOString(),
        uptimeSec: Math.floor(process.uptime()),
        dependencies: {
            database: dbStatus,
            redis: redisStatus
        },
        requestId: req.requestId
    });
};
exports.getHealthStatus = getHealthStatus;
