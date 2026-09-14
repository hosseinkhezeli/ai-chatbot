'use client';

import { SessionProvider } from 'next-auth/react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import { AppSidebar } from '@/components/layout/app-sidebar/app-sidebar';
import { Chat } from '@/components/chat/chat';

import { useActiveConversation } from '@/lib/conversations/use-active-conversation';

function AppContent() {
  const {
    activeConversationId,
    activeConversationTitle,
    isReady,
    selectConversation,
    ensureConversation,
    handleConversationDeleted,
  } = useActiveConversation();

  if (!isReady) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar
        activeConversationId={activeConversationId}
        onConversationSelect={selectConversation}
        onConversationDeleted={handleConversationDeleted}
      />

      <main className="relative flex h-svh flex-1 flex-col overflow-hidden bg-background">
        <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-background/80 px-4 backdrop-blur-md md:hidden">
          <SidebarTrigger className="text-muted-foreground" />

          <span className="ml-3 truncate text-sm font-medium">
            {activeConversationTitle ?? 'New Conversation'}
          </span>
        </div>

        <div className="absolute left-3 top-3 z-10 hidden md:flex">
          <SidebarTrigger className="bg-background/50 text-muted-foreground shadow-sm backdrop-blur-md hover:text-foreground" />
        </div>

        <div className="relative flex-1 overflow-hidden">
          <Chat conversationId={activeConversationId} onEnsureConversation={ensureConversation} />
        </div>
      </main>
    </SidebarProvider>
  );
}

export function AppShell() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
