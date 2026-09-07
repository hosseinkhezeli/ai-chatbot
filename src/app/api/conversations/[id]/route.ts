// src/app/api/conversations/[id]/route.ts
import { getRequiredCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/db/client';
import { conversations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
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

    return Response.json({ conversation });
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