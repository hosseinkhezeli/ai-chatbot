import type { Conversation } from './conversations.types';
import { fa } from '@/lib/i18n/fa';

export interface ConversationGroup {
  group: string;
  items: Conversation[];
}

function isSameDay(dateA: Date, dateB: Date) {
  return dateA.toDateString() === dateB.toDateString();
}

/*
 * Intl's 'fa-IR-u-ca-persian' extension asks V8/ICU (bundled with every modern
 * browser) to render the date on the Persian (Jalali) calendar with Persian
 * digits and month names — no external calendar library, which the task
 * explicitly rules out unless genuinely needed. Presentation-layer only:
 * `dateString` itself (and the DB column behind it) stays an ISO timestamp.
 */
const persianDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export function getConversationGroupLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const previousSevenDays = new Date(today);
  previousSevenDays.setDate(today.getDate() - 7);

  if (isSameDay(date, today)) {
    return fa.groups.today;
  }

  if (isSameDay(date, yesterday)) {
    return fa.groups.yesterday;
  }

  if (date > previousSevenDays) {
    return fa.groups.previous7Days;
  }

  return persianDateFormatter.format(date);
}

export function groupConversations(conversations: Conversation[]): ConversationGroup[] {
  const groups = new Map<string, Conversation[]>();

  for (const conversation of conversations) {
    const group = getConversationGroupLabel(conversation.updatedAt);

    const items = groups.get(group);

    if (items) {
      items.push(conversation);
    } else {
      groups.set(group, [conversation]);
    }
  }

  return Array.from(groups.entries()).map(([group, items]) => ({
    group,
    items,
  }));
}
