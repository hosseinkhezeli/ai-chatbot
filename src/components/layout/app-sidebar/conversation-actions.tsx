'use client';

import { useEffect, useRef, useState, MouseEvent } from 'react';
import { Edit2, MoreHorizontal } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import { fa } from '@/lib/i18n/fa';
import { BaseUIEvent } from '@base-ui/react/types';

interface ConversationActionsProps {
  conversationId: string;
  currentTitle: string | null;
  onRename: (conversationId: string, title: string) => void;
  onDelete: (conversationId: string) => void;
}

interface RenameMenuItemProps {
  conversationId: string;
  currentTitle: string | null;
  onRename: (conversationId: string, title: string) => void;
  onEditingChange: (editing: boolean) => void;
}

function RenameMenuItem({
  conversationId,
  currentTitle,
  onRename,
  onEditingChange,
}: RenameMenuItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const startEditing = (event: BaseUIEvent<MouseEvent>) => {
    event.preventDefault();
    event.stopPropagation();

    setEditTitle(currentTitle ?? '');
    setIsEditing(true);
    onEditingChange(true);
  };

  const cancelEditing = () => {
    setEditTitle(currentTitle ?? '');
    setIsEditing(false);
    onEditingChange(false);
  };

  const save = () => {
    const trimmedTitle = editTitle.trim();

    if (trimmedTitle && trimmedTitle !== currentTitle) {
      onRename(conversationId, trimmedTitle);
    }

    setIsEditing(false);
    onEditingChange(false);
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

  if (isEditing) {
    return (
      <DropdownMenuItem
        className="p-1"
        onSelect={(event) => event.preventDefault()}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          dir="auto"
          aria-label={fa.sidebar.rename}
          value={editTitle}
          onChange={(event) => setEditTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          maxLength={500}
        />
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      onSelect={(event) => event.preventDefault()}
      onClick={startEditing}
      className="flex items-center gap-2"
    >
      <Edit2 className="h-4 w-4" />
      {fa.sidebar.rename}
    </DropdownMenuItem>
  );
}

export function ConversationActions({
  conversationId,
  currentTitle,
  onRename,
  onDelete,
}: ConversationActionsProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isEditing && !nextOpen) {
      return;
    }

    setOpen(nextOpen);
  };

  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing);

    if (!editing) {
      setOpen(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger render={<SidebarMenuAction aria-label={fa.sidebar.moreOptions} />}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="inline-end" align="start">
        <RenameMenuItem
          conversationId={conversationId}
          currentTitle={currentTitle}
          onRename={onRename}
          onEditingChange={handleEditingChange}
        />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(conversationId)}
        >
          {fa.sidebar.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
