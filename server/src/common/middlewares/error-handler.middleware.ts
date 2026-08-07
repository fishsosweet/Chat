import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";
import { logger } from "../../config/logger";

export const errorHandlerMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 400
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
      requestId: req.requestId
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      details: error.flatten(),
      requestId: req.requestId
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details,
      requestId: req.requestId
    });
    return;
  }

  logger.error({ err: error, requestId: req.requestId }, "Unhandled application error");

  res.status(500).json({
    success: false,
    message: "Internal server error",
    requestId: req.requestId
  });
};
