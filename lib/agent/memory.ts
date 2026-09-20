import { and, desc, eq, ilike, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { memories, type memorySourceEnum, type memoryTypeEnum } from '@/db/schema';

export type MemoryType =
  | 'profile'
  | 'preference'
  | 'fact'
  | 'relationship'
  | 'event'
  | 'goal'
  | 'thread'
  | 'commitment'
  | 'interaction_pattern';

export type MemorySource = 'explicit' | 'conversation' | 'inferred' | 'tool';

export type MemorySensitivity = 'normal' | 'sensitive' | 'high';

export type SaveMemoryParams = {
  userId: string;
  type: MemoryType;
  key: string;
  content: string;
  source?: MemorySource;
  confidence?: number;
  sensitivity?: MemorySensitivity;
};

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export async function saveMemory({
  userId,
  type,
  key,
  content,
  source = 'explicit',
  confidence = 100,
  sensitivity = 'normal',
}: SaveMemoryParams) {
  const normalizedKey = key.trim().toLowerCase();
  const normalizedContent = content.trim();

  if (!normalizedKey) {
    throw new Error('Memory key cannot be empty.');
  }

  if (!normalizedContent) {
    throw new Error('Memory content cannot be empty.');
  }

  if (sensitivity === 'high') {
    throw new Error('High-sensitivity memories are not supported yet.');
  }

  const existing = await db
    .select({
      id: memories.id,
    })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.key, normalizedKey),
        eq(memories.content, normalizedContent),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(memories)
      .set({
        updatedAt: new Date(),
        lastConfirmedAt: source === 'explicit' ? new Date() : undefined,
      })
      .where(eq(memories.id, existing[0].id))
      .returning();

    return {
      action: 'already_exists' as const,
      memory: updated,
    };
  }

  const [memory] = await db
    .insert(memories)
    .values({
      userId,
      type,
      key: normalizedKey,
      content: normalizedContent,
      source,
      confidence: Math.min(100, Math.max(0, confidence)),
      sensitivity,
      lastConfirmedAt: source === 'explicit' ? new Date() : null,
    })
    .returning();

  return {
    action: 'stored' as const,
    memory,
  };
}

export async function searchMemories(userId: string, query: string, limit = 5) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const searchPattern = `%${escapeIlike(normalizedQuery)}%`;

  return db
    .select({
      id: memories.id,
      type: memories.type,
      key: memories.key,
      content: memories.content,
      source: memories.source,
      confidence: memories.confidence,
      sensitivity: memories.sensitivity,
      createdAt: memories.createdAt,
      updatedAt: memories.updatedAt,
      lastConfirmedAt: memories.lastConfirmedAt,
    })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        or(ilike(memories.key, searchPattern), ilike(memories.content, searchPattern)),
      ),
    )
    .orderBy(desc(memories.updatedAt))
    .limit(Math.min(Math.max(limit, 1), 10));
}
