"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rtcConfigRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const env_1 = require("../../config/env");
exports.rtcConfigRouter = (0, express_1.Router)();
/**
 * @openapi
 * /rtc/config:
 *   get:
 *     tags: [Call]
 *     summary: Get ICE server configuration for WebRTC clients
 */
exports.rtcConfigRouter.get("/rtc/config", auth_middleware_1.authMiddleware, (req, res) => {
    const urls = env_1.env.RTC_ICE_SERVERS.split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    const hasTurnCredentials = Boolean(env_1.env.RTC_TURN_USERNAME && env_1.env.RTC_TURN_CREDENTIAL);
    const iceServers = urls.map((url) => {
        if (url.startsWith("turn:") || url.startsWith("turns:")) {
            return {
                urls: url,
                username: hasTurnCredentials ? env_1.env.RTC_TURN_USERNAME : undefined,
                credential: hasTurnCredentials ? env_1.env.RTC_TURN_CREDENTIAL : undefined
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
