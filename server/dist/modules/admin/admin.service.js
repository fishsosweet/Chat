"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyStats = exports.getAuditLogs = exports.handleReportAction = exports.getReportList = exports.deleteFile = exports.getFileList = exports.dissolveGroup = exports.getGroupList = exports.resetUserPassword = exports.deleteUser = exports.lockUser = exports.getUserList = exports.getOverview = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const app_error_1 = require("../../common/errors/app-error");
const prisma_1 = require("../../config/prisma");
const paginate = (page, limit) => ({
    skip: (page - 1) * limit,
    take: limit
});
const toSafeNumber = (value) => Number(value);
const getOverview = async () => {
    const [totalUsers, onlineUsers, messageCount, callCount, groupCount, attachmentCount, attachmentSize, openReportCount, activeSessionCount] = await Promise.all([
        prisma_1.prisma.user.count({ where: { deletedAt: null } }),
        prisma_1.prisma.user.count({ where: { deletedAt: null, isOnline: true } }),
        prisma_1.prisma.message.count(),
        prisma_1.prisma.call.count(),
        prisma_1.prisma.group.count(),
        prisma_1.prisma.attachment.count(),
        prisma_1.prisma.attachment.aggregate({ _sum: { sizeBytes: true } }),
        prisma_1.prisma.report.count({ where: { status: client_1.ReportStatus.OPEN } }),
        prisma_1.prisma.session.count({ where: { status: client_1.SessionStatus.ACTIVE } })
    ]);
    return {
        totalUsers,
        onlineUsers,
        messageCount,
        callCount,
        groupCount,
        attachmentCount,
        totalAttachmentBytes: toSafeNumber(attachmentSize._sum.sizeBytes ?? BigInt(0)),
        openReportCount,
        activeSessionCount
    };
};
exports.getOverview = getOverview;
const getUserList = async (search, page, limit) => {
    const where = search
        ? {
            deletedAt: null,
            OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } }
            ]
        }
        : { deletedAt: null };
    const [items, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            ...paginate(page, limit),
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                username: true,
                isOnline: true,
                lastSeenAt: true,
                blockedAt: true,
                createdAt: true,
                _count: {
                    select: {
                        sessions: true,
                        sentMessages: true
                    }
                }
            }
        }),
        prisma_1.prisma.user.count({ where })
    ]);
    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};
