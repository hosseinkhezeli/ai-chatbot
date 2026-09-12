'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ArrowUpIcon, LoaderCircleIcon, PaperclipIcon } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { InputGroup, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useNotifications } from '@/components/pwa/notification-manager';

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
      message: { ...message, api: '/api/chat' },
    });
  }

  // Fallback: also store directly via client-side IndexedDB so the
  // message survives even if background sync is unavailable (iOS).
  if ('indexedDB' in window) {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('ai-chatbot-offline', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction('messages', 'readwrite');
    tx.objectStore('messages').put({
      ...message,
      api: '/api/chat',
      queuedAt: Date.now(),
    });
    tx.oncomplete = () => db.close();
  }
}

export function Chat() {
  const [input, setInput] = useState('');
  const { isOnline } = useOnlineStatus();
  const { notifyCompletion } = useNotifications();

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onFinish: (event) => {
      if (!event.isError) {
        const lastMessage = event.message;
        const preview =
          lastMessage?.parts
            ?.filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join(' ') || '';
        void notifyCompletion(preview);
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = input.trim();

    if (!text || isLoading) {
      return;
    }

    if (!isOnline) {
      const queuedMessage: QueuedMessage = { id: generateMessageId(), text };
      await queueMessageOffline(queuedMessage);
      setInput('');
      return;
    }

    setInput('');

    await sendMessage({
      text,
    });
  }

  return (
    <main className="flex h-svh flex-col">
      <OfflineIndicator />
      <div className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col px-4">
        <MessageScrollerProvider>
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="gap-6 py-6">
                {messages.length === 0 ? (
                  <MessageScrollerItem
                    messageId="empty"
                    className="flex min-h-full items-center justify-center"
                  >
                    <Message align="start">
                      <MessageAvatar>
                        <div className="flex size-8 items-center justify-center rounded-full border text-xs font-medium">
                          AI
                        </div>
                      </MessageAvatar>

                      <MessageContent>
                        <Bubble variant="ghost">
                          <BubbleContent>How can I help you today?</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ) : (
                  messages.map((message) => {
                    const isUser = message.role === 'user';

                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={isUser}
                      >
                        <Message align={isUser ? 'end' : 'start'}>
                          {!isUser && (
                            <MessageAvatar>
                              <div className="flex size-8 items-center justify-center rounded-full border text-xs font-medium">
                                AI
                              </div>
                            </MessageAvatar>
                          )}

                          <MessageContent className={isUser ? 'items-end' : 'items-start'}>
                            <Bubble variant={isUser ? 'default' : 'ghost'}>
                              <BubbleContent>
                                {message.parts
                                  .filter((part) => part.type === 'text')
                                  .map((part, index) => (
                                    <span
                                      key={`${message.id}-${index}`}
                                      className="whitespace-pre-wrap"
                                    >
                                      {part.text}
                                    </span>
                                  ))}
                              </BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    );
                  })
                )}

                {isLoading && (
                  <MessageScrollerItem messageId="typing-indicator">
                    <Message>
                      <MessageAvatar>
                        <div className="flex size-8 items-center justify-center rounded-full border text-xs font-medium">
                          AI
                        </div>
                      </MessageAvatar>

                      <MessageContent>
                        <Bubble variant="ghost">
                          <BubbleContent className="flex items-center gap-2 text-muted-foreground">
                            <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                            <span>Thinking...</span>
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}

                {error && (
                  <MessageScrollerItem messageId="error">
                    <Message>
                      <MessageContent>
                        <Bubble variant="destructive">
                          <BubbleContent>{error.message}</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>

            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl shrink-0 py-4">
          {!isOnline && (
            <p className="mb-2 text-center text-xs text-muted-foreground" role="status">
              You&apos;re offline — messages will be sent when the connection returns.
            </p>
          )}
          <InputGroup>
            <InputGroupTextarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();

                  if (!isLoading && input.trim()) {
                    event.currentTarget.form?.requestSubmit();
                  }
                }
              }}
              placeholder="Message your tutor..."
              rows={1}
              disabled={isLoading}
              className="min-h-12 resize-none"
              aria-label="Message"
            />

            <InputGroupButton
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={isLoading}
              aria-label="Attach file"
            >
              <PaperclipIcon />
            </InputGroupButton>

            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              {isLoading ? <LoaderCircleIcon className="animate-spin" /> : <ArrowUpIcon />}
            </InputGroupButton>
          </InputGroup>
        </form>
      </div>
    </main>
  );
}
