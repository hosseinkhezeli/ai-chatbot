'use client';

import type { ChatStatus, UIMessage } from 'ai';
import { LoaderCircleIcon, XCircle } from 'lucide-react';

import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  historyError: string | null;
  error: Error | undefined;
  onRetryHistory: () => void;
}

function AiAvatar() {
  return (
    <div className="flex size-8 items-center justify-center rounded-full border text-xs font-medium">
      AI
    </div>
  );
}

function LoadingState() {
  return (
    <MessageScrollerItem
      messageId="history-loading"
      className="flex min-h-full items-center justify-center"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />

        <span>Loading conversation...</span>
      </div>
    </MessageScrollerItem>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <MessageScrollerItem
      messageId="history-error"
      className="flex min-h-full items-center justify-center"
    >
      <div className="text-center text-sm text-destructive">
        <XCircle className="mx-auto mb-2 h-6 w-6" />

        <p>{message}</p>

        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </MessageScrollerItem>
  );
}

function EmptyState() {
  return (
    <MessageScrollerItem messageId="empty" className="flex min-h-full items-center justify-center">
      <Message align="start">
        <MessageAvatar>
          <AiAvatar />
        </MessageAvatar>

        <MessageContent>
          <Bubble variant="ghost">
            <BubbleContent>How can I help you today?</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  return (
    <MessageScrollerItem messageId={message.id} scrollAnchor={isUser}>
      <Message align={isUser ? 'end' : 'start'}>
        {!isUser && (
          <MessageAvatar>
            <AiAvatar />
          </MessageAvatar>
        )}

        <MessageContent className={isUser ? 'items-end' : 'items-start'}>
          <Bubble variant={isUser ? 'default' : 'ghost'}>
            <BubbleContent>
              {message.parts
                .filter((part) => part.type === 'text')
                .map((part, index) => (
                  <span key={`${message.id}-${index}`} className="whitespace-pre-wrap">
                    {part.text}
                  </span>
                ))}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

function ThinkingIndicator() {
  return (
    <MessageScrollerItem messageId="typing-indicator">
      <Message>
        <MessageAvatar>
          <AiAvatar />
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
  );
}

function MessageError({ error }: { error: Error }) {
  return (
    <MessageScrollerItem messageId="message-error">
      <Message>
        <MessageContent>
          <Bubble variant="destructive">
            <BubbleContent>{error.message}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

export function ChatMessages({
  messages,
  isLoading,
  isHistoryLoading,
  historyError,
  error,
  onRetryHistory,
}: ChatMessagesProps) {
  return (
    <MessageScrollerProvider>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-6 py-6">
            {isHistoryLoading ? (
              <LoadingState />
            ) : historyError ? (
              <ErrorState message={historyError} onRetry={onRetryHistory} />
            ) : messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map((message) => <ChatMessage key={message.id} message={message} />)
            )}

            {isLoading && <ThinkingIndicator />}

            {error && <MessageError error={error} />}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
