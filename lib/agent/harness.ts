import { convertToModelMessages, stepCountIs } from 'ai';

import type { UIMessage } from 'ai';

import { getAIClient } from '../ai';
import type { AIClient, AIStreamTextResult } from '../ai';

import { buildSystemPrompt } from './systemPrompt';
import type { HarnessRuntimeContext } from './context';

import { createTools } from './tools/definitions';
import { withRetry, isRetryableError, MAX_ATTEMPTS } from './retry';

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

/**
 * Error thrown when all retry attempts are exhausted.
 * Contains the last error and indicates the failure is final.
 */
export class StreamChatExhaustedError extends Error {
  public readonly attempts: number;
  public readonly lastError: unknown;

  constructor(lastError: unknown, attempts: number) {
    super(`Stream chat failed after ${attempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    this.name = 'StreamChatExhaustedError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

export async function streamChat(
  { userId, messages, abortSignal, system, context }: StreamChatParams,
  client: AIClient = getAIClient(),
): Promise<AIStreamTextResult> {
  const modelMessages = await convertToModelMessages(messages);

  const baseSystemPrompt = buildSystemPrompt(context);

  const systemPrompt = system?.trim()
    ? `${baseSystemPrompt}\n\n## Additional Application Instructions\n${system.trim()}`
    : baseSystemPrompt;
  const tools = createTools(userId);

  return withRetry(
    async (attempt) => {
      if (attempt > 0) {
        console.log(`[streamChat] Retry attempt ${attempt}/${MAX_ATTEMPTS - 1} for user ${userId}`);
      }

      return client.streamText({
        model: 'chat',
        system: systemPrompt,
        messages: modelMessages,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal,
        tools,
        stopWhen: stepCountIs(MAX_STEPS),
      });
    },
    {
      maxAttempts: MAX_ATTEMPTS,
      isRetryable: (error) => {
        // Never retry if the request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return false;
        }
        // Check if the abort signal was triggered
        if (abortSignal?.aborted) {
          return false;
        }
        return isRetryableError(error);
      },
      onRetry: (error, attempt, delayMs) => {
        console.log(`[streamChat] Transient error on attempt ${attempt}, retrying in ${delayMs}ms:`, error instanceof Error ? error.message : String(error));
      },
    },
  );
}
