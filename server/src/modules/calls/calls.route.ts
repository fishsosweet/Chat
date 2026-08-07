import { Router } from "express";
import { authMiddleware } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { validateRequest } from "../../common/middlewares/validate-request.middleware";
import { callHistoryQuerySchema } from "./calls.schema";
import { getCallHistoryController } from "./calls.controller";

export const callsRouter = Router();

/**
 * @openapi
 * /calls/history:
 *   get:
 *     tags: [Call]
 *     summary: Get authenticated user call history
 */
callsRouter.get(
  "/calls/history",
  authMiddleware,
  validateRequest(callHistoryQuerySchema),
  asyncHandler(getCallHistoryController)
);
