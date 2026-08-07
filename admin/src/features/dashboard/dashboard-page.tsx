import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { apiClient } from "../../lib/api-client";
import { authStore } from "../../store/auth-store";
import type {
  ApiResponse,
  AuditLogItem,
  FileListData,
  GroupItem,
  OverviewData,
  Paginated,
  ReportItem,
  TrendItem,
  UserItem
} from "../../types/api";

type TabKey = "users" | "groups" | "files" | "reports" | "logs";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "users", label: "Users" },
  { key: "groups", label: "Groups" },
  { key: "files", label: "Files" },
  { key: "reports", label: "Reports" },
  { key: "logs", label: "Audit logs" }
];

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
};

const formatBytes = (value: number) => {
  if (value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / Math.pow(1024, index);
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

async function fetchData<T>(path: string): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(path);
  return response.data.data;
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const logout = authStore((state) => state.logout);
  const user = authStore((state) => state.user);
  const [tab, setTab] = useState<TabKey>("users");
  const [search, setSearch] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchData<OverviewData>("/admin/overview")
  });

  const trendQuery = useQuery({
    queryKey: ["trends"],
    queryFn: () => fetchData<TrendItem[]>("/admin/trends?days=14")
  });

  const usersQuery = useQuery({
    queryKey: ["users", search],
    queryFn: () => fetchData<Paginated<UserItem>>(`/admin/users?page=1&limit=8&search=${encodeURIComponent(search)}`)
  });

  const groupsQuery = useQuery({
    queryKey: ["groups", search],
    queryFn: () => fetchData<Paginated<GroupItem>>(`/admin/groups?page=1&limit=8&search=${encodeURIComponent(search)}`)
  });

  const filesQuery = useQuery({
    queryKey: ["files", search],
    queryFn: () => fetchData<FileListData>(`/admin/files?page=1&limit=8&search=${encodeURIComponent(search)}`)
  });

  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: () => fetchData<Paginated<ReportItem>>("/admin/reports?page=1&limit=8")
  });

  const logsQuery = useQuery({
    queryKey: ["logs"],
    queryFn: () => fetchData<Paginated<AuditLogItem>>("/admin/audit-logs?page=1&limit=10")
  });

  const lockMutation = useMutation({
    mutationFn: async ({ userId, lock }: { userId: string; lock: boolean }) => {
      await apiClient.patch(`/admin/users/${userId}/lock`, { lock });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
    }
  });

  const reportMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: string; action: "resolve" | "reject" | "lock_user" }) => {
      await apiClient.post(`/admin/reports/${reportId}/action`, { action });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  const mutationError = useMemo(() => {
    const lockError = lockMutation.error as AxiosError<{ message?: string }> | null;
    const reportError = reportMutation.error as AxiosError<{ message?: string }> | null;

    return lockError?.response?.data?.message ?? reportError?.response?.data?.message ?? null;
  }, [lockMutation.error, reportMutation.error]);

  const cards = overviewQuery.data
    ? [
        { label: "Users", value: overviewQuery.data.totalUsers },
        { label: "Online", value: overviewQuery.data.onlineUsers },
        { label: "Messages", value: overviewQuery.data.messageCount },
        { label: "Calls", value: overviewQuery.data.callCount },
        { label: "Groups", value: overviewQuery.data.groupCount },
        { label: "Reports Open", value: overviewQuery.data.openReportCount },
        { label: "Attachments", value: overviewQuery.data.attachmentCount },
        { label: "Storage", value: formatBytes(overviewQuery.data.totalAttachmentBytes) }
      ]
    : [];

  return (
    <div className="dashboard-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>ChatRealtime Operations</h1>
          <p className="sub">Xin chao {user?.fullName ?? user?.email}. Ban dang quan ly he thong o che do realtime.</p>
        </div>
        <button
          className="ghost"
          onClick={async () => {
            await logout();
          }}
        >
          Dang xuat
        </button>
      </header>

      {overviewQuery.isLoading ? <p>Dang tai tong quan...</p> : null}
      {overviewQuery.data ? (
        <section className="metric-grid">
          {cards.map((card) => (
            <article key={card.label} className="metric-card">
              <p>{card.label}</p>
              <strong>{card.value}</strong>
            </article>
          ))}
        </section>
      ) : null}

      <section className="panel chart-panel">
        <h2>14-day Trend</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendQuery.data ?? []}>
              <CartesianGrid strokeDasharray="2 3" opacity={0.25} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#bc6c25" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="messages" stroke="#588157" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="calls" stroke="#3a5a40" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Moderation Workspace</h2>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users, groups, files"
            aria-label="search"
          />
        </div>

        <nav className="tabs">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={item.key === tab ? "active" : ""}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {mutationError ? <p className="error">{mutationError}</p> : null}

        {tab === "users" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Sessions</th>
                  <th>Messages</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(usersQuery.data?.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.fullName}</td>
                    <td>{item.email}</td>
                    <td>{item.blockedAt ? "Locked" : item.isOnline ? "Online" : "Offline"}</td>
                    <td>{item._count.sessions}</td>
                    <td>{item._count.sentMessages}</td>
                    <td>
                      <button
                        onClick={() => lockMutation.mutate({ userId: item.id, lock: !item.blockedAt })}
                        disabled={lockMutation.isPending}
                      >
                        {item.blockedAt ? "Unlock" : "Lock"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "groups" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Owner</th>
                  <th>Members</th>
                  <th>Messages</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {(groupsQuery.data?.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.owner.fullName}</td>
                    <td>{item.conversation._count.members}</td>
                    <td>{item.conversation.messageCount}</td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "files" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>MIME</th>
                  <th>Uploader</th>
                  <th>Size</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {(filesQuery.data?.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.originalName}</td>
                    <td>{item.mimeType}</td>
                    <td>{item.uploader.fullName}</td>
                    <td>{formatBytes(item.sizeBytes)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="subtle">Current page storage: {formatBytes(filesQuery.data?.totalBytes ?? 0)}</p>
          </div>
        ) : null}

        {tab === "reports" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>Reporter</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(reportsQuery.data?.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.reason}</td>
                    <td>{item.reporter.fullName}</td>
                    <td>{item.targetUser?.fullName ?? "-"}</td>
                    <td>{item.status}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td className="actions">
                      <button onClick={() => reportMutation.mutate({ reportId: item.id, action: "resolve" })}>Resolve</button>
                      <button onClick={() => reportMutation.mutate({ reportId: item.id, action: "reject" })}>Reject</button>
                      <button onClick={() => reportMutation.mutate({ reportId: item.id, action: "lock_user" })}>Lock user</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "logs" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Actor</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {(logsQuery.data?.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.action}</td>
                    <td>{item.entityType}:{item.entityId}</td>
                    <td>{item.actorUser?.fullName ?? "system"}</td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
