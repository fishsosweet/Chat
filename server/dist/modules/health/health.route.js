"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../common/utils/async-handler");
const health_controller_1 = require("./health.controller");
exports.healthRouter = (0, express_1.Router)();
/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Get service and dependency health status
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is degraded or unavailable
 */
exports.healthRouter.get("/health", (0, async_handler_1.asyncHandler)(health_controller_1.getHealthStatus));
