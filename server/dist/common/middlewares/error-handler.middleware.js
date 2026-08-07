"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlerMiddleware = void 0;
const zod_1 = require("zod");
const app_error_1 = require("../errors/app-error");
const logger_1 = require("../../config/logger");
const errorHandlerMiddleware = (error, req, res, _next) => {
    if (error instanceof SyntaxError &&
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 400) {
        res.status(400).json({
            success: false,
            message: "Invalid JSON payload",
            requestId: req.requestId
        });
        return;
    }
    if (error instanceof zod_1.ZodError) {
        res.status(422).json({
            success: false,
            message: "Validation failed",
            details: error.flatten(),
            requestId: req.requestId
        });
        return;
    }
    if (error instanceof app_error_1.AppError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
            details: error.details,
            requestId: req.requestId
        });
        return;
    }
    logger_1.logger.error({ err: error, requestId: req.requestId }, "Unhandled application error");
    res.status(500).json({
        success: false,
        message: "Internal server error",
        requestId: req.requestId
    });
};
exports.errorHandlerMiddleware = errorHandlerMiddleware;
