import { fa } from '@/lib/i18n/fa';

import type {
  Conversation,
  ConversationsResponse,
  ConversationResponse,
} from './conversations.types';

export async function getConversations(query = ''): Promise<Conversation[]> {
  const url = new URL('/api/conversations', window.location.origin);

  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    url.searchParams.set('q', trimmedQuery);
  }

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(fa.errors.unauthorized);
    }

    throw new Error(fa.errors.loadConversations);
  }

  const data: ConversationsResponse = await response.json();

  return data.conversations ?? [];
}

export async function createConversation(): Promise<Conversation> {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(fa.errors.createConversation);
  }

  const data: ConversationResponse = await response.json();

  return data.conversation;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(fa.errors.deleteConversation);
  }
}

export async function renameConversation(
  conversationId: string,
  title: string,
): Promise<Conversation> {
  const response = await fetch(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(fa.errors.renameConversation);
  }

  const data: ConversationResponse = await response.json();

  return data.conversation;
}

export async function getConversation(
  conversationId: string | null,
  signal?: AbortSignal,
): Promise<Conversation> {
  if (conversationId === null) {
    throw new Error(fa.errors.loadHistory);
  }

  const response = await fetch(`/api/conversations/${conversationId}`, { signal });

  if (response.status === 404) {
    // use-active-conversation checks `error.name` to detect a deleted/invalid
    // conversation — `name`, not `message`, is what identifies this case.
    const error = new Error(fa.errors.loadHistory);
    error.name = 'NotFoundError';

    throw error;
  }

  if (!response.ok) {
    throw new Error(fa.errors.loadHistory);
  }

  const data: {
    conversation: Conversation;
  } = await response.json();

  return data.conversation;
}
