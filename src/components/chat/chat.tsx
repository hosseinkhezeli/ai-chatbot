/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { useNotifications } from '@/components/pwa/notification-manager';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';

import type { EnsuredConversation } from '@/lib/conversations/use-active-conversation';
import { fa } from '@/lib/i18n/fa';

import { ChatComposer } from './chat-composer';
import { ChatMessages } from './chat-messages';

/**
 * Creates a custom fetch function that captures the x-conversation-id header
 * from the response. This is used when a new conversation is created from the first message.
 */
function createConversationTrackingFetch(
  conversationIdCallback: (id: string) => void
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);

    const conversationId = response.headers.get('x-conversation-id');
    if (conversationId) {
      conversationIdCallback(conversationId);
    }

    return response;
  };
}

interface FailedTurn {
  userMessageId: string;
  userMessageText: string;
  error: Error;
  retryable: boolean;
  attempts: number;
}

interface PersistedMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: unknown;
  createdAt: string;
}

interface ConversationMessagesResponse {
  messages: PersistedMessage[];
}

function toUIMessage(row: PersistedMessage): UIMessage | null {
  if (row.role !== 'user' && row.role !== 'assistant') {
    return null;
  }

  if (!Array.isArray(row.content)) {
    return null;
  }

  return {
    id: row.id,
    role: row.role,
    parts: row.content as UIMessage['parts'],
  };
}

interface QueuedMessage {
  id: string;
  text: string;
}

