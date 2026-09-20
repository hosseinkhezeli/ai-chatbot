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

import { fa } from '@/lib/i18n/fa';

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

        <span>{fa.chat.loadingHistory}</span>
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
          {fa.chat.retry}
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
            <BubbleContent>{fa.chat.emptyPrompt}</BubbleContent>
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
      <Message align={!isUser ? 'end' : 'start'}>
        <MessageContent className={!isUser ? 'items-end' : 'items-start'}>
          <Bubble variant={isUser ? 'default' : 'ghost'}>
            <BubbleContent>
              {message.parts
                .filter((part) => part.type === 'text')
                .map((part, index) => (
                  /* dir="auto" lets the browser resolve bidi from the content's
                     first strong character — a Persian sentence stays RTL, an
                     English/code snippet stays LTR, inside the same RTL bubble. */
                  <span
                    key={`${message.id}-${index}`}
                    dir="auto"
                    className="block whitespace-pre-wrap"
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

              <span>{fa.chat.thinking}</span>
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

function MessageError() {
  /* error.message can carry raw technical detail (provider errors, stack-like
     text) — users get a clean Persian message instead; the original error is
     still logged client-side via the AI SDK and server-side in the route. */
  return (
    <MessageScrollerItem messageId="message-error">
      <Message>
        <MessageContent>
          <Bubble variant="destructive">
            <BubbleContent dir="auto">{fa.errors.chatFailed}</BubbleContent>
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
        <MessageScrollerViewport className="no-scrollbar!">
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

            {error && <MessageError />}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
