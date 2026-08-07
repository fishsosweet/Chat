import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Check,
  Download,
  Image,
  MoreHorizontal,
  Phone,
  PhoneOff,
  Search,
  SendHorizonal,
  Smile,
  UserCircle2,
  UserMinus,
  UserPlus,
  Users,
  Video,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/features/shared/theme-toggle";
import { ConversationList } from "@/features/chat/components/conversation-list";
import { authStore } from "@/features/auth/store/auth.store";
import { connectSocket, getSocket } from "@/lib/socket-client";
import { chatApi, type GroupMemberItem } from "@/features/chat/api/chat.api";
import { authApi, type AuthUser } from "@/features/auth/api/auth.api";
import type { ConversationItem } from "@/features/chat/api/chat.api";
import { rtcApi } from "@/features/chat/api/rtc.api";
import {
  friendsApi,
  type FriendListItem,
  type FriendRequestItem,
  type FriendSearchItem
} from "@/features/chat/api/friends.api";
import { stickerPack } from "@/features/chat/components/stickers";

type CallMode = "VOICE" | "VIDEO";

interface IncomingCall {
  conversationId: string;
  fromUserId: string;
  callType: CallMode;
  callId: string;
}

interface LocalMessage {
  id: string;
  clientId?: string;
  content: string;
  fromSelf: boolean;
  createdAt: string;
  type?: string;
  replyToMessageId?: string;
  replyToContent?: string;
  reaction?: string;
  senderAvatarUrl?: string | null;
  senderName?: string;
}

const BUBBLE_PRESETS = [
  { label: "Tím", gradient: "linear-gradient(135deg,#8b5cf6,#4f46e5)" },
  { label: "Xanh", gradient: "linear-gradient(135deg,#38bdf8,#3b82f6)" },
  { label: "Hồng", gradient: "linear-gradient(135deg,#f472b6,#f43f5e)" },
  { label: "Xanh lá", gradient: "linear-gradient(135deg,#34d399,#0d9488)" },
  { label: "Cam", gradient: "linear-gradient(135deg,#fb923c,#f59e0b)" }
];

