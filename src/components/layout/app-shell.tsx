'use client';

import { useCallback, useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Chat } from '@/components/chat/chat';

const ACTIVE_CONVERSATION_KEY = 'activeConversationId';

function getStoredActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
  } catch {
    return null;
  }
}

function setStoredActiveConversationId(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    }
  } catch {
    // Ignore localStorage errors (e.g., private browsing, quota exceeded)
  }
}

interface ConversationTitleResponse {
  conversation: {
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
  };
  messages: unknown[];
}

export function AppShell() {
  // Single source of truth for the active conversation.
  // The sidebar highlights based on it; Chat loads history for it.
  // Persisted in localStorage to survive page reloads and return visits.
  // Lazy initializer reads from localStorage during first render (client-only).
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() =>
    getStoredActiveConversationId()
  );
  const [activeConversationTitle, setActiveConversationTitle] = useState<string | null>(null);

  const setActiveConversationId = useCallback(
    (id: string | null | ((prev: string | null) => string | null)) => {
      const newId = typeof id === 'function' ? id(activeConversationId) : id;
      setActiveConversationIdState(newId);
      setStoredActiveConversationId(newId);
      // Fetch title when conversation changes
      if (newId) {
        fetch(`/api/conversations/${newId}`)
          .then((res) => res.ok ? res.json() : null)
          .then((data: ConversationTitleResponse | null) => {
            if (data?.conversation) {
              setActiveConversationTitle(data.conversation.title);
            }
          })
          .catch(() => setActiveConversationTitle(null));
      } else {
        setActiveConversationTitle(null);
      }
    },
    [activeConversationId]
  );

  // If the user deletes the conversation that's currently open, fall back to
  // a fresh chat. Chat's conversationId effect resets messages on null.
  const handleConversationDelete = useCallback((deletedId: string) => {
    setActiveConversationId((current: string | null) => (current === deletedId ? null : current));
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
          <span className="ml-3 text-sm font-medium truncate">
            {activeConversationTitle ?? 'New Conversation'}
          </span>
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
