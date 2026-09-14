import { convertToModelMessages, stepCountIs } from 'ai';
import type { UIMessage } from 'ai';

import { getAIClient } from '../ai';
import type { AIClient } from '../ai';
import { tools } from './tools';

const MAX_OUTPUT_TOKENS = 1024;

// AI SDK v5+ defaults stopWhen to stepCountIs(1), which runs the first model
// step only — the tool executes but its result is never fed back. Allow up to
// 5 steps so the model can call tools and then produce the final answer.
const MAX_STEPS = 5;

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
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
  });
}
