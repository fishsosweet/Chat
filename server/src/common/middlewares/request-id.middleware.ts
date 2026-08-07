import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = req.headers["x-request-id"]?.toString() ?? randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
};
