'use client';

import { Search } from 'lucide-react';

interface ConversationSearchProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ConversationSearch({ value, onChange, disabled = false }: ConversationSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search..."
        disabled={disabled}
        className="w-full rounded-md border border-border/50 bg-background/50 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring transition-all"
      />
    </div>
  );
}
