import { Request, Response } from "express";
import { AppError } from "../../common/errors/app-error";
import { CallStatus } from "@prisma/client";
import { getMyCallHistory } from "./calls.service";

export const getCallHistoryController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const status = typeof req.query.status === "string" ? (req.query.status as CallStatus) : undefined;

  const data = await getMyCallHistory(
    req.auth.userId,
    Number.isNaN(page) ? 1 : page,
    Number.isNaN(limit) ? 20 : limit,
    status
  );

  res.status(200).json({ success: true, data, requestId: req.requestId });
};
