'use client';

import { ArrowUpIcon, LoaderCircleIcon, PaperclipIcon } from 'lucide-react';

import { InputGroup, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isHistoryLoading: boolean;
  isOnline: boolean;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  isLoading,
  isHistoryLoading,
  isOnline,
}: ChatComposerProps) {
  const disabled = isLoading || isHistoryLoading;

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!disabled && value.trim()) {
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (!disabled && value.trim()) {
          onSubmit();
        }
      }}
      className="mx-auto w-full max-w-3xl shrink-0 py-4"
    >
      {!isOnline && (
        <p className="mb-2 text-center text-xs text-muted-foreground" role="status">
          You&apos;re offline — messages will be sent when the connection returns.
        </p>
      )}

      <InputGroup className="rounded-4xl">
        <InputGroupTextarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type here..."
          rows={5}
          disabled={disabled}
          className="min-h-12  resize-none max-h-[40svh] no-scrollbar"
          aria-label="Message"
          cols={33}
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
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          className={'mr-2'}
        >
          {isLoading ? <LoaderCircleIcon className="animate-spin" /> : <ArrowUpIcon />}
        </InputGroupButton>
      </InputGroup>
    </form>
  );
}
