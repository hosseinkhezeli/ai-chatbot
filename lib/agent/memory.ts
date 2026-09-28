import { and, desc, eq, ilike, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { memories } from '@/db/schema';

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
  source: MemorySource;
  confidence?: number;
  sensitivity?: MemorySensitivity;
};

const DEFAULT_CONFIDENCE_BY_SOURCE: Record<MemorySource, number> = {
  explicit: 100,
  tool: 90,
  conversation: 70,
  inferred: 50,
};

const PROTECTED_USER_IDENTITY_KEYS = new Set([
  'name',
  'user_name',
  'display_name',
  'preferred_name',
]);

const FORBIDDEN_ASSISTANT_MEMORY_KEYS = new Set([
  'assistant_name',
  'assistant_identity',
  'assistant_model',
  'assistant_provider',
]);

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function normalizeContent(content: string): string {
  return content.trim();
}

function validateMemory({
  type,
  key,
  source,
  confidence,
  sensitivity,
}: {
  type: MemoryType;
  key: string;
  source: MemorySource;
  confidence: number;
  sensitivity: MemorySensitivity;
}) {
  if (sensitivity === 'high') {
    throw new Error('High-sensitivity memories are not supported yet.');
  }

  if (FORBIDDEN_ASSISTANT_MEMORY_KEYS.has(key)) {
    throw new Error(`Assistant identity cannot be stored as user memory: "${key}".`);
  }

  if (type === 'profile' && PROTECTED_USER_IDENTITY_KEYS.has(key) && source !== 'explicit') {
    throw new Error(`User identity memory "${key}" requires an explicit source.`);
  }

  if (source === 'inferred' && confidence > 79) {
    throw new Error(
      'Inferred memories cannot have high confidence. Explicit confirmation is required.',
    );
  }

  if (confidence < 0 || confidence > 100) {
    throw new Error('Memory confidence must be between 0 and 100.');
  }
}

export async function saveMemory({
  userId,
  type,
  key,
  content,
  source,
  confidence = DEFAULT_CONFIDENCE_BY_SOURCE[source],
  sensitivity = 'normal',
}: SaveMemoryParams) {
  const normalizedKey = normalizeKey(key);
  const normalizedContent = normalizeContent(content);

  if (!normalizedKey) {
    throw new Error('Memory key cannot be empty.');
  }

  if (!normalizedContent) {
    throw new Error('Memory content cannot be empty.');
  }

  const normalizedConfidence = Math.min(100, Math.max(0, confidence));

  validateMemory({
    type,
    key: normalizedKey,
    source,
    confidence: normalizedConfidence,
    sensitivity,
  });

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
    const isExplicitConfirmation = source === 'explicit';

    const [updated] = await db
      .update(memories)
      .set({
        type,
        source: isExplicitConfirmation ? 'explicit' : source,
        confidence: isExplicitConfirmation ? 100 : normalizedConfidence,
        sensitivity,
        updatedAt: new Date(),
        lastConfirmedAt: isExplicitConfirmation ? new Date() : undefined,
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
      confidence: normalizedConfidence,
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
