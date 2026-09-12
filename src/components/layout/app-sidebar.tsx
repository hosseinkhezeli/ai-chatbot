/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  Search,
  LoaderCircle,
  XCircle,
  Edit2,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/layout/user-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversationsResponse {
  conversations: Conversation[];
}

interface CreateConversationResponse {
  conversation: Conversation;
}

interface AppSidebarProps {
  activeConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onConversationDeleted: (deletedId: string) => void;
}

interface RenameMenuItemProps {
  conversationId: string;
  currentTitle: string | null;
  onRename: (conversationId: string, newTitle: string) => void;
}

function RenameMenuItem({ conversationId, currentTitle, onRename }: RenameMenuItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(currentTitle ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editTitle.trim() && editTitle.trim() !== currentTitle) {
      onRename(conversationId, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      setEditTitle(currentTitle ?? '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <DropdownMenuItem className="p-1" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-full h-8 px-2 py-1 text-sm border border-input bg-background rounded-md outline-none focus:ring-1 focus:ring-ring"
          maxLength={500}
          autoFocus
        />
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem onClick={() => setIsEditing(true)} className="flex items-center gap-2">
      <Edit2 className="h-4 w-4" />
      Rename
    </DropdownMenuItem>
  );
}

export function AppSidebar({
  activeConversationId,
  onConversationSelect,
  onConversationDeleted,
}: AppSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchConversations = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL('/api/conversations', window.location.origin);
      if (query.trim()) {
        url.searchParams.set('q', query.trim());
      }
      const response = await fetch(url.toString());
      if (!response.ok) {
        if (response.status === 401) {
          // Auth error - user will be redirected by middleware
          return;
        }
        throw new Error('Failed to load conversations');
      }
      const data: ConversationsResponse = await response.json();
      setConversations(data.conversations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations('');
  }, [fetchConversations]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    fetchConversations(debouncedSearchQuery);
  }, [debouncedSearchQuery, fetchConversations]);

  const handleNewChat = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: null }),
      });
      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }
      const data: CreateConversationResponse = await response.json();
      const newConversation = data.conversation;
      setConversations((prev) => [newConversation, ...prev]);
      onConversationSelect(newConversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    onConversationSelect(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!window.confirm('Delete this conversation?')) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      onConversationDeleted(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  };

  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!response.ok) {
        throw new Error('Failed to rename conversation');
      }
      const data: CreateConversationResponse = await response.json();
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, title: data.conversation.title, updatedAt: data.conversation.updatedAt }
            : c,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename conversation');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    if (date > new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)) {
      return 'Previous 7 Days';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const groupConversations = (convs: Conversation[]) => {
    const groups: Record<string, Conversation[]> = {};
    for (const conv of convs) {
      const groupKey = formatDate(conv.updatedAt);
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(conv);
    }
    return Object.entries(groups).map(([group, items]) => ({ group, items }));
  };

  const groupedConversations = groupConversations(conversations);

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border/50 bg-muted/20">
      <SidebarHeader className="p-4 space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start h-10 px-3 shadow-sm bg-background"
          onClick={handleNewChat}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Creating...</span>
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              <span className="text-sm font-medium">New chat</span>
            </>
          )}
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className="w-full rounded-md border border-border/50 bg-background/50 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring transition-all"
            disabled={isLoading}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-3 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex h-8 items-center gap-2 rounded-none px-2">
                <div className="size-4 rounded-none animate-pulse bg-muted" />
                <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="p-4 text-center text-sm text-destructive">
            <XCircle className="mx-auto h-6 w-6 mb-2" />
            <p>{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => fetchConversations(searchQuery)}
            >
              Retry
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          // Empty state
          <div className="p-4 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-xs mt-1">Click &quot;New chat&quot; to start</p>
          </div>
        ) : (
          // Conversation list
          groupedConversations.map(({ group, items }) => (
            <SidebarGroup key={group}>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 mb-1">
                {group}
              </SidebarGroupLabel>
              <SidebarMenu>
                {items.map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <SidebarMenuButton
                      isActive={activeConversationId === conversation.id}
                      className="text-sm"
                      onClick={() => handleConversationClick(conversation.id)}
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground/70" />
                      <span className="truncate">{conversation.title ?? 'Untitled'}</span>
                    </SidebarMenuButton>

                    {/* Overflow menu visible on hover/focus */}
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<SidebarMenuAction />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <RenameMenuItem
                          conversationId={conversation.id}
                          currentTitle={conversation.title}
                          onRename={handleRenameConversation}
                        />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteConversation(conversation.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
