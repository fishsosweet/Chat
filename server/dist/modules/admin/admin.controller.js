"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrendsController = exports.getAuditLogsController = exports.reportActionController = exports.getReportsController = exports.deleteFileController = exports.getFilesController = exports.dissolveGroupController = exports.getGroupsController = exports.resetPasswordController = exports.deleteUserController = exports.lockUserController = exports.getUsersController = exports.getOverviewController = void 0;
const admin_service_1 = require("./admin.service");
const parsePageLimit = (req) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    return {
        page: Number.isNaN(page) ? 1 : page,
        limit: Number.isNaN(limit) ? 20 : limit
    };
};
const getParam = (value) => Array.isArray(value) ? value[0] : (value ?? "");
const getOverviewController = async (req, res) => {
    const data = await (0, admin_service_1.getOverview)();
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.getOverviewController = getOverviewController;
const getUsersController = async (req, res) => {
    const { page, limit } = parsePageLimit(req);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const data = await (0, admin_service_1.getUserList)(search, page, limit);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.getUsersController = getUsersController;
const lockUserController = async (req, res) => {
    await (0, admin_service_1.lockUser)(getParam(req.params.userId), req.body.lock);
    res.status(200).json({ success: true, message: req.body.lock ? "User locked" : "User unlocked", requestId: req.requestId });
};
exports.lockUserController = lockUserController;
const deleteUserController = async (req, res) => {
    await (0, admin_service_1.deleteUser)(getParam(req.params.userId));
    res.status(200).json({ success: true, message: "User deleted", requestId: req.requestId });
};
exports.deleteUserController = deleteUserController;
const resetPasswordController = async (req, res) => {
    await (0, admin_service_1.resetUserPassword)(getParam(req.params.userId), req.body.newPassword);
    res.status(200).json({ success: true, message: "Password reset", requestId: req.requestId });
};
exports.resetPasswordController = resetPasswordController;
const getGroupsController = async (req, res) => {
    const { page, limit } = parsePageLimit(req);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const data = await (0, admin_service_1.getGroupList)(search, page, limit);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.getGroupsController = getGroupsController;
const dissolveGroupController = async (req, res) => {
    await (0, admin_service_1.dissolveGroup)(getParam(req.params.groupId));
    res.status(200).json({ success: true, message: "Group dissolved", requestId: req.requestId });
};
exports.dissolveGroupController = dissolveGroupController;
const getFilesController = async (req, res) => {
    const { page, limit } = parsePageLimit(req);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const data = await (0, admin_service_1.getFileList)(search, page, limit);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.getFilesController = getFilesController;
const deleteFileController = async (req, res) => {
    await (0, admin_service_1.deleteFile)(getParam(req.params.attachmentId));
    res.status(200).json({ success: true, message: "Attachment deleted", requestId: req.requestId });
};
exports.deleteFileController = deleteFileController;
const getReportsController = async (req, res) => {
    const { page, limit } = parsePageLimit(req);
    const data = await (0, admin_service_1.getReportList)(page, limit);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.getReportsController = getReportsController;
const reportActionController = async (req, res) => {
    await (0, admin_service_1.handleReportAction)(getParam(req.params.reportId), req.body.action, req.auth.userId);
    res.status(200).json({ success: true, message: "Report handled", requestId: req.requestId });
};
exports.reportActionController = reportActionController;
const getAuditLogsController = async (req, res) => {
    const { page, limit } = parsePageLimit(req);
    const data = await (0, admin_service_1.getAuditLogs)(page, limit);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.getAuditLogsController = getAuditLogsController;
const getTrendsController = async (req, res) => {
    const days = Number(req.query.days ?? 14);
    const data = await (0, admin_service_1.getDailyStats)(Number.isNaN(days) ? 14 : days);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.getTrendsController = getTrendsController;
