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

export function Chat() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = input.trim();

    if (!text || isLoading) {
      return;
    }

    setInput('');

    await sendMessage({
      text,
    });
  }

  return (
    <main className="flex h-svh flex-col">
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
