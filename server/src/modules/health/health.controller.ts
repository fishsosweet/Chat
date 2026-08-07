import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { isRedisEnabled, redis } from "../../config/redis";

export const getHealthStatus = async (req: Request, res: Response): Promise<void> => {
  let dbStatus: "up" | "down" = "down";
  let redisStatus: "up" | "down" | "disabled" = isRedisEnabled ? "down" : "disabled";

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "up";
  } catch {
    dbStatus = "down";
  }

  if (isRedisEnabled) {
    try {
      if (redis.status !== "ready") {
        await redis.connect();
      }
      const pong = await redis.ping();
      redisStatus = pong === "PONG" ? "up" : "down";
    } catch {
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
