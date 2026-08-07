import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null
});

redis.on("error", (error) => {
  logger.debug({ error }, "Redis error");
});

export const isRedisEnabled = env.REDIS_ENABLE;
