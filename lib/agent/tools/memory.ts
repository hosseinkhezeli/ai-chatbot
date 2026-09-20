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

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

const PERSIAN_MONTHS: Record<string, number> = {
  فروردین: 1,
  اردیبهشت: 2,
  خرداد: 3,
  تیر: 4,
  مرداد: 5,
  شهریور: 6,
  مهر: 7,
  آبان: 8,
  آذر: 9,
  دی: 10,
  بهمن: 11,
  اسفند: 12,
};

type PersianDate = {
  year: number;
  month: number;
  day: number;
};

function parsePersianBirthdate(value: string): PersianDate | null {
  const normalized = normalizeDigits(value).replace(/\s+/g, ' ').trim();

  const namedMonthPattern = Object.keys(PERSIAN_MONTHS)
    .map((month) => month.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const namedMonthMatch = normalized.match(
    new RegExp(`^(\\d{1,2})\\s+(${namedMonthPattern})\\s+(\\d{4})$`, 'u'),
  );

  if (namedMonthMatch) {
    const day = Number(namedMonthMatch[1]);
    const monthName = namedMonthMatch[2];
    const year = Number(namedMonthMatch[3]);
    const month = PERSIAN_MONTHS[monthName];

    if (month && day >= 1 && day <= 31 && year >= 1) {
      return { year, month, day };
    }
  }

  const numericMatch = normalized.match(/^(?:روز\s+)?(\d{4})[-/]?(\d{1,2})[-/]?(\d{1,2})$/u);

  if (numericMatch) {
    const year = Number(numericMatch[1]);
    const month = Number(numericMatch[2]);
    const day = Number(numericMatch[3]);

    if (year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  return null;
}

function getCurrentPersianDate(): PersianDate {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    numberingSystem: 'latn',
  });

  const parts = formatter.formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error('Failed to determine the current Persian date.');
  }

  return { year, month, day };
}

function calculateAge(birthdate: PersianDate, currentDate: PersianDate): number {
  let age = currentDate.year - birthdate.year;

  const birthdayHasNotOccurred =
    currentDate.month < birthdate.month ||
    (currentDate.month === birthdate.month && currentDate.day < birthdate.day);

  if (birthdayHasNotOccurred) {
    age -= 1;
  }

  return age;
}

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

    getUserAge: tool({
      description:
        'Calculate the authenticated user’s current age from their stored birthdate. Always use this tool when the user asks how old they are. Never calculate their age manually from memory.',

      inputSchema: z.object({}),

      execute: async () => {
        try {
          const results = await searchMemories(userId, 'birthdate', 10);

          const birthdateMemory = results.find((memory) => memory.key === 'birthdate');

          if (!birthdateMemory) {
            return {
              success: false,
              error: 'Birthdate is not stored.',
            };
          }

          const birthdate = parsePersianBirthdate(birthdateMemory.content);

          if (!birthdate) {
            return {
              success: false,
              error: 'Stored birthdate format could not be interpreted safely.',
            };
          }

          const currentDate = getCurrentPersianDate();
          const age = calculateAge(birthdate, currentDate);

          if (age < 0 || age > 150) {
            return {
              success: false,
              error: 'Calculated age is outside the valid range.',
            };
          }

          return {
            success: true,
            age,
            birthdate: birthdateMemory.content,
            calendar: 'persian',
          };
        } catch {
          return {
            success: false,
            error: 'Failed to calculate user age.',
          };
        }
      },
    }),
  };
}
