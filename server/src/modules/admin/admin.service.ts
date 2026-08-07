import bcrypt from "bcryptjs";
import { Prisma, ReportStatus, SessionStatus } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { prisma } from "../../config/prisma";

const paginate = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  take: limit
});

const toSafeNumber = (value: bigint): number => Number(value);

export const getOverview = async () => {
  const [
    totalUsers,
    onlineUsers,
    messageCount,
    callCount,
    groupCount,
    attachmentCount,
    attachmentSize,
    openReportCount,
    activeSessionCount
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isOnline: true } }),
    prisma.message.count(),
    prisma.call.count(),
    prisma.group.count(),
    prisma.attachment.count(),
    prisma.attachment.aggregate({ _sum: { sizeBytes: true } }),
    prisma.report.count({ where: { status: ReportStatus.OPEN } }),
    prisma.session.count({ where: { status: SessionStatus.ACTIVE } })
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

export const getUserList = async (search: string | undefined, page: number, limit: number) => {
  const where: Prisma.UserWhereInput = search
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
    prisma.user.findMany({
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
    prisma.user.count({ where })
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

export const lockUser = async (userId: string, lock: boolean) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      blockedAt: lock ? new Date() : null,
      isOnline: lock ? false : undefined,
      lastSeenAt: lock ? new Date() : undefined
    }
  });

  if (lock) {
    await prisma.session.updateMany({
      where: { userId, status: SessionStatus.ACTIVE },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date()
      }
    });
  }
};

export const deleteUser = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      isOnline: false,
      lastSeenAt: new Date()
    }
  });

  await prisma.session.updateMany({
    where: { userId, status: SessionStatus.ACTIVE },
    data: {
      status: SessionStatus.REVOKED,
      revokedAt: new Date()
    }
  });
};

export const resetUserPassword = async (userId: string, newPassword: string) => {
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });

  await prisma.session.updateMany({
    where: { userId, status: SessionStatus.ACTIVE },
    data: {
      status: SessionStatus.REVOKED,
      revokedAt: new Date()
    }
  });
};

export const getGroupList = async (search: string | undefined, page: number, limit: number) => {
  const where: Prisma.GroupWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { conversation: { title: { contains: search, mode: "insensitive" } } }
        ]
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.group.findMany({
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
    prisma.group.count({ where })
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

export const dissolveGroup = async (groupId: string) => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { conversationId: true }
  });

  if (!group) {
    throw new AppError("Group not found", 404);
  }

  await prisma.conversation.delete({ where: { id: group.conversationId } });
};

export const getFileList = async (search: string | undefined, page: number, limit: number) => {
  const where: Prisma.AttachmentWhereInput = search
    ? {
        OR: [
          { originalName: { contains: search, mode: "insensitive" } },
          { mimeType: { contains: search, mode: "insensitive" } }
        ]
      }
    : {};

  const [items, total, sizeAgg] = await Promise.all([
    prisma.attachment.findMany({
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
    prisma.attachment.count({ where }),
    prisma.attachment.aggregate({ where, _sum: { sizeBytes: true } })
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

export const deleteFile = async (attachmentId: string) => {
  await prisma.attachment.delete({ where: { id: attachmentId } });
};

export const getReportList = async (page: number, limit: number) => {
  const [items, total] = await Promise.all([
    prisma.report.findMany({
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
    prisma.report.count()
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

export const handleReportAction = async (reportId: string, action: "resolve" | "reject" | "lock_user", adminUserId: string) => {
  const report = await prisma.report.findUnique({ where: { id: reportId } });

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  if (action === "lock_user" && report.targetUserId) {
    await lockUser(report.targetUserId, true);
  }

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: action === "reject" ? ReportStatus.REJECTED : ReportStatus.RESOLVED,
      resolvedById: adminUserId,
      resolvedAt: new Date()
    }
  });
};

export const getAuditLogs = async (page: number, limit: number) => {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
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
    prisma.auditLog.count()
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

export const getDailyStats = async (days: number) => {
  const safeDays = Math.max(1, Math.min(days, 90));

  const rows = await prisma.$queryRaw<Array<{ day: Date; users: bigint; messages: bigint; calls: bigint }>>`
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
