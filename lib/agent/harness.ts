import { convertToModelMessages, stepCountIs } from 'ai';

import type { UIMessage } from 'ai';

import { getAIClient } from '../ai';
import type { AIClient } from '../ai';

import { buildSystemPrompt } from './systemPrompt';
import type { HarnessRuntimeContext } from './context';

import { createTools } from './tools/definitions';

const MAX_OUTPUT_TOKENS = 1024;
const MAX_STEPS = 5;

export type StreamChatParams = {
  userId: string;
  messages: UIMessage[];
  abortSignal?: AbortSignal;

  /**
   * Optional additional application instructions.
   * Core harness behavior always comes from buildSystemPrompt().
   */
  system?: string;

  /**
   * Runtime context supplied by the application.
   *
   * This is intentionally optional until memory, thread retrieval,
   * and conversation summarization are wired into the application.
   */
  context?: HarnessRuntimeContext;
};

export async function streamChat(
  { userId, messages, abortSignal, system, context }: StreamChatParams,
  client: AIClient = getAIClient(),
) {
  const modelMessages = await convertToModelMessages(messages);

  const baseSystemPrompt = buildSystemPrompt(context);

  const systemPrompt = system?.trim()
    ? `${baseSystemPrompt}\n\n## Additional Application Instructions\n${system.trim()}`
    : baseSystemPrompt;
  const tools = createTools(userId);
  return client.streamText({
    model: 'chat',
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal,
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
  });
}
