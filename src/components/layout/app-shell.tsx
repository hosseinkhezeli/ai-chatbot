'use client';

import { useCallback, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Chat } from '@/components/chat/chat';

export function AppShell() {
  // Single source of truth for the active conversation.
  // The sidebar highlights based on it; Chat loads history for it.
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // If the user deletes the conversation that's currently open, fall back to
  // a fresh chat. Chat's conversationId effect resets messages on null.
  const handleConversationDelete = useCallback((deletedId: string) => {
    setActiveConversationId((current) => (current === deletedId ? null : current));
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar
        activeConversationId={activeConversationId}
        onConversationSelect={setActiveConversationId}
        onConversationDeleted={handleConversationDelete}
      />
      <main className="relative flex h-svh flex-1 flex-col overflow-hidden bg-background">
        {/* Mobile-only header */}
        <div className="md:hidden flex h-14 shrink-0 items-center border-b bg-background/80 px-4 backdrop-blur-md sticky top-0 z-10">
          <SidebarTrigger className="text-muted-foreground" />
          <span className="ml-3 text-sm font-medium truncate">New Conversation</span>
        </div>

        {/* Desktop-only floating trigger (shows when sidebar is closed) */}
        <div className="hidden md:flex absolute top-3 left-3 z-10">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground bg-background/50 backdrop-blur-md shadow-sm" />
        </div>

        {/* Main chat container */}
        <div className="flex-1 relative overflow-hidden">
          <Chat conversationId={activeConversationId} />
        </div>
      </main>
    </SidebarProvider>
  );
}
