'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createConversation,
  deleteConversation,
  getConversations,
  renameConversation,
} from './conversations-api';
import type { Conversation } from './conversations.types';

const SEARCH_DEBOUNCE_MS = 300;

interface UseConversationsResult {
  conversations: Conversation[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createNewConversation: () => Promise<Conversation | null>;
  removeConversation: (conversationId: string) => Promise<boolean>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  retry: () => void;
}

export function useConversations(): UseConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const result = await getConversations(searchQuery);

          if (!controller.signal.aborted) {
            setConversations(result);
          }
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }

          setError(error instanceof Error ? error.message : 'Failed to load conversations');
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      },
      searchQuery ? SEARCH_DEBOUNCE_MS : 0,
    );

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery, reloadKey]);

  const createNewConversation = useCallback(async () => {
    if (isCreating) {
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      const conversation = await createConversation();

      setConversations((current) => [conversation, ...current]);

      return conversation;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create conversation');

      return null;
    } finally {
      setIsCreating(false);
    }
  }, [isCreating]);

  const removeConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    setError(null);

    try {
      await deleteConversation(conversationId);

      setConversations((current) =>
        current.filter((conversation) => conversation.id !== conversationId),
      );

      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete conversation');

      return false;
    }
  }, []);

  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    if (!title.trim()) {
      return;
    }

    setError(null);

    try {
      const updatedConversation = await renameConversation(conversationId, title);

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId ? updatedConversation : conversation,
        ),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to rename conversation');
    }
  }, []);

  const retry = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  return {
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
  };
}
