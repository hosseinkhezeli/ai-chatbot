// src/app/api/chat/route.ts

import { createUIMessageStreamResponse, toUIMessageStream } from 'ai';
import type { UIMessage } from 'ai';
import { and, eq } from 'drizzle-orm';

import { streamChat } from '@agent/harness';
import { getRequiredCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/db/client';
import { conversations, messages, toolCalls } from '@/db/schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ChatRequestBody = {
  messages: UIMessage[];
  conversationId?: string;
};

function isChatRequestBody(value: unknown): value is ChatRequestBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const body = value as Record<string, unknown>;

  return Array.isArray(body.messages);
}

function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: Request): Promise<Response> {
  let user;

  try {
    user = await getRequiredCurrentUser();
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  if (!isChatRequestBody(body)) {
    return Response.json({ error: 'Request body must include a messages array' }, { status: 400 });
  }

  const { messages: uiMessages, conversationId } = body;

  if (uiMessages.length === 0) {
    return Response.json({ error: 'Messages array cannot be empty' }, { status: 400 });
  }

  const lastMessage = uiMessages.at(-1);

  if (!lastMessage || lastMessage.role !== 'user') {
    return Response.json({ error: 'Last message must be from user' }, { status: 400 });
  }

  let conversationIdFinal: string;

  try {
    if (conversationId !== undefined) {
      if (!isValidUuid(conversationId)) {
        return Response.json({ error: 'Invalid conversation ID' }, { status: 400 });
      }

      const [conversation] = await db
        .select({
          id: conversations.id,
        })
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)))
        .limit(1);

      if (!conversation) {
        return Response.json({ error: 'Conversation not found' }, { status: 404 });
      }

      conversationIdFinal = conversation.id;
    } else {
      const [conversation] = await db
        .insert(conversations)
        .values({
          userId: user.id,
          title: null,
          systemPromptVersion: 'v1',
        })
        .returning({
          id: conversations.id,
        });

      conversationIdFinal = conversation.id;
    }

    await db.insert(messages).values({
      conversationId: conversationIdFinal,
      role: 'user',
      content: lastMessage.parts,
    });
  } catch (error) {
    console.error('Failed to persist user message:', error);

    return Response.json({ error: 'Failed to persist message' }, { status: 500 });
  }

  try {
    const result = await streamChat({
      messages: uiMessages,
      abortSignal: req.signal,
    });

    const stream = toUIMessageStream({
      stream: result.stream,
      originalMessages: uiMessages,

      onFinish: async ({ responseMessage, isAborted, finishReason }) => {
        if (isAborted || finishReason === 'error') {
          return;
        }

        if (responseMessage.parts.length === 0) {
          return;
        }

        const hasText = responseMessage.parts.some(
          (part) => part.type === 'text' && part.text.trim().length > 0,
        );

        if (!hasText) {
          return;
        }

        try {
          const [assistantMessage] = await db
            .insert(messages)
            .values({
              conversationId: conversationIdFinal,
              role: 'assistant',
              content: responseMessage.parts,
            })
            .returning({ id: messages.id });

          // Persist each tool invocation made during this assistant turn so the
          // agent's reasoning is reproducible (Phase 4.1). Tool parts arrive as
          // `tool-{name}` UIMessage parts with input/output state.
          const toolPartRows = responseMessage.parts
            .filter((part) => part.type.startsWith('tool-'))
            .map((part) => {
              const toolName = part.type.replace(/^tool-/, '');
              const state = (part as { state?: string }).state;
              const output = (part as { output?: unknown }).output ?? null;
              const errorText = (part as { errorText?: string }).errorText ?? null;
              const status = state === 'output-error' || errorText ? 'error' : 'success';

              return {
                messageId: assistantMessage.id,
                toolName,
                input: (part as { input?: unknown }).input ?? null,
                output: output ?? errorText,
                status,
              };
            });

          if (toolPartRows.length > 0) {
            await db.insert(toolCalls).values(toolPartRows);
          }

          await db
            .update(conversations)
            .set({
              updatedAt: new Date(),
            })
            .where(
              and(eq(conversations.id, conversationIdFinal), eq(conversations.userId, user.id)),
            );
        } catch (error) {
          console.error('Failed to persist assistant message:', error);
        }
      },

      onError: (error) => {
        console.error('UI message stream error:', error);

        return 'An error occurred while generating the response.';
      },
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error) {
    console.error('Chat request failed:', error);

    return Response.json({ error: 'Failed to generate chat response' }, { status: 500 });
  }
}
