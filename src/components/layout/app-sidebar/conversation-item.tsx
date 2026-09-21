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

const LONG_PRESS_DURATION = 500;
const LONG_PRESS_MOVE_THRESHOLD = 8;

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isEditing) return;

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
      return;
    }

    clearLongPressTimer();

    longPressTriggeredRef.current = false;
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      suppressClickRef.current = true;
      setMenuOpen(true);
    }, LONG_PRESS_DURATION);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (longPressTimerRef.current === null) {
      return;
    }

    const deltaX = Math.abs(event.clientX - pointerStartRef.current.x);
    const deltaY = Math.abs(event.clientY - pointerStartRef.current.y);

    if (deltaX > LONG_PRESS_MOVE_THRESHOLD || deltaY > LONG_PRESS_MOVE_THRESHOLD) {
      clearLongPressTimer();
    }
  };

  const handlePointerUp = () => {
    clearLongPressTimer();
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
      longPressTriggeredRef.current = false;
      return;
    }

    onSelect(conversation.id);
  };

  const startEditing = () => {
    setEditTitle(conversation.title ?? '');
    setIsEditing(true);
    setMenuOpen(false);
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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={handleClick}
        >
          <span className="truncate">{conversation.title ?? fa.sidebar.untitled}</span>
        </SidebarMenuButton>
      )}

      <ConversationActions
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onRename={startEditing}
        onDelete={() => onDelete(conversation.id)}
      />
    </SidebarMenuItem>
  );
}
