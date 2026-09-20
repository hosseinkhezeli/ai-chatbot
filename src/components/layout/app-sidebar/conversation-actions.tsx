'use client';

import { MoreHorizontal, Pen, Trash } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import { fa } from '@/lib/i18n/fa';

interface ConversationActionsProps {
  onRename: () => void;
  onDelete: () => void;
}

export function ConversationActions({ onRename, onDelete }: ConversationActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuAction
            aria-label={fa.sidebar.moreOptions}
            className="left-2! right-auto! transition-all opacity-0 group-hover/chat-item:opacity-100"
          >
            <MoreHorizontal />
          </SidebarMenuAction>
        }
        className="flex"
      />

      <DropdownMenuContent side="inline-end" align="start">
        <DropdownMenuItem onClick={onRename}>
          <Pen />
          {fa.sidebar.rename}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={
            'text-destructive hover:bg-destructive/20! hover:text-destructive! focus:text-destructive!'
          }
          onClick={onDelete}
        >
          <span>
            <Trash className="hover:text-destructive! focus:text-destructive! text-destructive!" />
          </span>
          {fa.sidebar.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