function generateMessageId() {
  return `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function queueMessageOffline(message: QueuedMessage) {
  const swReg = await navigator.serviceWorker?.ready;

  if (swReg) {
    swReg.active?.postMessage({
      type: 'QUEUE_MESSAGE',
      message: {
        ...message,
        api: '/api/chat',
      },
    });
  }

  if (!('indexedDB' in window)) {
    return;
  }

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('ai-chatbot-offline', 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains('messages')) {
        database.createObjectStore('messages', {
          keyPath: 'id',
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const transaction = db.transaction('messages', 'readwrite');

  transaction.objectStore('messages').put({
    ...message,
    api: '/api/chat',
    queuedAt: Date.now(),
  });

  transaction.oncomplete = () => db.close();
}

interface ChatProps {
  conversationId: string | null;
  onEnsureConversation: () => Promise<EnsuredConversation>;
}

export function Chat({ conversationId, onEnsureConversation }: ChatProps) {
  const [input, setInput] = useState('');
  const [failedTurn, setFailedTurn] = useState<FailedTurn | null>(null);

  const { isOnline } = useOnlineStatus();
  const { notifyCompletion } = useNotifications();

  const [isHistoryLoading, setIsHistoryLoading] = useState(conversationId !== null);

  const [historyError, setHistoryError] = useState<string | null>(null);

  const [historyRetryToken, setHistoryRetryToken] = useState(0);

  /*
   * Stores the ID of a conversation that was created by the first-message flow.
   * Used to prevent the history effect from clearing optimistic messages.
   */
  const newlyCreatedConversationIdRef = useRef<string | null>(null);

  // Custom fetch that captures the conversation ID from response headers
  // Use useRef to maintain stable reference across renders
  const trackingFetchRef = useRef<typeof fetch | null>(null);

  useEffect(() => {
    if (!trackingFetchRef.current) {
      trackingFetchRef.current = createConversationTrackingFetch((id: string) => {
        newlyCreatedConversationIdRef.current = id;
      });
    }
  }, []);

  const { messages, sendMessage, setMessages, status, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: trackingFetchRef.current ?? fetch,
    }),

    onFinish: (event) => {
      // Clear failed turn on successful completion
      if (!event.isError) {
        setFailedTurn(null);
      }

      if (event.isError) {
        // The error will be handled by onError callback
        return;
      }

      const preview =
        event.message?.parts
          ?.filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join(' ') ?? '';

      void notifyCompletion(preview);
    },

    onError: (error) => {
      // Extract error details from the AI SDK error
      const aiError = error as Error & {
        response?: Response;
        body?: { exhausted?: boolean; retryable?: boolean; attempts?: number };
      };

      let retryable = false;
      let attempts = 0;

      if (aiError.body?.exhausted) {
        retryable = aiError.body.retryable ?? false;
        attempts = aiError.body.attempts ?? 0;
      }

      // Find the last user message that triggered this error
      const userMessages = messages.filter((m) => m.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (lastUserMessage) {
        const userText = lastUserMessage.parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join(' ');

        setFailedTurn({
          userMessageId: lastUserMessage.id,
          userMessageText: userText,
          error: aiError,
          retryable,
          attempts,
        });
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    setHistoryError(null);

    if (!conversationId) {
      setMessages([]);
      setIsHistoryLoading(false);
      return;
    }

    /*
     * First-message creation flow:
     *
     * Chat created this conversation itself, so its local
     * useChat state is already authoritative.
     *
     * Do not clear it or reload the same conversation.
     */
    if (newlyCreatedConversationIdRef.current === conversationId) {
      newlyCreatedConversationIdRef.current = null;
      setIsHistoryLoading(false);
      return;
    }

    const controller = new AbortController();

    setMessages([]);
    setIsHistoryLoading(true);

    async function loadHistory() {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(fa.errors.loadHistory);
        }

        const data: ConversationMessagesResponse = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        setMessages(
          data.messages
            .map(toUIMessage)
            .filter((message): message is UIMessage => message !== null),
        );

        setHistoryError(null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        // Keep the technical detail in the console; the UI only shows fa.errors.loadHistory.
        console.error('Failed to load conversation history:', error);
        setHistoryError(fa.errors.loadHistory);
      } finally {
        if (!controller.signal.aborted) {
          setIsHistoryLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      controller.abort();
    };
  }, [conversationId, historyRetryToken, setMessages]);

  async function handleSubmit() {
    const text = input.trim();

    if (!text || isLoading || isHistoryLoading) {
      return;
    }

    if (!isOnline) {
      await queueMessageOffline({
        id: generateMessageId(),
        text,
      });

      setInput('');
      return;
    }

    setInput('');

    const { id: targetConversationId, isNew } = await onEnsureConversation();

    // Prepare body - only include conversationId if we have one
    const body: Record<string, unknown> = {};
    if (targetConversationId) {
      body.conversationId = targetConversationId;
    }

    if (isNew) {
      // For new conversations, the ID will be captured from the response header
      // via ConversationTrackingTransport. We'll set the ref after the request completes.
    }

    await sendMessage(
      {
        text,
      },
      {
        body,
      },
    );

    // If this was a new conversation, the ID was captured via the transport
    // Trigger sidebar refresh to show the new conversation
    if (isNew && newlyCreatedConversationIdRef.current) {
      window.dispatchEvent(new CustomEvent('conversation-created', {
        detail: { conversationId: newlyCreatedConversationIdRef.current },
      }));
    }
  }

  function handleRetryHistory() {
    setHistoryRetryToken((token) => token + 1);
  }

  const handleRetry = useCallback(async () => {
    if (!failedTurn || isLoading) return;

    // Clear the failed turn state; regenerate will re-send the last request
    setFailedTurn(null);

    // Use AI SDK's regenerate to retry the same request
    // This does NOT create a new user message - it regenerates the assistant response
    await regenerate();
  }, [failedTurn, isLoading, regenerate]);

  const handleEdit = useCallback(() => {
    if (!failedTurn || isLoading) return;

    // Put the failed user message text back into the composer
    // Remove the failed assistant message (if any) and let user edit
    setInput(failedTurn.userMessageText);

    // Remove the last user message from the chat so it can be re-sent
    // This effectively replaces the failed turn with a new attempt
    setMessages((current) => {
      // Find and remove the last user message and any subsequent assistant message
      const lastUserIndex = current.findLastIndex((m) => m.role === 'user');
      if (lastUserIndex === -1) return current;

      // Keep messages before the last user message
      return current.slice(0, lastUserIndex);
    });

    setFailedTurn(null);
  }, [failedTurn, isLoading, setMessages]);

  return (
    <main className="flex h-[calc(100svh-64px)] md:h-svh flex-col">
      <OfflineIndicator />

      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4">
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          isHistoryLoading={isHistoryLoading}
          historyError={historyError}
          error={error}
          onRetryHistory={handleRetryHistory}
          failedTurn={failedTurn}
          onRetry={handleRetry}
          onEdit={handleEdit}
        />

        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          isHistoryLoading={isHistoryLoading}
          isOnline={isOnline}
        />
      </div>
    </main>
  );
}
