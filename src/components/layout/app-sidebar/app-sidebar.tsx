'use client';

import { LoaderCircle, Plus } from 'lucide-react';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/layout/user-menu';
import { fa } from '@/lib/i18n/fa';

import { useConversations } from '@/lib/conversations/use-conversations';

import { ConversationSearch } from './conversation-search';
import { ConversationList } from './conversation-list';

interface AppSidebarProps {
  activeConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
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
    createNewConversation,
    removeConversation,
    updateConversationTitle,
    retry,
  } = useConversations();

  const handleNewChat = async () => {
    const conversation = await createNewConversation();

    if (conversation) {
      onConversationSelect(conversation.id);
    }
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
