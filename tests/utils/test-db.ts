import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as schema from '@/db/schema';

let testDb: ReturnType<typeof drizzle> | null = null;

export async function getTestDb() {
  if (testDb) return testDb;

  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for integration tests');
  }

  const sql = neon(databaseUrl);
  testDb = drizzle({ client: sql, schema });

  // Run migrations on test database
  await migrate(testDb, { migrationsFolder: './drizzle' });

  return testDb;
}

export async function cleanupTestDb() {
  if (!testDb) return;

  const db = testDb;

  // Clean up in reverse order of dependencies
  await db.delete(schema.messages);
  await db.delete(schema.conversations);
  await db.delete(schema.sessions);
  await db.delete(schema.accounts);
  await db.delete(schema.users);
  await db.delete(schema.verificationTokens);
}

export async function closeTestDb() {
  // Neon HTTP client doesn't need explicit closing
  testDb = null;
}

// Helper to create a test user
export async function createTestUser(db: ReturnType<typeof drizzle>, overrides: Partial<typeof schema.users.$inferInsert> = {}) {
  const [user] = await db.insert(schema.users).values({
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    ...overrides,
  }).returning();
  return user;
}

// Helper to create a test conversation
export async function createTestConversation(
  db: ReturnType<typeof drizzle>,
  userId: string,
  overrides: Partial<typeof schema.conversations.$inferInsert> = {}
) {
  const [conversation] = await db.insert(schema.conversations).values({
    userId,
    title: 'Test Conversation',
    systemPromptVersion: 'v1',
    ...overrides,
  }).returning();
  return conversation;
}

// Helper to create test messages
export async function createTestMessages(
  db: ReturnType<typeof drizzle>,
  conversationId: string,
  messages: Array<{ role: 'user' | 'assistant' | 'tool'; content: unknown }>
) {
  return db.insert(schema.messages).values(
    messages.map((m, i) => ({
      conversationId,
      role: m.role,
      content: m.content,
      createdAt: new Date(Date.now() + i),
    }))
  ).returning();
}