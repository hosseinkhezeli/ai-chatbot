'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const startEditing = () => {
    setEditTitle(conversation.title ?? '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditTitle(conversation.title ?? '');
    setIsEditing(false);
  };

  const save = () => {
    const trimmedTitle = editTitle.trim();

    if (trimmedTitle && trimmedTitle !== conversation.title) {
      onRename(conversation.id, trimmedTitle);
    }

    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();

    if (event.key === 'Enter') {
      event.preventDefault();
      save();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  };

  return (
    <SidebarMenuItem className="group/chat-item flex items-center">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          dir="auto"
          aria-label={fa.sidebar.rename}
          value={editTitle}
          onChange={(event) => setEditTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(event) => event.stopPropagation()}
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          maxLength={500}
        />
      ) : (
        <SidebarMenuButton
          isActive={isActive}
          className="text-sm"
          onClick={() => onSelect(conversation.id)}
        >
          <span className="truncate">{conversation.title ?? fa.sidebar.untitled}</span>
        </SidebarMenuButton>
      )}

      <ConversationActions onRename={startEditing} onDelete={() => onDelete(conversation.id)} />
    </SidebarMenuItem>
  );
}
