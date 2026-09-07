// src/app/api/conversations/route.ts
import { getRequiredCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/db/client';
import { conversations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';

function isValidTitle(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 500;
}

export async function GET(): Promise<Response> {
  try {
    const user = await getRequiredCurrentUser();
    const userConversations = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.updatedAt));

    return Response.json({ conversations: userConversations });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const title = (body as Record<string, unknown>).title;
  if (title !== undefined && !isValidTitle(title)) {
    return Response.json({ error: 'Title must be a non-empty string up to 500 characters' }, { status: 400 });
  }

  try {
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: user.id,
        title: title ?? null,
        systemPromptVersion: 'v1',
      })
      .returning({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      });

    return Response.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}