exports.getUserList = getUserList;
const lockUser = async (userId, lock) => {
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            blockedAt: lock ? new Date() : null,
            isOnline: lock ? false : undefined,
            lastSeenAt: lock ? new Date() : undefined
        }
    });
    if (lock) {
        await prisma_1.prisma.session.updateMany({
            where: { userId, status: client_1.SessionStatus.ACTIVE },
            data: {
                status: client_1.SessionStatus.REVOKED,
                revokedAt: new Date()
            }
        });
    }
};
exports.lockUser = lockUser;
const deleteUser = async (userId) => {
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            deletedAt: new Date(),
            isOnline: false,
            lastSeenAt: new Date()
        }
    });
    await prisma_1.prisma.session.updateMany({
        where: { userId, status: client_1.SessionStatus.ACTIVE },
        data: {
            status: client_1.SessionStatus.REVOKED,
            revokedAt: new Date()
        }
    });
};
exports.deleteUser = deleteUser;
const resetUserPassword = async (userId, newPassword) => {
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
    });
    await prisma_1.prisma.session.updateMany({
        where: { userId, status: client_1.SessionStatus.ACTIVE },
        data: {
            status: client_1.SessionStatus.REVOKED,
            revokedAt: new Date()
        }
    });
};
exports.resetUserPassword = resetUserPassword;
const getGroupList = async (search, page, limit) => {
    const where = search
        ? {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { conversation: { title: { contains: search, mode: "insensitive" } } }
            ]
        }
        : {};
    const [items, total] = await Promise.all([
        prisma_1.prisma.group.findMany({
            where,
            ...paginate(page, limit),
            orderBy: { createdAt: "desc" },
            include: {
                owner: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                conversation: {
                    select: {
                        id: true,
                        title: true,
                        lastMessageAt: true,
                        messageCount: true,
                        _count: {
                            select: { members: true }
                        }
                    }
                }
            }
        }),
        prisma_1.prisma.group.count({ where })
    ]);
    return {
        items: items.map((item) => ({
            ...item,
            conversation: {
                ...item.conversation,
                messageCount: toSafeNumber(item.conversation.messageCount)
            }
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};
exports.getGroupList = getGroupList;
const dissolveGroup = async (groupId) => {
    const group = await prisma_1.prisma.group.findUnique({
        where: { id: groupId },
        select: { conversationId: true }
    });
    if (!group) {
        throw new app_error_1.AppError("Group not found", 404);
    }
    await prisma_1.prisma.conversation.delete({ where: { id: group.conversationId } });
};
exports.dissolveGroup = dissolveGroup;
const getFileList = async (search, page, limit) => {
    const where = search
        ? {
            OR: [
                { originalName: { contains: search, mode: "insensitive" } },
                { mimeType: { contains: search, mode: "insensitive" } }
            ]
        }
        : {};
    const [items, total, sizeAgg] = await Promise.all([
        prisma_1.prisma.attachment.findMany({
            where,
            ...paginate(page, limit),
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                type: true,
                originalName: true,
                mimeType: true,
                extension: true,
                sizeBytes: true,
                storageProvider: true,
                createdAt: true,
                uploader: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                }
            }
        }),
        prisma_1.prisma.attachment.count({ where }),
        prisma_1.prisma.attachment.aggregate({ where, _sum: { sizeBytes: true } })
    ]);
    return {
        items: items.map((item) => ({
            ...item,
            sizeBytes: toSafeNumber(item.sizeBytes)
        })),
        totalBytes: toSafeNumber(sizeAgg._sum.sizeBytes ?? BigInt(0)),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};
exports.getFileList = getFileList;
const deleteFile = async (attachmentId) => {
    await prisma_1.prisma.attachment.delete({ where: { id: attachmentId } });
};
exports.deleteFile = deleteFile;
const getReportList = async (page, limit) => {
    const [items, total] = await Promise.all([
        prisma_1.prisma.report.findMany({
            ...paginate(page, limit),
            orderBy: { createdAt: "desc" },
            include: {
                reporter: {
                    select: { id: true, fullName: true, email: true }
                },
                targetUser: {
                    select: { id: true, fullName: true, email: true }
                },
                resolvedBy: {
                    select: { id: true, fullName: true, email: true }
                }
            }
        }),
        prisma_1.prisma.report.count()
    ]);
    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};
exports.getReportList = getReportList;
const handleReportAction = async (reportId, action, adminUserId) => {
    const report = await prisma_1.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
        throw new app_error_1.AppError("Report not found", 404);
    }
    if (action === "lock_user" && report.targetUserId) {
        await (0, exports.lockUser)(report.targetUserId, true);
    }
    await prisma_1.prisma.report.update({
        where: { id: reportId },
        data: {
            status: action === "reject" ? client_1.ReportStatus.REJECTED : client_1.ReportStatus.RESOLVED,
            resolvedById: adminUserId,
            resolvedAt: new Date()
        }
    });
};
exports.handleReportAction = handleReportAction;
const getAuditLogs = async (page, limit) => {
    const [items, total] = await Promise.all([
        prisma_1.prisma.auditLog.findMany({
            ...paginate(page, limit),
            orderBy: { createdAt: "desc" },
            include: {
                actorUser: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                }
            }
        }),
        prisma_1.prisma.auditLog.count()
    ]);
    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};
exports.getAuditLogs = getAuditLogs;
const getDailyStats = async (days) => {
    const safeDays = Math.max(1, Math.min(days, 90));
    const rows = await prisma_1.prisma.$queryRaw `
    WITH day_series AS (
      SELECT generate_series(
        date_trunc('day', NOW()) - (${safeDays - 1} * interval '1 day'),
        date_trunc('day', NOW()),
        interval '1 day'
      ) AS day
    )
    SELECT
      ds.day AS day,
      COALESCE((SELECT COUNT(*)::bigint FROM "User" u WHERE date_trunc('day', u."createdAt") = ds.day), 0) AS users,
      COALESCE((SELECT COUNT(*)::bigint FROM "Message" m WHERE date_trunc('day', m."createdAt") = ds.day), 0) AS messages,
      COALESCE((SELECT COUNT(*)::bigint FROM "Call" c WHERE date_trunc('day', c."createdAt") = ds.day), 0) AS calls
    FROM day_series ds
    ORDER BY ds.day ASC;
  `;
    return rows.map((row) => ({
        day: row.day.toISOString().slice(0, 10),
        users: toSafeNumber(row.users),
        messages: toSafeNumber(row.messages),
        calls: toSafeNumber(row.calls)
    }));
};
exports.getDailyStats = getDailyStats;
