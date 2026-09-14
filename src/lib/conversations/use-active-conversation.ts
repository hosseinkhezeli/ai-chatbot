/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createConversation, getConversation } from './conversations-api';
import type { Conversation } from './conversations.types';

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
  id: string;
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

  const creationPromiseRef = useRef<Promise<Conversation> | null>(null);

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

    /*
     * If multiple sends happen before React commits the new state,
     * reuse the same creation request.
     */
    if (creationPromiseRef.current) {
      const conversation = await creationPromiseRef.current;

      return {
        id: conversation.id,
        isNew: false,
      };
    }

    const creationPromise = createConversation();

    creationPromiseRef.current = creationPromise;

    try {
      const conversation = await creationPromise;

      setActiveConversationId(conversation.id);
      setActiveConversationTitle(conversation.title);
      storeConversationId(conversation.id);

      return {
        id: conversation.id,
        isNew: true,
      };
    } finally {
      creationPromiseRef.current = null;
    }
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
