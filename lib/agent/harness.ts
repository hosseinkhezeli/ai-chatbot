import { convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';

import { getAIClient } from '../ai';
import type { AIClient } from '../ai';

const MAX_OUTPUT_TOKENS = 1024;

export type StreamChatParams = {
  messages: UIMessage[];
  system: string;
  abortSignal?: AbortSignal;
};

export async function streamChat(
  { messages, system, abortSignal }: StreamChatParams,
  client: AIClient = getAIClient(),
) {
  const modelMessages = await convertToModelMessages(messages);

  return client.streamText({
    model: 'chat',
    system,
    messages: modelMessages,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal,
  });
}
