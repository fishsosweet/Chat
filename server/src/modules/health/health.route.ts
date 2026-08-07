import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { getHealthStatus } from "./health.controller";

export const healthRouter = Router();

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
healthRouter.get("/health", asyncHandler(getHealthStatus));