export function ChatPage() {
  const user = authStore((state) => state.user);
  const tokens = authStore((state) => state.tokens);
  const logout = authStore((state) => state.logout);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversationType, setSelectedConversationType] = useState<"DIRECT" | "GROUP" | null>(null);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string | null>(null);
  const [selectedConversationTitle, setSelectedConversationTitle] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMemberItem[]>([]);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [groupPanelBusy, setGroupPanelBusy] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCallMode, setActiveCallMode] = useState<CallMode | null>(null);
  const [callStatus, setCallStatus] = useState<string>("");
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]);
  const [friendKeyword, setFriendKeyword] = useState("");
  const [searchingFriendUsers, setSearchingFriendUsers] = useState(false);
  const [friendSearchResults, setFriendSearchResults] = useState<FriendSearchItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [friendList, setFriendList] = useState<FriendListItem[]>([]);
  const [friendPanelBusy, setFriendPanelBusy] = useState(false);
  const [friendError, setFriendError] = useState("");
  const [callError, setCallError] = useState("");
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [replyMessage, setReplyMessage] = useState<LocalMessage | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ fullName: user?.fullName ?? "", bio: user?.bio ?? "", avatarUrl: user?.avatarUrl ?? "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<AuthUser | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [bubbleGradient, setBubbleGradient] = useState(BUBBLE_PRESETS[0].gradient);

  const chatImageInputRef = useRef<HTMLInputElement | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const activePeerUserIdRef = useRef<string | null>(null);

  const loadFriendPanelData = async () => {
    const [incoming, outgoing, friends] = await Promise.all([
      friendsApi.getIncomingRequests(),
      friendsApi.getOutgoingRequests(),
      friendsApi.getFriends()
    ]);

    setIncomingRequests(incoming);
    setOutgoingRequests(outgoing);
    setFriendList(friends);
  };

  const searchFriendUsers = async () => {
    const keyword = friendKeyword.trim();
    if (!keyword) {
      setFriendSearchResults([]);
      return;
    }

    try {
      setSearchingFriendUsers(true);
      setFriendError("");
      const data = await friendsApi.searchUsers(keyword);
      setFriendSearchResults(data);
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Cannot search users");
    } finally {
      setSearchingFriendUsers(false);
    }
  };

  const openDirectConversation = async (targetUserId: string, title: string) => {
    try {
      setFriendPanelBusy(true);
      setFriendError("");
      const conversation = await chatApi.createDirectConversation(targetUserId);
      setSelectedConversationId(conversation.id);
      setSelectedConversationType("DIRECT");
      setSelectedTargetUserId(targetUserId);
      setSelectedConversationTitle(title);
      setGroupMembers([]);
      setShowGroupPanel(false);
      setMessages([]);
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Cannot open conversation");
    } finally {
      setFriendPanelBusy(false);
    }
  };

  const loadGroupMembers = async (conversationId: string) => {
    try {
      const members = await chatApi.getGroupMembers(conversationId);
      setGroupMembers(members);
    } catch {
      setGroupMembers([]);
    }
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      setFriendError("Vui lòng nhập tên nhóm");
      return;
    }

    try {
      setGroupPanelBusy(true);
      setFriendError("");
      const group = await chatApi.createGroup(name, selectedGroupMemberIds);
      setSelectedConversationId(group.id);
      setSelectedConversationType("GROUP");
      setSelectedTargetUserId(null);
      setSelectedConversationTitle(group.title);
      setGroupName("");
      setSelectedGroupMemberIds([]);
      setShowCreateGroup(false);
      setShowGroupPanel(true);
      setMessages([]);
      await loadGroupMembers(group.id);
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Không thể tạo nhóm");
    } finally {
      setGroupPanelBusy(false);
    }
  };

  const handleAddGroupMember = async (memberUserId: string) => {
    if (!selectedConversationId) {
      return;
    }

    try {
      setGroupPanelBusy(true);
      setFriendError("");
      const result = await chatApi.addGroupMembers(selectedConversationId, [memberUserId]);
      setGroupMembers(result.members);
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Không thể thêm thành viên");
    } finally {
      setGroupPanelBusy(false);
    }
  };

  const handleRemoveGroupMember = async (memberUserId: string) => {
    if (!selectedConversationId) {
      return;
    }

    try {
      setGroupPanelBusy(true);
      setFriendError("");
      const result = await chatApi.removeGroupMember(selectedConversationId, memberUserId);

      if (result.action === "left" && memberUserId === user?.id) {
        setSelectedConversationId(null);
        setSelectedConversationType(null);
        setSelectedConversationTitle(null);
        setGroupMembers([]);
        setShowGroupPanel(false);
        setMessages([]);
        return;
      }

      setGroupMembers(result.members);
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Không thể loại thành viên");
    } finally {
      setGroupPanelBusy(false);
    }
  };

  const toggleGroupMemberSelection = (memberUserId: string) => {
    setSelectedGroupMemberIds((current) =>
      current.includes(memberUserId) ? current.filter((id) => id !== memberUserId) : [...current, memberUserId]
    );
  };

  const currentUserGroupRole = groupMembers.find((member) => member.userId === user?.id)?.role;
  const canManageGroupMembers = currentUserGroupRole === "OWNER" || currentUserGroupRole === "ADMIN";

  const executeFriendAction = async (work: () => Promise<void>) => {
    try {
      setFriendPanelBusy(true);
      setFriendError("");
      await work();
      await loadFriendPanelData();
      await searchFriendUsers();
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Friend action failed");
    } finally {
      setFriendPanelBusy(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await friendsApi.removeFriend(friendId);
      await loadFriendPanelData();
      if (selectedConversationId) {
        setSelectedConversationId(null);
        setSelectedTargetUserId(null);
        setSelectedConversationTitle(null);
      }
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Cannot remove friend");
    }
  };

  const releaseMedia = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  const resetCallState = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingOfferRef.current = null;
    activeCallIdRef.current = null;
    activePeerUserIdRef.current = null;
    setIncomingCall(null);
    setActiveCallMode(null);
    setCallStatus("");
    releaseMedia();
  };

  const createPeerConnection = (): RTCPeerConnection => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const connection = new RTCPeerConnection({ iceServers });

    connection.onicecandidate = (event) => {
      if (!event.candidate || !selectedConversationId) {
        return;
      }

      const socket = getSocket();
      socket?.emit("ice_candidate", {
        conversationId: selectedConversationId,
        targetUserId: activePeerUserIdRef.current ?? undefined,
        callId: activeCallIdRef.current ?? undefined,
        data: {
          candidate: event.candidate.toJSON()
        }
      });
    };

    connection.ontrack = (event) => {
      const remoteStream = event.streams[0] ?? new MediaStream([event.track]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    };

    peerConnectionRef.current = connection;
    return connection;
  };

  useEffect(() => {
    let cancelled = false;

    const warmupRtcConfig = async () => {
      try {
        const config = await rtcApi.getConfig();

        if (cancelled || !config.iceServers.length) {
          return;
        }

        setIceServers(config.iceServers as RTCIceServer[]);
      } catch {
        // Fall back to bundled STUN servers if API unavailable.
      }
    };

    void warmupRtcConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setProfileDraft({
      fullName: user?.fullName ?? "",
      bio: user?.bio ?? "",
      avatarUrl: user?.avatarUrl ?? ""
    });
  }, [user?.fullName, user?.bio, user?.avatarUrl]);

  useEffect(() => {
    if (!tokens?.accessToken) {
      return;
    }

    let cancelled = false;

    const bootstrapFriends = async () => {
      try {
        await loadFriendPanelData();
      } catch (error) {
        if (!cancelled) {
          setFriendError(error instanceof Error ? error.message : "Cannot load friends");
        }
      }
    };

    void bootstrapFriends();

    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  const startCall = async (mode: CallMode) => {
    if (!selectedConversationId || !selectedTargetUserId) {
      return;
    }

    try {
      setCallError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "VIDEO"
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const connection = createPeerConnection();
      stream.getTracks().forEach((track) => {
        connection.addTrack(track, stream);
      });

      const callId = crypto.randomUUID();
      activeCallIdRef.current = callId;
      activePeerUserIdRef.current = selectedTargetUserId;
      setActiveCallMode(mode);
      setCallStatus(mode === "VIDEO" ? "Dang goi video..." : "Dang goi voice...");

      const socket = getSocket();
      socket?.emit("call", {
        conversationId: selectedConversationId,
        targetUserId: selectedTargetUserId,
        callType: mode,
        callId
      });

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      socket?.emit("offer", {
        conversationId: selectedConversationId,
        targetUserId: selectedTargetUserId,
        callType: mode,
        callId,
        data: {
          sdp: {
            type: offer.type,
            sdp: offer.sdp ?? ""
          }
        }
      });
    } catch (error) {
      resetCallState();
      setCallError(error instanceof Error ? error.message : "Cannot start call");
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall || !selectedConversationId) {
      return;
    }

    try {
      setCallError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === "VIDEO"
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      activeCallIdRef.current = incomingCall.callId;
      activePeerUserIdRef.current = incomingCall.fromUserId;
      setActiveCallMode(incomingCall.callType);
      setCallStatus("Dang ket noi...");

      const connection = createPeerConnection();
      stream.getTracks().forEach((track) => {
        connection.addTrack(track, stream);
      });

      if (pendingOfferRef.current) {
        await connection.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        const socket = getSocket();
        socket?.emit("answer", {
          conversationId: selectedConversationId,
          targetUserId: incomingCall.fromUserId,
          callType: incomingCall.callType,
          callId: incomingCall.callId,
          data: {
            sdp: {
              type: answer.type,
              sdp: answer.sdp ?? ""
            }
          }
        });
        pendingOfferRef.current = null;
      }

      setIncomingCall(null);
    } catch (error) {
      resetCallState();
      setCallError(error instanceof Error ? error.message : "Cannot accept call");
    }
  };

  const rejectIncomingCall = () => {
    if (!incomingCall) {
      return;
    }

    const socket = getSocket();
    socket?.emit("reject", {
      conversationId: incomingCall.conversationId,
      targetUserId: incomingCall.fromUserId,
      callId: incomingCall.callId,
      data: { reason: "declined" }
    });
    setIncomingCall(null);
  };

  const endCall = () => {
    const socket = getSocket();
    if (selectedConversationId && activePeerUserIdRef.current) {
      socket?.emit("end", {
        conversationId: selectedConversationId,
        targetUserId: activePeerUserIdRef.current,
        callId: activeCallIdRef.current ?? undefined,
        data: { reason: "ended" }
      });
    }
    resetCallState();
  };

  useEffect(() => {
    if (!tokens?.accessToken) {
      return;
    }

    const socket = connectSocket(tokens.accessToken);

    const handleReceive = (payload: {
      conversationId: string;
      message: {
        id: string;
        content: string | null;
        senderId: string;
        createdAt: string;
        type?: string;
        clientMessageId?: string;
        replyToMessageId?: string | null;
        sender?: { id: string; fullName: string; avatarUrl: string | null };
      };
    }) => {
      if (payload.conversationId !== selectedConversationId) {
        return;
      }

      setMessages((current) => {
        const filtered = current.filter((item) => {
          if (item.id === payload.message.id) {
            return false;
          }
          if (payload.message.clientMessageId && item.clientId === payload.message.clientMessageId) {
            return false;
          }
          if (item.id === `optimistic:${payload.message.id}`) {
            return false;
          }
          return true;
        });

        const replyParent = payload.message.replyToMessageId
          ? current.find((m) => m.id === payload.message.replyToMessageId)
          : undefined;

        return [
          ...filtered,
          {
            id: payload.message.id,
            clientId: payload.message.clientMessageId,
            content: payload.message.content ?? "",
            fromSelf: payload.message.senderId === user?.id,
            createdAt: payload.message.createdAt,
            type: payload.message.type,
            replyToMessageId: payload.message.replyToMessageId ?? undefined,
            replyToContent: replyParent?.content,
            senderAvatarUrl: payload.message.sender?.avatarUrl,
            senderName: payload.message.sender?.fullName
          }
        ];
      });
    };

    const onFriendshipChanged = () => {
      void loadFriendPanelData();
    };

    const onGroupMemberChanged = (payload: {
      conversationId: string;
      action: "added" | "removed" | "left";
      targetUserIds: string[];
      members?: GroupMemberItem[];
    }) => {
      if (payload.conversationId !== selectedConversationId) {
        return;
      }

      if (payload.members?.length) {
        setGroupMembers(payload.members);
        return;
      }

      void loadGroupMembers(payload.conversationId);

      if (payload.action !== "added" && payload.targetUserIds.includes(user?.id ?? "")) {
        setSelectedConversationId(null);
        setSelectedConversationType(null);
        setSelectedConversationTitle(null);
        setGroupMembers([]);
        setShowGroupPanel(false);
        setMessages([]);
      }
    };

    socket.on("receive_message", handleReceive);
    socket.on("group_member_changed", onGroupMemberChanged);

    const onCall = (payload: {
      conversationId: string;
      fromUserId: string;
      callType?: CallMode;
      callId?: string;
    }) => {
      if (payload.fromUserId === user?.id) {
        return;
      }
      setSelectedConversationId(payload.conversationId);
      setSelectedTargetUserId(payload.fromUserId);
      setSelectedConversationTitle(
        friendList.find((item) => item.user.id === payload.fromUserId)?.user.fullName ??
          `User ${payload.fromUserId.slice(0, 8)}`
      );
      setIncomingCall({
        conversationId: payload.conversationId,
        fromUserId: payload.fromUserId,
        callType: payload.callType ?? "VOICE",
        callId: payload.callId ?? crypto.randomUUID()
      });
      setCallStatus("Cuoc goi den...");
    };

    const onOffer = async (payload: {
      conversationId: string;
      fromUserId: string;
      callId?: string;
      data?: { sdp?: RTCSessionDescriptionInit };
      callType?: CallMode;
    }) => {
      if (payload.fromUserId === user?.id || !payload.data?.sdp) {
        return;
      }

      pendingOfferRef.current = payload.data.sdp;

      if (peerConnectionRef.current && localStreamRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        getSocket()?.emit("answer", {
          conversationId: payload.conversationId,
          targetUserId: payload.fromUserId,
          callType: payload.callType ?? "VOICE",
          callId: payload.callId,
          data: {
            sdp: {
              type: answer.type,
              sdp: answer.sdp ?? ""
            }
          }
        });
      }
    };

    const onAnswer = async (payload: { fromUserId: string; data?: { sdp?: RTCSessionDescriptionInit } }) => {
      if (payload.fromUserId === user?.id || !payload.data?.sdp || !peerConnectionRef.current) {
        return;
      }
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));
      setCallStatus("Da ket noi");
    };

    const onIceCandidate = async (payload: {
      fromUserId: string;
      data?: { candidate?: RTCIceCandidateInit };
    }) => {
      if (payload.fromUserId === user?.id || !payload.data?.candidate || !peerConnectionRef.current) {
        return;
      }
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.data.candidate));
    };

    const onCallEnded = (payload: { fromUserId: string }) => {
      if (payload.fromUserId === user?.id) {
        return;
      }
      resetCallState();
      setCallStatus("Cuoc goi da ket thuc");
    };

    const onSocketError = (payload: { message?: string }) => {
      const message = payload?.message ?? "Socket error";
      setCallError(message);
      setCallStatus(message);
    };

    socket.on("call", onCall);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice_candidate", onIceCandidate);
    socket.on("reject", onCallEnded);
    socket.on("end", onCallEnded);
    socket.on("friendship_changed", onFriendshipChanged);
    socket.on("socket_error", onSocketError);

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("call", onCall);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice_candidate", onIceCandidate);
      socket.off("reject", onCallEnded);
      socket.off("end", onCallEnded);
      socket.off("friendship_changed", onFriendshipChanged);
      socket.off("group_member_changed", onGroupMemberChanged);
      socket.off("socket_error", onSocketError);
    };
  }, [selectedConversationId, tokens?.accessToken, user?.id]);

  useEffect(() => {
    if (!selectedConversationId || selectedConversationType !== "GROUP") {
      setGroupMembers([]);
      return;
    }

    void loadGroupMembers(selectedConversationId);
  }, [selectedConversationId, selectedConversationType]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const page = await chatApi.getConversationMessages(selectedConversationId);

        if (cancelled) {
          return;
        }

        const items = page.items.map((item) => ({
          id: item.id,
          content: item.content ?? "",
          fromSelf: item.senderId === user?.id,
          createdAt: item.createdAt,
          type: item.type,
          replyToMessageId: item.replyToMessageId ?? undefined,
          replyToContent: undefined as string | undefined,
          senderAvatarUrl: item.sender?.avatarUrl,
          senderName: item.sender?.fullName
        }));

        // Populate reply quotes from the same page
        const byId = new Map(items.map((m) => [m.id, m]));
        for (const m of items) {
          if (m.replyToMessageId) {
            m.replyToContent = byId.get(m.replyToMessageId)?.content;
          }
        }

        if (!cancelled) {
          setMessages(items);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId, user?.id]);

  const orderedMessages = useMemo(() => messages.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [messages]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    scrollToLatestMessage();
  }, [selectedConversationId, orderedMessages.length]);

  const sendMessage = () => {
    if (!selectedConversationId || !draftMessage.trim() || isSendingMessage) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    const messageContent = draftMessage.trim();
    const clientMessageId = `client_${Date.now()}`;
    setIsSendingMessage(true);
    setDraftMessage("");

    setMessages((current) => [
      ...current,
      {
        id: `optimistic:${clientMessageId}`,
        clientId: clientMessageId,
        content: messageContent,
        fromSelf: true,
        createdAt: new Date().toISOString(),
        type: "TEXT",
        replyToMessageId: replyMessage?.id,
        replyToContent: replyMessage?.content
      }
    ]);

    socket.emit("send_message", {
      conversationId: selectedConversationId,
      content: messageContent,
      type: "TEXT",
      clientMessageId,
      replyToMessageId: replyMessage?.id
    });
    setReplyMessage(null);

    window.setTimeout(() => {
      setIsSendingMessage(false);
      scrollToLatestMessage();
    }, 600);
  };

  const compressImage = (file: File, maxPx: number, quality: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width >= height) {
            height = Math.round((height * maxPx) / width);
            width = maxPx;
          } else {
            width = Math.round((width * maxPx) / height);
            height = maxPx;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No 2d context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Image load error"));
      img.src = objectUrl;
    });

  const saveProfile = async () => {
    try {
      setIsSavingProfile(true);
      const payload: { fullName?: string; bio?: string; avatarUrl?: string } = {};
      const nextFullName = profileDraft.fullName.trim();
      const nextBio = profileDraft.bio.trim();
      const nextAvatarUrl = profileDraft.avatarUrl.trim();

      if (nextFullName) {
        payload.fullName = nextFullName;
      }
      if (nextBio) {
        payload.bio = nextBio;
      }
      if (nextAvatarUrl) {
        payload.avatarUrl = nextAvatarUrl;
      }

      const updated = await authApi.updateProfile(payload);
      authStore.setState({ user: updated });
      setShowProfilePanel(false);
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Cannot update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleProfileImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      // Compress to 64px to fit VARCHAR(2048) in DB
      const dataUrl = await compressImage(file, 64, 0.65);
      setProfileDraft((current) => ({ ...current, avatarUrl: dataUrl }));
      const updated = await authApi.updateProfile({ avatarUrl: dataUrl });
      authStore.setState({ user: updated });
      setFriendError("");
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Cannot upload avatar");
    } finally {
      event.target.value = "";
    }
  };

  const handleChatImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversationId) {
      return;
    }

    try {
      setIsSendingMessage(true);
      const dataUrl = await compressImage(file, 800, 0.72);
      const clientMessageId = `client_${Date.now()}`;
      const socket = getSocket();
      if (!socket) {
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: `optimistic:${clientMessageId}`,
          clientId: clientMessageId,
          content: dataUrl,
          fromSelf: true,
          createdAt: new Date().toISOString(),
          type: "IMAGE",
          replyToMessageId: replyMessage?.id,
          replyToContent: replyMessage?.content
        }
      ]);

      socket.emit("send_message", {
        conversationId: selectedConversationId,
        content: dataUrl,
        type: "IMAGE",
        clientMessageId,
        replyToMessageId: replyMessage?.id
      });
      setReplyMessage(null);
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Cannot send image");
    } finally {
      event.target.value = "";
      window.setTimeout(() => setIsSendingMessage(false), 600);
    }
  };

  const scrollToLatestMessage = () => {
    window.requestAnimationFrame(() => {
      messagesContainerRef.current?.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    });
  };

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.transition = "outline 0.2s";
    el.style.outline = "2px solid #8b5cf6";
    el.style.borderRadius = "1rem";
    window.setTimeout(() => {
      el.style.outline = "none";
    }, 1400);
  };

  const sendReaction = (messageId: string, reaction: string) => {
    // Local-only optimistic reaction – no new message bubble
    setMessages((current) =>
      current.map((item) => (item.id === messageId ? { ...item, reaction } : item))
    );
    setReactingMessageId(null);
  };

  const openProfilePanel = async () => {
    setShowProfilePanel(true);

    if (!selectedTargetUserId) {
      setViewedProfile(null);
      return;
    }

    try {
      setIsLoadingProfile(true);
      const profile = await authApi.getUserProfile(selectedTargetUserId);
      setViewedProfile(profile);
    } catch (error) {
      setViewedProfile(null);
      setFriendError(error instanceof Error ? error.message : "Cannot load profile");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const sendSticker = (emoji: string) => {
    if (!selectedConversationId || isSendingMessage) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    const clientMessageId = `client_${Date.now()}`;
    setIsSendingMessage(true);
    setShowStickerPicker(false);

    setMessages((current) => [
      ...current,
      {
        id: `optimistic:${clientMessageId}`,
        clientId: clientMessageId,
        content: emoji,
        fromSelf: true,
        createdAt: new Date().toISOString(),
        type: "STICKER"
      }
    ]);

    socket.emit("send_message", {
      conversationId: selectedConversationId,
      content: emoji,
      type: "STICKER",
      clientMessageId,
      replyToMessageId: replyMessage?.id
    });
    setReplyMessage(null);

    window.setTimeout(() => setIsSendingMessage(false), 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 p-3 md:p-5">
      <div className="mx-auto grid h-[calc(100vh-1.5rem)] max-w-[1500px] grid-cols-1 gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="flex h-full flex-col overflow-hidden border border-violet-200 bg-white/80 shadow-[0_8px_32px_-8px_rgba(109,40,217,0.18)] backdrop-blur-sm">
          <header className="flex items-center justify-between border-b border-violet-200 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedTargetUserId(null);
                  setShowProfilePanel(true);
                }}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/20 text-sm font-semibold text-white"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="user avatar" className="h-full w-full object-cover" />
                ) : (
                  (user?.fullName?.slice(0, 1).toUpperCase() ?? "U")
                )}
              </button>
              <div>
                <p className="text-sm text-sky-100">Welcome back</p>
                <h2 className="text-lg font-semibold">{user?.fullName ?? "User"}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => void logout()}>
                Logout
              </Button>
            </div>
          </header>

          <div className="space-y-3 border-b border-violet-100 bg-violet-50/70 p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Tìm người dùng theo tên/email"
                value={friendKeyword}
                onChange={(event) => setFriendKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchFriendUsers();
                  }
                }}
                className="border-violet-200 bg-white text-slate-800 placeholder-slate-400 focus:border-violet-400"
              />
              <Button size="sm" variant="outline" onClick={() => void searchFriendUsers()} disabled={searchingFriendUsers} className="border-violet-300 text-violet-600 hover:bg-violet-50">
                <Search size={14} className="mr-1" /> Tìm
              </Button>
            </div>

            {friendError ? <p className="text-xs text-rose-500">{friendError}</p> : null}

            {friendSearchResults.length ? (
              <div className="max-h-36 space-y-2 overflow-auto rounded-xl border border-violet-100 bg-white p-2 shadow-sm">
                {friendSearchResults.map((item) => {
                  const relation = item.friendship;
                  const relationIsIncomingPending = relation?.status === "PENDING" && relation.direction === "incoming";
                  const relationIsOutgoingPending = relation?.status === "PENDING" && relation.direction === "outgoing";
                  const relationIsAccepted = relation?.status === "ACCEPTED";

                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 bg-violet-50/60 px-2 py-1">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{item.fullName}</p>
                        <p className="truncate text-[11px] text-slate-500">{item.email}</p>
                      </div>

                      {relationIsAccepted ? (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={friendPanelBusy}
                          onClick={() => void openDirectConversation(item.id, item.fullName)}
                        >
                          Chat
                        </Button>
                      ) : null}

                      {relationIsIncomingPending ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            disabled={friendPanelBusy || !relation?.friendId}
                            onClick={() =>
                              void executeFriendAction(async () => {
                                if (relation?.friendId) {
                                  await friendsApi.acceptRequest(relation.friendId);
                                }
                              })
                            }
                          >
                            <Check size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            disabled={friendPanelBusy || !relation?.friendId}
                            onClick={() =>
                              void executeFriendAction(async () => {
                                if (relation?.friendId) {
                                  await friendsApi.rejectRequest(relation.friendId);
                                }
                              })
                            }
                          >
                            <X size={13} />
                          </Button>
                        </div>
                      ) : null}

                      {relationIsOutgoingPending ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={friendPanelBusy || !relation?.friendId}
                          onClick={() =>
                            void executeFriendAction(async () => {
                              if (relation?.friendId) {
                                await friendsApi.cancelRequest(relation.friendId);
                              }
                            })
                          }
                        >
                          Cancel
                        </Button>
                      ) : null}

                      {!relation ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={friendPanelBusy}
                          onClick={() =>
                            void executeFriendAction(async () => {
                              await friendsApi.sendRequest(item.id);
                            })
                          }
                        >
                          <UserPlus size={13} className="mr-1" /> Add
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-2">
                <p className="mb-1 text-[11px] font-semibold text-indigo-500">Yêu cầu ({incomingRequests.length})</p>
                <div className="max-h-24 space-y-1 overflow-auto">
                  {incomingRequests.length === 0 ? (
                    <p className="text-[11px] text-slate-400">Không có</p>
                  ) : (
                    incomingRequests.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-1 text-[11px] text-slate-700">
                        <span className="truncate">{item.requester?.fullName ?? "Unknown"}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 border-indigo-300 px-2 text-indigo-600 hover:bg-indigo-50"
                          disabled={friendPanelBusy}
                          onClick={() =>
                            void executeFriendAction(async () => {
                              await friendsApi.acceptRequest(item.id);
                            })
                          }
                        >
                          Ok
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-2">
                <p className="mb-1 text-[11px] font-semibold text-violet-500">Bạn bè ({friendList.length})</p>
                <div className="max-h-24 space-y-1 overflow-auto">
                  {friendList.length === 0 ? (
                    <p className="text-[11px] text-slate-400">Chưa có bạn bè</p>
                  ) : (
                    friendList.map((item) => (
                      <div key={item.friendId} className="flex items-center justify-between gap-1 text-[11px] text-slate-700">
                        <span className="truncate">{item.user.fullName}</span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" className="h-6 bg-violet-500 px-2 hover:bg-violet-600" disabled={friendPanelBusy} onClick={() => void openDirectConversation(item.user.id, item.user.fullName)}>
                            Chat
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 border-rose-200 px-2 text-rose-500 hover:bg-rose-50" disabled={friendPanelBusy} onClick={() => void handleRemoveFriend(item.friendId)}>
                            <UserMinus size={12} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">Đang chờ xác nhận: {outgoingRequests.length}</p>
          </div>

          <div className="min-h-0 flex-1">
            <ConversationList
              selectedConversationId={selectedConversationId}
              onSelect={(conversation: ConversationItem) => {
                setSelectedConversationId(conversation.id);
                setSelectedConversationType(conversation.type);
                setSelectedTargetUserId(conversation.counterpartUserId ?? null);
                setSelectedConversationTitle(conversation.title);
                setShowGroupPanel(conversation.type === "GROUP");
              }}
            />
          </div>
        </Card>

        <Card className="flex h-full flex-col overflow-hidden border border-indigo-200 bg-white/80 shadow-[0_8px_32px_-8px_rgba(99,102,241,0.18)] backdrop-blur-sm">
          <header className="border-b border-indigo-100 bg-white/95 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-sm font-semibold text-white shadow">
                  {selectedConversationTitle ? selectedConversationTitle.slice(0, 1).toUpperCase() : "✉"}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {selectedConversationId ? selectedConversationTitle ?? `Conversation ${selectedConversationId.slice(0, 8)}` : "Chọn cuộc trò chuyện"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedConversationType === "GROUP"
                      ? `${groupMembers.length || "..."} thành viên`
                      : selectedTargetUserId
                        ? "Đang online"
                        : "Chọn bạn bè để chat"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversationType === "GROUP" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGroupPanel((value) => !value)}
                    className="border-violet-200 text-violet-600 hover:bg-violet-50"
                  >
                    <Users size={14} className="mr-1" /> Thành viên
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => void openProfilePanel()} disabled={selectedConversationType === "GROUP"} className="border-violet-200 text-violet-600 hover:bg-violet-50">
                  <UserCircle2 size={14} className="mr-1" /> Trang cá nhân
                </Button>
                <Button variant="outline" size="sm" onClick={() => void startCall("VOICE")} disabled={!selectedConversationId || selectedConversationType === "GROUP" || !selectedTargetUserId || !!activeCallMode} className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                  <Phone size={14} className="mr-1" /> Gọi
                </Button>
                <Button variant="outline" size="sm" onClick={() => void startCall("VIDEO")} disabled={!selectedConversationId || selectedConversationType === "GROUP" || !selectedTargetUserId || !!activeCallMode} className="border-sky-200 text-sky-600 hover:bg-sky-50">
                  <Video size={14} className="mr-1" /> Video
                </Button>
                {activeCallMode ? (
                  <Button variant="destructive" size="sm" onClick={endCall}>
                    <PhoneOff size={14} className="mr-1" /> Kết thúc
                  </Button>
                ) : null}
                <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                  {BUBBLE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      title={preset.label}
                      className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-125"
                      style={{
                        background: preset.gradient,
                        borderColor: bubbleGradient === preset.gradient ? "#1e1b4b" : "transparent"
                      }}
                      onClick={() => setBubbleGradient(preset.gradient)}
                    />
                  ))}
                </div>
              </div>
            </div>
            {callStatus ? <p className="mt-2 text-xs text-slate-500">{callStatus}</p> : null}
            {callError ? <p className="mt-1 text-xs text-rose-500">{callError}</p> : null}
          </header>

          {incomingCall ? (
            <div className="flex items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-2">
              <p className="text-sm text-emerald-700">
                Cuộc gọi {incomingCall.callType === "VIDEO" ? "video" : "voice"} từ {incomingCall.fromUserId.slice(0, 8)}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => void acceptIncomingCall()}>
                  Nhận
                </Button>
                <Button variant="destructive" size="sm" onClick={rejectIncomingCall}>
                  Từ chối
                </Button>
              </div>
            </div>
          ) : null}

          {activeCallMode ? (
            <div className="grid gap-2 border-b border-slate-200 bg-slate-100 p-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <p className="mb-1 text-xs text-slate-500">Bạn</p>
                <video ref={localVideoRef} autoPlay muted playsInline className="h-32 w-full rounded bg-slate-100 object-cover" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <p className="mb-1 text-xs text-slate-500">Bạn bè</p>
                <video ref={remoteVideoRef} autoPlay playsInline className="h-32 w-full rounded bg-slate-100 object-cover" />
                <audio ref={remoteAudioRef} autoPlay />
              </div>
            </div>
          ) : null}

          {showProfilePanel ? (
            <div className="border-b border-indigo-100 bg-indigo-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedTargetUserId ? "Trang cá nhân bạn bè" : "Trang cá nhân"}</p>
                  <p className="text-xs text-slate-500">{selectedTargetUserId ? "Xem thông tin liên hệ" : "Cập nhật ảnh đại diện, tên, giới thiệu"}</p>
                </div>
                <Button variant="outline" size="sm" className="border-indigo-200 text-slate-600" onClick={() => setShowProfilePanel(false)}>
                  <MoreHorizontal size={14} />
                </Button>
              </div>

              {selectedTargetUserId ? (
                <div className="mt-3 rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm">
                  {isLoadingProfile ? (
                    <p className="text-sm text-slate-500">Đang tải...</p>
                  ) : viewedProfile ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-lg font-semibold text-white shadow">
                          {viewedProfile.fullName?.slice(0, 1).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{viewedProfile.fullName}</p>
                          <p className="text-sm text-slate-500">{viewedProfile.bio || "Chưa có giới thiệu"}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">{viewedProfile.email}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Không thể tải thông tin.</p>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-lg font-semibold text-white ring-2 ring-violet-200"
                    >
                      {profileDraft.avatarUrl ? (
                        <img src={profileDraft.avatarUrl} alt="avatar preview" className="h-full w-full object-cover" />
                      ) : (
                        profileDraft.fullName?.slice(0, 1).toUpperCase() || "U"
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <Input
                        value={profileDraft.avatarUrl}
                        onChange={(event) => setProfileDraft((current) => ({ ...current, avatarUrl: event.target.value }))}
                        placeholder="URL ảnh đại diện"
                        className="border-indigo-200 bg-white text-slate-800 placeholder-slate-400 focus:border-indigo-400"
                      />
                      <input ref={profileImageInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void handleProfileImageSelect(event)} />
                    </div>
                  </div>
                  <Input
                    value={profileDraft.fullName}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Tên hiển thị"
                    className="border-indigo-200 bg-white text-slate-800 placeholder-slate-400 focus:border-indigo-400"
                  />
                  <Input
                    value={profileDraft.bio}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}
                    placeholder="Giới thiệu bản thân"
                    className="border-indigo-200 bg-white text-slate-800 placeholder-slate-400 focus:border-indigo-400"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" className="border-slate-200 text-slate-600" onClick={() => setShowProfilePanel(false)}>
                      Hủy
                    </Button>
                    <Button type="button" size="sm" className="bg-violet-500 hover:bg-violet-600" onClick={() => void saveProfile()} disabled={isSavingProfile}>
                      {isSavingProfile ? "Đang lưu..." : "Lưu"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-auto bg-gradient-to-b from-slate-50 to-indigo-50/60 p-4">
            {orderedMessages.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có tin nhắn.</p>
            ) : (
              orderedMessages.map((message) => (
                <div
                  key={message.id}
                  id={`msg-${message.id}`}
                  className={`flex items-end gap-2 ${message.fromSelf ? "flex-row-reverse" : ""}`}
                >
                  {!message.fromSelf ? (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-xs font-semibold text-white shadow-sm">
                      {message.senderAvatarUrl ? (
                        <img src={message.senderAvatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        message.senderName?.slice(0, 1).toUpperCase() ?? "?"
                      )}
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm transition-colors ${
                      message.fromSelf
                        ? "text-white shadow-md"
                        : "border border-slate-100 bg-white text-slate-800 shadow-sm"
                    }`}
                    style={message.fromSelf ? { background: bubbleGradient } : undefined}
                  >
                    {message.replyToContent ? (
                      <button
                        type="button"
                        className="mb-2 block w-full rounded-lg border-l-2 border-current bg-black/10 px-2 py-1 text-left text-xs opacity-75 hover:opacity-100"
                        onClick={() => message.replyToMessageId && scrollToMessage(message.replyToMessageId)}
                      >
                        {message.replyToContent.startsWith("data:image") ? "[Ảnh]" : message.replyToContent}
                      </button>
                    ) : null}
                    {message.type === "STICKER" ? (
                      <span className="text-2xl">{message.content}</span>
                    ) : message.type === "IMAGE" ? (
                      <div className="group relative">
                        <img src={message.content} alt="sent image" className="max-h-72 max-w-full rounded-xl object-cover" />
                        <a
                          href={message.content}
                          download={`image_${message.id.slice(0, 8)}.jpg`}
                          className="absolute bottom-2 right-2 flex hidden items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white group-hover:flex"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={11} /> Lưu
                        </a>
                      </div>
                    ) : (
                      message.content
                    )}
                    {message.reaction ? <div className="mt-1 text-base">{message.reaction}</div> : null}
                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" className="text-[10px] opacity-60 hover:opacity-100" onClick={() => setReplyMessage(message)}>
                        Trả lời
                      </button>
                      <button type="button" className="text-[10px] opacity-60 hover:opacity-100" onClick={() => setReactingMessageId(message.id)}>
                        Cảm xúc
                      </button>
                    </div>
                    {reactingMessageId === message.id ? (
                      <div className="mt-1 flex gap-1">
                        {['👍','❤️','😂','😮','😢','🎉'].map((emoji) => (
                          <button key={emoji} type="button" className="rounded-full bg-white/10 px-2 py-1 text-sm hover:bg-white/20" onClick={() => sendReaction(message.id, emoji)}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          {replyMessage ? (
            <div className="flex items-center justify-between gap-3 border-t border-violet-200 bg-violet-50 px-4 py-2">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => scrollToMessage(replyMessage.id)}
              >
                <p className="text-xs font-semibold text-violet-600">Trả lời</p>
                <p className="truncate text-xs text-slate-600">{replyMessage.type === "IMAGE" ? "[Ảnh]" : replyMessage.content}</p>
              </button>
              <button type="button" className="text-xs text-slate-400 hover:text-slate-700" onClick={() => setReplyMessage(null)}>
                Hủy
              </button>
            </div>
          ) : null}

          <footer className="border-t border-indigo-100 bg-white/90 p-3">
            {showStickerPicker ? (
              <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-violet-100 bg-violet-50 p-2 shadow-sm">
                {stickerPack.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-xl shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50"
                    onClick={() => sendSticker(sticker.emoji)}
                  >
                    {sticker.emoji}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowStickerPicker((value) => !value)} className="border-violet-200 text-violet-600 hover:bg-violet-50">
                <Smile size={16} className="mr-1" /> Sticker
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => chatImageInputRef.current?.click()} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                <Image size={16} className="mr-1" /> Ảnh
              </Button>
              <input ref={chatImageInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void handleChatImageSelect(event)} />
              <Input
                placeholder="Nhập tin nhắn..."
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                className="border-indigo-200 bg-white text-slate-800 placeholder-slate-400 focus:border-indigo-400"
              />
              <Button onClick={sendMessage} disabled={!selectedConversationId || !draftMessage.trim() || isSendingMessage} className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700">
                <SendHorizonal size={16} className="mr-1" /> Gửi
              </Button>
            </div>
          </footer>
        </Card>
      </div>
    </div>
  );
}
