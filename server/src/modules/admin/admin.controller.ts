import { Request, Response } from "express";
import {
  deleteFile,
  deleteUser,
  dissolveGroup,
  getAuditLogs,
  getDailyStats,
  getFileList,
  getGroupList,
  getOverview,
  getReportList,
  getUserList,
  handleReportAction,
  lockUser,
  resetUserPassword
} from "./admin.service";

const parsePageLimit = (req: Request) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  return {
    page: Number.isNaN(page) ? 1 : page,
    limit: Number.isNaN(limit) ? 20 : limit
  };
};

const getParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : (value ?? "");

export const getOverviewController = async (req: Request, res: Response): Promise<void> => {
  const data = await getOverview();
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const getUsersController = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = parsePageLimit(req);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const data = await getUserList(search, page, limit);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const lockUserController = async (req: Request, res: Response): Promise<void> => {
  await lockUser(getParam(req.params.userId), req.body.lock);
  res.status(200).json({ success: true, message: req.body.lock ? "User locked" : "User unlocked", requestId: req.requestId });
};

export const deleteUserController = async (req: Request, res: Response): Promise<void> => {
  await deleteUser(getParam(req.params.userId));
  res.status(200).json({ success: true, message: "User deleted", requestId: req.requestId });
};

export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
  await resetUserPassword(getParam(req.params.userId), req.body.newPassword);
  res.status(200).json({ success: true, message: "Password reset", requestId: req.requestId });
};

export const getGroupsController = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = parsePageLimit(req);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const data = await getGroupList(search, page, limit);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const dissolveGroupController = async (req: Request, res: Response): Promise<void> => {
  await dissolveGroup(getParam(req.params.groupId));
  res.status(200).json({ success: true, message: "Group dissolved", requestId: req.requestId });
};

export const getFilesController = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = parsePageLimit(req);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const data = await getFileList(search, page, limit);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const deleteFileController = async (req: Request, res: Response): Promise<void> => {
  await deleteFile(getParam(req.params.attachmentId));
  res.status(200).json({ success: true, message: "Attachment deleted", requestId: req.requestId });
};

export const getReportsController = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = parsePageLimit(req);
  const data = await getReportList(page, limit);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const reportActionController = async (req: Request, res: Response): Promise<void> => {
  await handleReportAction(getParam(req.params.reportId), req.body.action, req.auth!.userId);
  res.status(200).json({ success: true, message: "Report handled", requestId: req.requestId });
};

export const getAuditLogsController = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = parsePageLimit(req);
  const data = await getAuditLogs(page, limit);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const getTrendsController = async (req: Request, res: Response): Promise<void> => {
  const days = Number(req.query.days ?? 14);
  const data = await getDailyStats(Number.isNaN(days) ? 14 : days);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};
