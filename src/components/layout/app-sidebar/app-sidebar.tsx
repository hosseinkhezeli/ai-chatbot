'use client';

import { LoaderCircle, Plus } from 'lucide-react';
import { useEffect } from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/layout/user-menu';
import { fa } from '@/lib/i18n/fa';

import { useConversations } from '@/lib/conversations/use-conversations';

import { ConversationSearch } from './conversation-search';
import { ConversationList } from './conversation-list';
import Image from 'next/image';

interface AppSidebarProps {
  activeConversationId: string | null;
  onConversationSelect: (conversationId: string | null) => void;
  onConversationDeleted: (deletedId: string) => void;
}

function ConversationLoadingState() {
  return (
    <div className="space-y-3 p-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="flex h-8 items-center gap-2 rounded-none px-2">
          <div className="size-4 animate-pulse rounded-none bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function AppSidebar({
  activeConversationId,
  onConversationSelect,
  onConversationDeleted,
}: AppSidebarProps) {
  const {
    conversations,
    isLoading,
    isCreating,
    error,
    searchQuery,
    setSearchQuery,
    removeConversation,
    updateConversationTitle,
    retry,
  } = useConversations();

  // Refresh conversation list when a new conversation is created from the first message
  useEffect(() => {
    function handleConversationCreated() {
      retry();
    }

    window.addEventListener('conversation-created', handleConversationCreated);

    return () => {
      window.removeEventListener('conversation-created', handleConversationCreated);
    };
  }, [retry]);

  const handleNewChat = () => {
    onConversationSelect(null);
  };

  const handleDelete = async (conversationId: string) => {
    if (!window.confirm(fa.sidebar.confirmDelete)) {
      return;
    }

    const deleted = await removeConversation(conversationId);

    if (deleted) {
      onConversationDeleted(conversationId);
    }
  };

  return (
    <Sidebar side="right" collapsible="offcanvas" className="border-e border-border/50 bg-muted/20">
      <SidebarHeader className="space-y-2 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-start" style={{ filter: 'invert(1)' }}>
              <Image
                src={'/icons/icon.svg'}
                alt="logo"
                width={200}
                height={200}
                className="h-8 w-auto aspect-square"
              />
              <Image
                src={'/logo-type.svg'}
                alt="logo"
                width={150}
                height={50}
                className="h-auto w-20"
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <Button
          variant="outline"
          className="h-10 w-full justify-start bg-background px-3 shadow-sm"
          onClick={handleNewChat}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <LoaderCircle className="me-2 h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">{fa.sidebar.creating}</span>
            </>
          ) : (
            <>
              <Plus className="me-2 h-4 w-4" />
              <span className="text-sm font-medium">{fa.sidebar.newChat}</span>
            </>
          )}
        </Button>

        <ConversationSearch value={searchQuery} onChange={setSearchQuery} disabled={isLoading} />
      </SidebarHeader>

      <SidebarContent>
        {isLoading ? (
          <ConversationLoadingState />
        ) : (
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            error={error}
            onSelect={onConversationSelect}
            onRename={updateConversationTitle}
            onDelete={handleDelete}
            onRetry={retry}
          />
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
