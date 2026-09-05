import { streamChat } from '@agent/harness';
import { buildSystemPrompt } from '@agent/systemPrompt';
import type { UIMessage } from 'ai';

// Route Handlers are uncached by default for POST. We still set explicit
// headers to defeat intermediate proxy buffering (nginx et al.) and prevent
// transparent transcoding, both of which would break token-by-token streaming.
const STREAM_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
};

// Node runtime: the AI SDK + OpenRouter provider require Node 22+ (per
// @openrouter/ai-sdk-provider README). Edge would be faster for streaming
// latency but isn't supported by the current provider build.
export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json(
      { error: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }

  // Minimal structural validation. Phase 5 will replace this with a real
  // schema (Zod or similar) — for now we just need to reject obviously
  // malformed payloads before handing them to the harness.
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('messages' in raw) ||
    !Array.isArray((raw as { messages: unknown }).messages)
  ) {
    return Response.json(
      { error: 'Request body must include a messages array' },
      { status: 400 },
    );
  }

  // Trusted-boundary cast: at this point messages is `unknown[]`. We don't
  // validate each element's shape here — useChat's UIMessage is a
  // discriminated union and per-element validation is Phase 5 scope. The
  // harness's convertToModelMessages will throw on genuinely malformed input
  // and surface it as a stream error.
  const messages = (raw as { messages: UIMessage[] }).messages;

  const stream = streamChat({
    messages,
    system: buildSystemPrompt(),
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}
