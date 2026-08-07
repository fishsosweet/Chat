"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callsRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const async_handler_1 = require("../../common/utils/async-handler");
const validate_request_middleware_1 = require("../../common/middlewares/validate-request.middleware");
const calls_schema_1 = require("./calls.schema");
const calls_controller_1 = require("./calls.controller");
exports.callsRouter = (0, express_1.Router)();
/**
 * @openapi
 * /calls/history:
 *   get:
 *     tags: [Call]
 *     summary: Get authenticated user call history
 */
exports.callsRouter.get("/calls/history", auth_middleware_1.authMiddleware, (0, validate_request_middleware_1.validateRequest)(calls_schema_1.callHistoryQuerySchema), (0, async_handler_1.asyncHandler)(calls_controller_1.getCallHistoryController));
