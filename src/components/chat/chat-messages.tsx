'use client';

import { useRef, useState } from 'react';
import type { UIMessage } from 'ai';
import { Check, Copy, Edit, LoaderCircleIcon, RotateCcw, XCircle } from 'lucide-react';

import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Message, MessageContent } from '@/components/ui/message';

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';

import { TypewriterText } from './typewriter-text';

import { fa } from '@/lib/i18n/fa';
import { cn } from 'cn';

interface FailedTurn {
  userMessageId: string;
  userMessageText: string;
  error: Error;
  retryable: boolean;
  attempts: number;
}

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  historyError: string | null;
  error: Error | undefined;
  onRetryHistory: () => void;
  failedTurn: FailedTurn | null;
  onRetry: () => void;
  onEdit: () => void;
  onRegenerate: (messageId: string) => void;
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
    <MessageScrollerItem
      messageId="empty"
      className="flex min-h-svh items-center justify-center pb-16"
    >
      <h1 dir="auto" className="text-center text-3xl font-semibold tracking-tight text-foreground">
        {fa.chat.emptyPrompt}
      </h1>
    </MessageScrollerItem>
  );
}

interface ChatMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  isLastMessage: boolean;
  onRegenerate: (messageId: string) => void;
}

function ChatMessage({ message, isStreaming, isLastMessage, onRegenerate }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const text = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');

  const shouldTypewriter = isStreaming && isLastMessage && isAssistant;

  const handleCopy = async () => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // Clipboard access can fail in restricted/browser environments.
    }
  };

  const startLongPress = (event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') return;

    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const cancelLongPress = () => {
    if (!longPressTimer.current) return;

    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const showActionRow = Boolean(text) && (!isAssistant || !isStreaming);

  return (
    <MessageScrollerItem
      messageId={message.id}
      scrollAnchor={isUser}
      className="group"
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerLeave={cancelLongPress}
    >
      <Message align="start">
        <MessageContent className="items-start">
          <Bubble variant={isUser ? 'default' : 'ghost'}>
            <BubbleContent>
              {message.parts
                .filter((part) => part.type === 'text')
                .map((part, index) =>
                  shouldTypewriter ? (
                    <TypewriterText
                      key={`${message.id}-${index}`}
                      text={part.text}
                      isStreaming={true}
                    />
                  ) : (
                    <span
                      key={`${message.id}-${index}`}
                      dir="auto"
                      className="block whitespace-pre-wrap"
                    >
                      {part.text}
                    </span>
                  ),
                )}
            </BubbleContent>
          </Bubble>

          {showActionRow && (
            <div
              className={[
                'flex items-center gap-1 transition-opacity duration-150',
                isUser ? 'justify-end' : 'justify-start',
                'opacity-0 pointer-events-none',
                'group-hover:pointer-events-auto group-hover:opacity-100',
                'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
                showActions && 'pointer-events-auto opacity-100',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy message'}
                title={copied ? 'Copied' : 'Copy message'}
              >
                {copied ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
              </Button>

              {/* {isAssistant && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => onRegenerate(message.id)}
                  aria-label="Regenerate response"
                  title="Regenerate response"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </Button>
              )} */}
            </div>
          )}
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

function ThinkingIndicator() {
  return (
    <MessageScrollerItem messageId="typing-indicator">
      <Message align="end">
        <MessageContent>
          <Bubble variant="ghost" className="flex flex-row items-center">
            <BubbleContent className="shimmer flex items-center gap-2 text-muted-foreground">
              <span>{fa.chat.thinking}</span>
            </BubbleContent>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 14 32 4"
              fill="currentColor"
              preserveAspectRatio="none"
              className="h-2 w-16"
            >
              <path opacity="0.8" transform="translate(0 0)" d="M2 14 V18 H6 V14z">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 0; 24 0; 0 0"
                  dur="2s"
                  begin="0"
                  repeatCount="indefinite"
                  keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
                  calcMode="spline"
                />
              </path>

              <path opacity="0.5" transform="translate(0 0)" d="M0 14 V18 H8 V14z">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 0; 24 0; 0 0"
                  dur="2s"
                  begin="0.1s"
                  repeatCount="indefinite"
                  keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
                  calcMode="spline"
                />
              </path>

              <path opacity="0.25" transform="translate(0 0)" d="M0 14 V18 H8 V14z">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 0; 24 0; 0 0"
                  dur="2s"
                  begin="0.2s"
                  repeatCount="indefinite"
                  keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
                  calcMode="spline"
                />
              </path>
            </svg>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

function MessageError() {
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

function FailedTurnError({
  onRetry,
  onEdit,
  retryable,
}: {
  onRetry: () => void;
  onEdit: () => void;
  retryable: boolean;
}) {
  return (
    <MessageScrollerItem messageId="failed-turn-error">
      <Message>
        <MessageContent>
          <Bubble variant="destructive">
            <BubbleContent dir="auto" className="flex flex-col gap-3">
              <span>{fa.chat.regenerationFailed}</span>

              <div className="flex items-center gap-2">
                {retryable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    aria-label={fa.chat.retryAriaLabel}
                    className="gap-1.5"
                  >
                    <RotateCcw className="size-4" />
                    {fa.chat.retryAction}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  aria-label={fa.chat.editAriaLabel}
                  className="gap-1.5"
                >
                  <Edit className="size-4" />
                  {fa.chat.editAction}
                </Button>
              </div>
            </BubbleContent>
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
  failedTurn,
  onRetry,
  onEdit,
  onRegenerate,
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
              messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isLoading}
                  isLastMessage={isLoading && index === messages.length - 1}
                  onRegenerate={onRegenerate}
                />
              ))
            )}

            {isLoading && <ThinkingIndicator />}

            {failedTurn ? (
              <FailedTurnError onRetry={onRetry} onEdit={onEdit} retryable={failedTurn.retryable} />
            ) : error ? (
              <MessageError />
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
