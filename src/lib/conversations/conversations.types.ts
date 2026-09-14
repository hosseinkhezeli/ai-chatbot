export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface ConversationResponse {
  conversation: Conversation;
}
