/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useEffect, useState } from 'react';

import { getConversation } from './conversations-api';

const ACTIVE_CONVERSATION_KEY = 'activeConversationId';

function readStoredConversationId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_CONVERSATION_KEY);
  } catch {
    return null;
  }
}

function storeConversationId(id: string | null) {
  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    }
  } catch {
    // Ignore localStorage failures.
  }
}

export interface EnsuredConversation {
  id: string | null;
  isNew: boolean;
}

interface UseActiveConversationResult {
  activeConversationId: string | null;
  activeConversationTitle: string | null;
  isReady: boolean;
  selectConversation: (conversationId: string | null) => void;
  ensureConversation: () => Promise<EnsuredConversation>;
  handleConversationDeleted: (deletedId: string) => void;
}

export function useActiveConversation(): UseActiveConversationResult {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [activeConversationTitle, setActiveConversationTitle] = useState<string | null>(null);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedId = readStoredConversationId();

    setActiveConversationId(storedId);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || !activeConversationId) {
      setActiveConversationTitle(null);
      return;
    }

    const controller = new AbortController();

    async function loadConversation() {
      try {
        /*
         * getConversation() is the single API boundary for conversation
         * requests. The AbortController still lets us ignore stale results.
         */
        const conversation = await getConversation(activeConversationId, controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        setActiveConversationTitle(conversation.title);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof Error && error.name === 'NotFoundError') {
          setActiveConversationId(null);
          setActiveConversationTitle(null);
          storeConversationId(null);
          return;
        }

        setActiveConversationTitle(null);
      }
    }

    void loadConversation();

    return () => {
      controller.abort();
    };
  }, [activeConversationId, isReady]);

  const selectConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
    setActiveConversationTitle(null);
    storeConversationId(conversationId);
  }, []);

  const ensureConversation = useCallback(async (): Promise<EnsuredConversation> => {
    if (activeConversationId) {
      return {
        id: activeConversationId,
        isNew: false,
      };
    }

    // No active conversation — signal that a new one needs to be created
    // by the first message sent to /api/chat
    return {
      id: null,
      isNew: true,
    };
  }, [activeConversationId]);

  const handleConversationDeleted = useCallback(
    (deletedId: string) => {
      if (activeConversationId !== deletedId) {
        return;
      }

      selectConversation(null);
    },
    [activeConversationId, selectConversation],
  );

  return {
    activeConversationId,
    activeConversationTitle,
    isReady,
    selectConversation,
    ensureConversation,
    handleConversationDeleted,
  };
}
