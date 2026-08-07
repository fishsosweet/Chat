export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  requestId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  username?: string | null;
  isOnline?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  platform: "WEB" | "IOS" | "ANDROID";
  deviceName?: string;
}

export interface LoginData {
  user: AuthUser;
  sessionId: string;
  deviceId: string;
  accessToken: string;
  refreshToken: string;
}

export interface OverviewData {
  totalUsers: number;
  onlineUsers: number;
  messageCount: number;
  callCount: number;
  groupCount: number;
  attachmentCount: number;
  totalAttachmentBytes: number;
  openReportCount: number;
  activeSessionCount: number;
}

export interface TrendItem {
  day: string;
  users: number;
  messages: number;
  calls: number;
}

export interface UserItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  username?: string | null;
  isOnline: boolean;
  lastSeenAt?: string | null;
  blockedAt?: string | null;
  createdAt: string;
  _count: {
    sessions: number;
    sentMessages: number;
  };
}

export interface GroupItem {
  id: string;
  name: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
  };
  conversation: {
    id: string;
    title?: string | null;
    lastMessageAt?: string | null;
    messageCount: number;
    _count: {
      members: number;
    };
  };
  createdAt: string;
}

export interface AttachmentItem {
  id: string;
  type: string;
  originalName: string;
  mimeType: string;
  extension?: string | null;
  sizeBytes: number;
  storageProvider: string;
  uploader: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  reporter: {
    id: string;
    fullName: string;
    email: string;
  };
  targetUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  resolvedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata?: unknown;
  actorUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface FileListData extends Paginated<AttachmentItem> {
  totalBytes: number;
}
