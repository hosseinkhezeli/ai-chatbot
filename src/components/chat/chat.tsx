/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { useNotifications } from '@/components/pwa/notification-manager';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';

import type { EnsuredConversation } from '@/lib/conversations/use-active-conversation';

import { ChatComposer } from './chat-composer';
import { ChatMessages } from './chat-messages';

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

  const { isOnline } = useOnlineStatus();
  const { notifyCompletion } = useNotifications();

  const [isHistoryLoading, setIsHistoryLoading] = useState(conversationId !== null);

  const [historyError, setHistoryError] = useState<string | null>(null);

  const [historyRetryToken, setHistoryRetryToken] = useState(0);

  /*
   * Stores only the ID of a conversation that was created by
   * the current first-message flow.
   *
   * When AppShell changes:
   *
   *   null -> newConversationId
   *
   * we do not want the history effect to immediately clear the
   * optimistic/local messages and fetch the conversation again.
   */
  const newlyCreatedConversationIdRef = useRef<string | null>(null);

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),

    onFinish: (event) => {
      if (event.isError) {
        return;
      }

      const preview =
        event.message?.parts
          ?.filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join(' ') ?? '';

      void notifyCompletion(preview);
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
          throw new Error('Failed to load conversation history');
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

        setHistoryError(
          error instanceof Error ? error.message : 'Failed to load conversation history',
        );
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

    /*
     * This is the critical part:
     *
     * The returned ID is the authoritative ID for this request.
     * We do NOT wait for React state to update.
     */
    const { id: targetConversationId, isNew } = await onEnsureConversation();

    if (isNew) {
      newlyCreatedConversationIdRef.current = targetConversationId;
    }

    await sendMessage(
      {
        text,
      },
      {
        body: {
          conversationId: targetConversationId,
        },
      },
    );
  }

  function handleRetryHistory() {
    setHistoryRetryToken((token) => token + 1);
  }

  return (
    <main className="flex h-svh flex-col">
      <OfflineIndicator />

      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-4">
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          isHistoryLoading={isHistoryLoading}
          historyError={historyError}
          error={error}
          onRetryHistory={handleRetryHistory}
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
