'use client';

import { MessageSquare, XCircle } from 'lucide-react';

import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

import type { Conversation } from '@/lib/conversations/conversations.types';
import { groupConversations } from '@/lib/conversations/conversations-utils';
import { fa } from '@/lib/i18n/fa';

import { ConversationItem } from './conversation-item';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  error: string | null;
  onSelect: (conversationId: string) => void;
  onRename: (conversationId: string, title: string) => void;
  onDelete: (conversationId: string) => void;
  onRetry: () => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  error,
  onSelect,
  onRename,
  onDelete,
  onRetry,
}: ConversationListProps) {
  if (error) {
    return (
      <div className="p-4 text-center text-sm text-destructive">
        <XCircle className="mx-auto mb-2 h-6 w-6" />

        <p>{error}</p>

        <Button variant="ghost" size="sm" className="mt-2" onClick={onRetry}>
          {fa.chat.retry}
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />

        <p>{fa.sidebar.emptyTitle}</p>
        <p className="mt-1 text-xs">{fa.sidebar.emptyHint}</p>
      </div>
    );
  }

  const groups = groupConversations(conversations);

  return (
    <>
      {groups.map(({ group, items }) => (
        <SidebarGroup key={group}>
          <SidebarGroupLabel className="mb-1 text-xs font-medium text-muted-foreground/70">
            {group}
          </SidebarGroupLabel>

          <SidebarMenu>
            {items.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversationId === conversation.id}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
