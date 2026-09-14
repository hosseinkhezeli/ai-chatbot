'use client';

import { Search } from 'lucide-react';

import { fa } from '@/lib/i18n/fa';

interface ConversationSearchProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ConversationSearch({ value, onChange, disabled = false }: ConversationSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute start-2.5 top-2 h-4 w-4 text-muted-foreground" />

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={fa.sidebar.searchPlaceholder}
        aria-label={fa.sidebar.searchPlaceholder}
        disabled={disabled}
        className="w-full rounded-md border border-border/50 bg-background/50 py-1.5 pe-3 ps-8 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring transition-all"
      />
    </div>
  );
}
