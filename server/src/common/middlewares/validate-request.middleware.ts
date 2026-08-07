import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";
import { AppError } from "../errors/app-error";

export const validateRequest = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
      headers: req.headers
    });

    if (!parsed.success) {
      next(new AppError("Validation failed", 422, parsed.error.flatten()));
      return;
    }

    next();
  };
};
