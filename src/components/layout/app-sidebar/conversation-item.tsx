'use client';

import { MessageSquare } from 'lucide-react';

import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

import type { Conversation } from '@/lib/conversations/conversations.types';
import { fa } from '@/lib/i18n/fa';
import { ConversationActions } from './conversation-actions';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
  onRename: (conversationId: string, title: string) => void;
  onDelete: (conversationId: string) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: ConversationItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        className="text-sm"
        onClick={() => onSelect(conversation.id)}
      >
        <MessageSquare className="h-4 w-4 text-muted-foreground/70" />

        <span className="truncate">{conversation.title ?? fa.sidebar.untitled}</span>
      </SidebarMenuButton>

      <ConversationActions
        conversationId={conversation.id}
        currentTitle={conversation.title}
        onRename={onRename}
        onDelete={onDelete}
      />
    </SidebarMenuItem>
  );
}
