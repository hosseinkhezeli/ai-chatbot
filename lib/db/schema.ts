// src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
  primaryKey,
  integer,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index('accounts_user_id_idx').on(table.userId),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('session_token').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// Aliases for @auth/drizzle-adapter which expects specific table names
export const usersTable = users;
export const accountsTable = accounts;
export const sessionsTable = sessions;
export const verificationTokensTable = verificationTokens;

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    title: text('title'),
    systemPromptVersion: text('system_prompt_version').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('conversations_user_id_idx').on(table.userId)],
);

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'tool']);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: jsonb('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('messages_conversation_id_idx').on(table.conversationId)],
);

// Tracks tool calls made during assistant message generation
// Enables reproducibility and debugging of agent responses (Phase 4.1)
export const toolCalls = pgTable(
  'tool_calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    toolName: text('tool_name').notNull(),
    input: jsonb('input').notNull(),
    output: jsonb('output'),
    status: text('status').notNull().default('success'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('tool_calls_message_id_idx').on(table.messageId)],
);

export const memoryTypeEnum = pgEnum('memory_type', [
  'profile',
  'preference',
  'fact',
  'relationship',
  'event',
  'goal',
  'thread',
  'commitment',
  'interaction_pattern',
]);

export const memorySourceEnum = pgEnum('memory_source', [
  'explicit',
  'conversation',
  'inferred',
  'tool',
]);

export const memorySensitivityEnum = pgEnum('memory_sensitivity', ['normal', 'sensitive', 'high']);

export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    type: memoryTypeEnum('type').notNull(),

    /**
     * Stable semantic identifier used for retrieval.
     * Examples: birthdate, favorite_language, partner_name
     */
    key: text('key').notNull(),

    /**
     * Preserve the user's information as accurately as possible.
     * Do not silently normalize dates, names, or other user-provided values.
     */
    content: text('content').notNull(),

    source: memorySourceEnum('source').notNull().default('explicit'),

    /**
     * 0-100 confidence score.
     */
    confidence: integer('confidence').notNull().default(100),

    sensitivity: memorySensitivityEnum('sensitivity').notNull().default('normal'),

    createdAt: timestamp('created_at').notNull().defaultNow(),

    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    lastConfirmedAt: timestamp('last_confirmed_at', { mode: 'date' }),
  },
  (table) => [
    index('memories_user_id_idx').on(table.userId),
    index('memories_user_key_idx').on(table.userId, table.key),
  ],
);
