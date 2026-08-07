import { useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MessageCircleMore } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { chatApi, type ConversationItem } from "@/features/chat/api/chat.api";
import { formatRelativeTime } from "@/lib/utils";

export function ConversationList({
  selectedConversationId,
  onSelect
}: {
  selectedConversationId: string | null;
  onSelect: (conversation: ConversationItem) => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const conversationsQuery = useInfiniteQuery({
    queryKey: ["conversations"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => chatApi.getConversations(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
  });

  const conversations = useMemo(
    () => conversationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [conversationsQuery.data]
  );

  const rowVirtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 74,
    overscan: 8
  });

  useEffect(() => {
    const [lastVirtualItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastVirtualItem) {
      return;
    }

    const isNearEnd = lastVirtualItem.index >= conversations.length - 5;

    if (isNearEnd && conversationsQuery.hasNextPage && !conversationsQuery.isFetchingNextPage) {
      void conversationsQuery.fetchNextPage();
    }
  }, [
    conversations.length,
    conversationsQuery,
    conversationsQuery.hasNextPage,
    conversationsQuery.isFetchingNextPage,
    rowVirtualizer
  ]);

  if (conversationsQuery.isLoading) {
    return (
      <div className="space-y-3 p-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (conversationsQuery.isError) {
    return (
      <div className="grid place-items-center p-6 text-center text-sm text-slate-500">
        <div>
          <MessageCircleMore className="mx-auto mb-2" size={20} />
          Could not load conversations.
        </div>
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="grid place-items-center p-6 text-center text-sm text-slate-500">
        <div>
          <MessageCircleMore className="mx-auto mb-2" size={20} />
          No conversations yet.
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        className="relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const conversation = conversations[virtualItem.index];
          const isSelected = conversation.id === selectedConversationId;

          return (
            <button
              key={conversation.id}
              type="button"
              className={`absolute left-0 top-0 flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left transition ${
                isSelected ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
              style={{ transform: `translateY(${virtualItem.start}px)` }}
              onClick={() => onSelect(conversation)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{conversation.title}</p>
                <p className="truncate text-xs text-slate-500">
                  {conversation.lastMessageAt ? formatRelativeTime(conversation.lastMessageAt) : "No messages"}
                </p>
              </div>
              {conversation.unreadCount > 0 ? <Badge variant="success">{conversation.unreadCount}</Badge> : null}
            </button>
          );
        })}
      </div>
      {conversationsQuery.isFetchingNextPage ? <Skeleton className="mx-3 my-3 h-10" /> : null}
    </div>
  );
}
