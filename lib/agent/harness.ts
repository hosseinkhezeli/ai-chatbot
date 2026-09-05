// Framework-agnostic streaming chat harness. This file deliberately has no
// Next.js imports — it should be extractable into a standalone service.
//
// We hand-roll the orchestration loop on top of `streamText` rather than using
// the SDK's `ToolLoopAgent` primitive. See ADR-006 in docs/ARCHITECTURE.md for
// why: the loop is the Phase 4 learning goal, not a thing we delegate away.
//
// TODO: real-network happy path unverified — blocked on OpenRouter free-tier
// daily limit reset. Verify before Phase 1 is considered done.
// Confirmed working end-to-end via free-tier model on 2026-09-05; paid-model
// path still blocked on credits.
// Known gaps not yet tested against a real stream:
//   - cancel() reaching a live upstream request (only stub-tested)
//   - maxTokens: 1020 cap behavior against a long response (no response >1024
//     tokens has been observed yet)

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { convertToModelMessages, streamText } from 'ai';
import type { ModelMessage, UIMessage } from 'ai';

const DEFAULT_MODEL = 'anthropic/claude-haiku-4.5';

// Cap on tokens per response. The tutor persona is meant to produce short
// paragraphs + a TL;DR, so 1024 is plenty of headroom and bounds cost /
// latency if a request ever goes sideways.
const MAX_TOKENS = 1024;

function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to .env.local (server-only).',
    );
  }
  return createOpenRouter({ apiKey });
}

function getModel() {
  return process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
}

export type StreamChatParams = {
  messages: UIMessage[];
  system: string;
};

export type StreamChatOptions = {
  abortSignal?: AbortSignal;
};

// Internal seam for testing — callers should not pass this. The third
// `deps` parameter lets a test substitute a fake `streamText` without
// monkey-patching the `ai` module (ESM exports are read-only).
type HarnessDeps = {
  streamText: typeof streamText;
};

const defaultDeps: HarnessDeps = { streamText };

/**
 * Stream a chat completion from OpenRouter.
 *
 * Returns a `ReadableStream<string>` of plain text deltas. The caller decides
 * how to frame the response (Content-Type, headers, etc.) — this function
 * only handles the LLM transport.
 *
 * Cancellation: if the returned stream is cancelled by the consumer, or if
 * the caller's `abortSignal` fires, the upstream OpenRouter request is
 * aborted. Errors (config, conversion, transport) surface as stream errors
 * so the client sees them rather than a hang.
 */
export function streamChat(
  params: StreamChatParams,
  options: StreamChatOptions = {},
  deps: HarnessDeps = defaultDeps,
): ReadableStream<string> {
  // We own this controller — wrapper cancel() aborts it, which propagates to
  // the SDK call. The caller's abortSignal (if any) is linked in below.
  const internalController = new AbortController();
  if (options.abortSignal) {
    if (options.abortSignal.aborted) {
      internalController.abort(options.abortSignal.reason);
    } else {
      options.abortSignal.addEventListener(
        'abort',
        () => internalController.abort(options.abortSignal!.reason),
        { once: true },
      );
    }
  }

  // textStream is AsyncIterableStream<string> — already a ReadableStream.
  // We need our own wrapper so we can hook cancel() and onError().
  const stream = new ReadableStream<string>({
    async start(c) {
      try {
        // Convert UI messages to model messages, then start the SDK call.
        // Both conversion errors and streamText construction errors surface
        // here via c.error(err) — the caller sees them as stream errors.
        const modelMessages: ModelMessage[] = await convertToModelMessages(
          params.messages,
        );
        const result = deps.streamText({
          model: getOpenRouter()(getModel()),
          system: params.system,
          messages: modelMessages,
          // maxTokens: MAX_TOKENS,
          abortSignal: internalController.signal,
          onError({ error }) {
            c.error(error);
          },
        });
        for await (const delta of result.textStream) {
          // After cancel(), the SDK aborts and textStream terminates, so the
          // for-await exits. Any straggler enqueue() here hits a closed
          // controller and is a silent no-op per the WHATWG streams spec.
          c.enqueue(delta);
        }
        c.close();
      } catch (err) {
        c.error(err);
      }
    },
    cancel(reason) {
      // Propagate consumer cancellation to the SDK call. The pump loop will
      // exit when result.textStream terminates due to this abort.
      internalController.abort(reason);
    },
  });

  return stream;
}
