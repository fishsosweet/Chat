import { Router } from "express";
import { authMiddleware } from "../../common/middlewares/auth.middleware";
import { env } from "../../config/env";

export const rtcConfigRouter = Router();

/**
 * @openapi
 * /rtc/config:
 *   get:
 *     tags: [Call]
 *     summary: Get ICE server configuration for WebRTC clients
 */
rtcConfigRouter.get("/rtc/config", authMiddleware, (req, res) => {
  const urls = env.RTC_ICE_SERVERS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const hasTurnCredentials = Boolean(env.RTC_TURN_USERNAME && env.RTC_TURN_CREDENTIAL);

  const iceServers = urls.map((url) => {
    if (url.startsWith("turn:") || url.startsWith("turns:")) {
      return {
        urls: url,
        username: hasTurnCredentials ? env.RTC_TURN_USERNAME : undefined,
        credential: hasTurnCredentials ? env.RTC_TURN_CREDENTIAL : undefined
      };
    }

    return { urls: url };
  });

  res.status(200).json({
    success: true,
    data: {
      iceServers,
      hasTurnCredentials
    },
    requestId: req.requestId
  });
});
