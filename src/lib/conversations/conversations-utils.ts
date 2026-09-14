import type { Conversation } from './conversations.types';

export interface ConversationGroup {
  group: string;
  items: Conversation[];
}

function isSameDay(dateA: Date, dateB: Date) {
  return dateA.toDateString() === dateB.toDateString();
}

export function getConversationGroupLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const previousSevenDays = new Date(today);
  previousSevenDays.setDate(today.getDate() - 7);

  if (isSameDay(date, today)) {
    return 'Today';
  }

  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }

  if (date > previousSevenDays) {
    return 'Previous 7 Days';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
