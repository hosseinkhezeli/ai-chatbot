import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser, createTestConversation, createTestMessages } from '../utils/test-db';
import { conversations, messages, users } from '@/db/schema';
import { eq, and, desc, ilike } from 'drizzle-orm';

// This test requires a TEST_DATABASE_URL to be set
// In CI, this should be a dedicated test database or Neon branch
const TEST_DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

(TEST_DB_AVAILABLE ? describe : describe.skip)('Database Integration', () => {
  let db: ReturnType<typeof getTestDb> extends Promise<infer T> ? T : never;

  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  describe('User operations', () => {
    it('creates and retrieves a user', async () => {
      const user = await createTestUser(db, { email: 'db-test@example.com', name: 'DB Test User' });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('db-test@example.com');
      expect(user.name).toBe('DB Test User');

      // Verify in database
      const [retrieved] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      expect(retrieved).toEqual(user);
    });

    it('enforces unique email constraint', async () => {
      await createTestUser(db, { email: 'unique@example.com' });

      await expect(createTestUser(db, { email: 'unique@example.com' })).rejects.toThrow();
    });
  });

  describe('Conversation operations', () => {
    it('creates conversation linked to user', async () => {
      const user = await createTestUser(db);
      const conversation = await createTestConversation(db, user.id, { title: 'Test Conversation' });

      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(conversation.userId).toBe(user.id);
      expect(conversation.title).toBe('Test Conversation');
      expect(conversation.systemPromptVersion).toBe('v1');

      // Verify in database
      const [retrieved] = await db.select().from(conversations).where(eq(conversations.id, conversation.id)).limit(1);
      expect(retrieved).toEqual(conversation);
    });

    it('lists conversations for user ordered by updatedAt desc', async () => {
      const user = await createTestUser(db);

      const conv1 = await createTestConversation(db, user.id, { title: 'First' });
      const conv2 = await createTestConversation(db, user.id, { title: 'Second' });
      const conv3 = await createTestConversation(db, user.id, { title: 'Third' });

      // Update conv1 to be most recent
      await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conv1.id));

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

      expect(userConversations).toHaveLength(3);
      expect(userConversations[0].id).toBe(conv1.id); // Most recently updated
      expect(userConversations[1].id).toBe(conv3.id);
      expect(userConversations[2].id).toBe(conv2.id);
    });

    it('filters conversations by search query', async () => {
      const user = await createTestUser(db);

      await createTestConversation(db, user.id, { title: 'Important Meeting' });
      await createTestConversation(db, user.id, { title: 'Casual Chat' });
      await createTestConversation(db, user.id, { title: 'Project Discussion' });

      const results = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.userId, user.id), ilike(conversations.title, '%meeting%')))
        .orderBy(desc(conversations.updatedAt));

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Important Meeting');
    });

    it('prevents access to other users conversations', async () => {
      const user1 = await createTestUser(db, { email: 'user1@example.com' });
      const user2 = await createTestUser(db, { email: 'user2@example.com' });

      const conv1 = await createTestConversation(db, user1.id, { title: 'User 1 Conversation' });

      // User 2 tries to access user 1's conversation
      const results = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conv1.id), eq(conversations.userId, user2.id)))
        .limit(1);

      expect(results).toHaveLength(0);
    });
  });

  describe('Message operations', () => {
    it('creates messages linked to conversation', async () => {
      const user = await createTestUser(db);
      const conversation = await createTestConversation(db, user.id);

      const testMessages = [
        { role: 'user' as const, content: [{ type: 'text', text: 'Hello' }] },
        { role: 'assistant' as const, content: [{ type: 'text', text: 'Hi there!' }] },
      ];

      await createTestMessages(db, conversation.id, testMessages);

      const storedMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(messages.createdAt);

      expect(storedMessages).toHaveLength(2);
      expect(storedMessages[0].role).toBe('user');
      expect(storedMessages[0].content).toEqual([{ type: 'text', text: 'Hello' }]);
      expect(storedMessages[1].role).toBe('assistant');
      expect(storedMessages[1].content).toEqual([{ type: 'text', text: 'Hi there!' }]);
    });

    it('cascades delete when conversation is deleted', async () => {
      const user = await createTestUser(db);
      const conversation = await createTestConversation(db, user.id);

      await createTestMessages(db, conversation.id, [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ]);

      // Delete conversation
      await db.delete(conversations).where(eq(conversations.id, conversation.id));

      // Messages should be cascade deleted
      const remainingMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id));

      expect(remainingMessages).toHaveLength(0);
    });

    it('orders messages by createdAt', async () => {
      const user = await createTestUser(db);
      const conversation = await createTestConversation(db, user.id);

      const now = new Date();
      await db.insert(messages).values([
        { conversationId: conversation.id, role: 'user', content: [{ type: 'text', text: 'First' }], createdAt: new Date(now.getTime() + 100) },
        { conversationId: conversation.id, role: 'assistant', content: [{ type: 'text', text: 'Second' }], createdAt: new Date(now.getTime() + 200) },
        { conversationId: conversation.id, role: 'user', content: [{ type: 'text', text: 'Third' }], createdAt: new Date(now.getTime() + 300) },
      ]);

      const storedMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(messages.createdAt);

      expect(storedMessages[0].content).toEqual([{ type: 'text', text: 'First' }]);
      expect(storedMessages[1].content).toEqual([{ type: 'text', text: 'Second' }]);
      expect(storedMessages[2].content).toEqual([{ type: 'text', text: 'Third' }]);
    });
  });

  describe('Authorization', () => {
    it('enforces ownership on conversation queries', async () => {
      const user1 = await createTestUser(db, { email: 'owner@example.com' });
      const user2 = await createTestUser(db, { email: 'other@example.com' });

      const conversation = await createTestConversation(db, user1.id);

      // Owner can access
      const ownerAccess = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversation.id), eq(conversations.userId, user1.id)))
        .limit(1);
      expect(ownerAccess).toHaveLength(1);

      // Non-owner cannot access
      const otherAccess = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversation.id), eq(conversations.userId, user2.id)))
        .limit(1);
      expect(otherAccess).toHaveLength(0);
    });

    it('enforces ownership on message queries via conversation', async () => {
      const user1 = await createTestUser(db, { email: 'owner@example.com' });
      const user2 = await createTestUser(db, { email: 'other@example.com' });

      const conversation = await createTestConversation(db, user1.id);
      await createTestMessages(db, conversation.id, [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ]);

      // Owner can access messages through conversation ownership
      const ownerMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(and(eq(conversations.id, conversation.id), eq(conversations.userId, user1.id)));

      expect(ownerMessages).toHaveLength(1);

      // Non-owner cannot access
      const otherMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(and(eq(conversations.id, conversation.id), eq(conversations.userId, user2.id)));

      expect(otherMessages).toHaveLength(0);
    });
  });
});