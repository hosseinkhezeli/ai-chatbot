'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createConversation,
  deleteConversation,
  getConversations,
  renameConversation,
} from './conversations-api';
import type { Conversation } from './conversations.types';
import { fa } from '@/lib/i18n/fa';

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

          // getConversations() already throws a Persian catalog message (e.g. the
          // 401 case); a raw TypeError ("Failed to fetch") is a network-level
          // failure we log for debugging and replace with the generic string.
          if (error instanceof Error && error.name !== 'TypeError') {
            setError(error.message);
          } else {
            console.error('Failed to load conversations:', error);
            setError(fa.errors.loadConversations);
          }
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
      // A network-level failure (fetch throwing "Failed to fetch") would leak a
      // raw browser message via error.message — always show the catalog string.
      console.error('Failed to create conversation:', error);
      setError(fa.errors.createConversation);

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
      console.error('Failed to delete conversation:', error);
      setError(fa.errors.deleteConversation);

      return false;
    }
  }, []);

  const updateConversationTitle = useCallback(
    async (conversationId: string, title: string) => {
      const trimmedTitle = title.trim();

      if (!trimmedTitle) {
        return;
      }

      setError(null);

      const previousConversation = conversations.find(
        (conversation) => conversation.id === conversationId,
      );

      if (!previousConversation) {
        return;
      }

      // Optimistic update
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, title: trimmedTitle }
            : conversation,
        ),
      );

      try {
        await renameConversation(conversationId, trimmedTitle);
      } catch (error) {
        console.error('Failed to rename conversation:', error);
        setError(fa.errors.renameConversation);

        // Rollback
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId ? previousConversation : conversation,
          ),
        );
      }
    },
    [conversations],
  );
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
