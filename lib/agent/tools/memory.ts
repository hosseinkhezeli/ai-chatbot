import { tool } from 'ai';
import { z } from 'zod';

import {
  saveMemory,
  searchMemories,
  type MemorySensitivity,
  type MemorySource,
  type MemoryType,
} from '../memory';

const saveMemorySchema = z.object({
  type: z
    .enum([
      'profile',
      'preference',
      'fact',
      'relationship',
      'event',
      'goal',
      'thread',
      'commitment',
      'interaction_pattern',
    ])
    .describe('Category of the memory.'),

  key: z
    .string()
    .min(1)
    .max(100)
    .describe(
      'Stable semantic key for retrieval, e.g. "birthdate", "favorite_language", "partner_name".',
    ),

  content: z
    .string()
    .min(1)
    .max(1000)
    .describe('The information to remember. Preserve the user-provided value accurately.'),

  source: z.enum(['explicit', 'conversation', 'inferred', 'tool']).default('explicit'),

  confidence: z.number().int().min(0).max(100).default(100),

  sensitivity: z.enum(['normal', 'sensitive', 'high']).default('normal'),
});

const searchMemorySchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Semantic memory topic to search for, e.g. "birthdate", "partner", "favorite language".',
    ),

  limit: z.number().int().min(1).max(10).optional(),
});

export function createMemoryTools(userId: string) {
  return {
    saveMemory: tool({
      description:
        'Store a persistent user memory. Use this when the user explicitly asks you to remember something, or when the application explicitly permits persistent memory creation.',

      inputSchema: saveMemorySchema,

      execute: async (params) => {
        try {
          const result = await saveMemory({
            userId,
            type: params.type as MemoryType,
            key: params.key,
            content: params.content,
            source: params.source as MemorySource,
            confidence: params.confidence,
            sensitivity: params.sensitivity as MemorySensitivity,
          });

          return {
            success: true,
            action: result.action,
            memory: result.memory,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to store memory.',
          };
        }
      },
    }),

    searchMemory: tool({
      description:
        'Search the current user’s persistent memory. Use this before claiming that you do not know a personal fact that may have been remembered previously.',

      inputSchema: searchMemorySchema,

      execute: async ({ query, limit = 5 }) => {
        try {
          const results = await searchMemories(userId, query, limit);

          return {
            success: true,
            results,
          };
        } catch {
          return {
            success: false,
            error: 'Failed to search memory.',
            results: [],
          };
        }
      },
    }),
  };
}
