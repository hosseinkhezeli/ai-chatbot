// src/app/api/conversations/[id]/route.ts
import { getRequiredCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/db/client';
import { conversations, messages } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const runtime = 'nodejs';

function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function isValidTitle(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 500;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const user = await getRequiredCurrentUser();
    const { id } = await params;

    if (!isValidUuid(id)) {
      return Response.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const [conversation] = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        systemPromptVersion: conversations.systemPromptVersion,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
      .limit(1);

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Messages are owned by their conversation, and the conversation is already
    // proven to belong to this user — so no per-message ownership check is needed.
    const messageRows = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(asc(messages.createdAt));

    return Response.json({ conversation, messages: messageRows });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const user = await getRequiredCurrentUser();
    const { id } = await params;

    if (!isValidUuid(id)) {
      return Response.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const result = await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
      .returning({ id: conversations.id });

    if (result.length === 0) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const user = await getRequiredCurrentUser();
    const { id } = await params;

    if (!isValidUuid(id)) {
      return Response.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
      return Response.json({ error: 'Request body must be an object' }, { status: 400 });
    }

    const title = (body as Record<string, unknown>).title;
    if (title !== undefined && title !== null && !isValidTitle(title)) {
      return Response.json({ error: 'Title must be a non-empty string up to 500 characters' }, { status: 400 });
    }

    const result = await db
      .update(conversations)
      .set({ title: title ?? null, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
      .returning({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      });

    if (result.length === 0) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json({ conversation: result[0] });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}