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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  onDelete: () => void;
}

export function ConversationActions({
  open,
  onOpenChange,
  onRename,
  onDelete,
}: ConversationActionsProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <SidebarMenuAction
            aria-label={fa.sidebar.moreOptions}
            className="
              left-2! right-auto!
              opacity-0
              pointer-events-none
              max-md:pointer-events-none
              md:pointer-events-auto
              md:group-hover/chat-item:opacity-100
              md:focus-visible:opacity-100
              transition-all
            "
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
          className="text-destructive hover:bg-destructive/20! hover:text-destructive! focus:text-destructive!"
          onClick={onDelete}
        >
          <Trash className="text-destructive!" />
          {fa.sidebar.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
