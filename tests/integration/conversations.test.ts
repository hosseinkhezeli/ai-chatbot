import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as listConversations, POST as createConversation } from '@/app/api/conversations/route';
import { GET as getConversation, DELETE as deleteConversation, PATCH as updateConversation } from '@/app/api/conversations/[id]/route';
import { createMockRequest, createMockGetRequest, expectJsonResponse, expectErrorResponse } from '../utils/test-api';
import { db } from '@/db/client';

const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: null,
  createdAt: new Date(),
};

// A controllable fake for getRequiredCurrentUser: by default it resolves to
// testUser; individual tests flip the shared `authState` to force a rejection.
const authState = vi.hoisted(() => ({ rejected: false }));

vi.mock('@/db/client', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/auth/current-user', () => ({
  getRequiredCurrentUser: vi.fn(async () => {
    if (authState.rejected) throw new Error('UNAUTHENTICATED');
    return testUser;
  }),
  getCurrentUser: vi.fn(async () => testUser),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: testUser.id } })),
}));

import { getRequiredCurrentUser } from '@/lib/auth/current-user';
import { auth } from '@/lib/auth';

describe('Conversations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.rejected = false;
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: testUser.id } });
    (getRequiredCurrentUser as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      if (authState.rejected) throw new Error('UNAUTHENTICATED');
      return testUser;
    });
  });

  describe('GET /api/conversations', () => {
    it('returns user conversations ordered by updatedAt desc', async () => {
      const mockConversations = [
        { id: '1', title: 'Conv 1', createdAt: '2024-01-02T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
        { id: '2', title: 'Conv 2', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockConversations),
          }),
        }),
      });

      const request = createMockGetRequest('/api/conversations');
      const response = await listConversations(request);

      const body = await expectJsonResponse(response, 200);
      expect(body.conversations).toEqual(mockConversations);
    });

    it('filters by search query', async () => {
      const mockConversations = [
        { id: '1', title: 'Test Conversation', createdAt: '2024-01-02T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockConversations),
          }),
        }),
      });

      const request = createMockGetRequest('/api/conversations?q=Test');
      const response = await listConversations(request);

      const body = await expectJsonResponse(response, 200);
      expect(body.conversations).toEqual(mockConversations);
    });

    it('returns 401 when unauthenticated', async () => {
      authState.rejected = true;

      const request = createMockGetRequest('/api/conversations');
      const response = await listConversations(request);

      await expectErrorResponse(response, 401, 'Unauthorized');
    });

    it('handles invalid search query', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const request = createMockGetRequest('/api/conversations?q=' + 'a'.repeat(250));
      const response = await listConversations(request);

      const body = await expectJsonResponse(response, 200);
      expect(body.conversations).toEqual([]);
    });
  });

  describe('POST /api/conversations', () => {
    it('creates a new conversation', async () => {
      const newConversation = {
        id: 'new-conv-id',
        title: 'New Conversation',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const returningMock = vi.fn().mockResolvedValue([newConversation]);
      const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: valuesMock });

      const request = createMockRequest({ title: 'New Conversation' });
      const response = await createConversation(request);

      const body = await expectJsonResponse(response, 201);
      expect(body.conversation).toEqual(newConversation);
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.id,
          title: 'New Conversation',
          systemPromptVersion: 'v1',
        })
      );
    });

    it('creates conversation without title', async () => {
      const newConversation = {
        id: 'new-conv-id',
        title: null,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const returningMock = vi.fn().mockResolvedValue([newConversation]);
      const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: valuesMock });

      const request = createMockRequest({});
      const response = await createConversation(request);

      const body = await expectJsonResponse(response, 201);
      expect(body.conversation.title).toBeNull();
    });

    it('rejects invalid title', async () => {
      const request = createMockRequest({ title: '' });
      const response = await createConversation(request);

      await expectErrorResponse(response, 400, 'Title must be a non-empty string up to 500 characters');
    });

    it('rejects title too long', async () => {
      const request = createMockRequest({ title: 'a'.repeat(501) });
      const response = await createConversation(request);

      await expectErrorResponse(response, 400, 'Title must be a non-empty string up to 500 characters');
    });

    it('returns 401 when unauthenticated', async () => {
      authState.rejected = true;

      const request = createMockRequest({ title: 'Test' });
      const response = await createConversation(request);

      await expectErrorResponse(response, 401, 'Unauthorized');
    });

    it('returns 400 for invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });
      const response = await createConversation(request);

      await expectErrorResponse(response, 400, 'Request body must be valid JSON');
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('returns conversation with messages', async () => {
      const mockConversation = {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Test Conversation',
        systemPromptVersion: 'v1',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const mockMessages = [
        { id: 'msg-1', role: 'user', content: [{ type: 'text', text: 'Hello' }], createdAt: '2024-01-02T00:00:00.000Z' },
        { id: 'msg-2', role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }], createdAt: '2024-01-02T00:00:00.000Z' },
      ];

      const selectMock = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockConversation]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockMessages),
            }),
          }),
        });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(selectMock);

      const request = createMockGetRequest('/api/conversations/11111111-1111-4111-8111-111111111111');
      const response = await getConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      const body = await expectJsonResponse(response, 200);
      expect(body.conversation).toEqual(mockConversation);
      expect(body.messages).toEqual(mockMessages);
    });

    it('returns 404 when conversation not found', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const request = createMockGetRequest('/api/conversations/22222222-2222-4222-8222-222222222222');
      const response = await getConversation(request, { params: Promise.resolve({ id: '22222222-2222-4222-8222-222222222222' }) });

      await expectErrorResponse(response, 404, 'Conversation not found');
    });

    it('returns 400 for invalid UUID', async () => {
      const request = createMockGetRequest('/api/conversations/invalid-id');
      const response = await getConversation(request, { params: Promise.resolve({ id: 'invalid-id' }) });

      await expectErrorResponse(response, 400, 'Invalid conversation ID');
    });

    it('returns 401 when unauthenticated', async () => {
      authState.rejected = true;

      const request = createMockGetRequest('/api/conversations/11111111-1111-4111-8111-111111111111');
      const response = await getConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      await expectErrorResponse(response, 401, 'Unauthorized');
    });
  });

  describe('DELETE /api/conversations/:id', () => {
    it('deletes conversation owned by user', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111' }]),
        }),
      });

      const request = createMockRequest({}, { method: 'DELETE' });
      const response = await deleteConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      const body = await expectJsonResponse(response, 200);
      expect(body.success).toBe(true);
    });

    it('returns 404 when conversation not found or not owned', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = createMockRequest({}, { method: 'DELETE' });
      const response = await deleteConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      await expectErrorResponse(response, 404, 'Conversation not found');
    });

    it('returns 400 for invalid UUID', async () => {
      const request = createMockRequest({}, { method: 'DELETE' });
      const response = await deleteConversation(request, { params: Promise.resolve({ id: 'invalid-id' }) });

      await expectErrorResponse(response, 400, 'Invalid conversation ID');
    });

    it('returns 401 when unauthenticated', async () => {
      authState.rejected = true;

      const request = createMockRequest({}, { method: 'DELETE' });
      const response = await deleteConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      await expectErrorResponse(response, 401, 'Unauthorized');
    });
  });

  describe('PATCH /api/conversations/:id', () => {
    it('updates conversation title', async () => {
      const updatedConversation = {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Updated Title',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const returningMock = vi.fn().mockResolvedValue([updatedConversation]);
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: returningMock }),
      });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: setMock });

      const request = createMockRequest({ title: 'Updated Title' }, { method: 'PATCH' });
      const response = await updateConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      const body = await expectJsonResponse(response, 200);
      expect(body.conversation).toEqual(updatedConversation);
    });

    it('allows setting title to null', async () => {
      const updatedConversation = {
        id: '11111111-1111-4111-8111-111111111111',
        title: null,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const returningMock = vi.fn().mockResolvedValue([updatedConversation]);
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: returningMock }),
      });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: setMock });

      const request = createMockRequest({ title: null }, { method: 'PATCH' });
      const response = await updateConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      const body = await expectJsonResponse(response, 200);
      expect(body.conversation.title).toBeNull();
    });

    it('rejects invalid title', async () => {
      const request = createMockRequest({ title: '' }, { method: 'PATCH' });
      const response = await updateConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      await expectErrorResponse(response, 400, 'Title must be a non-empty string up to 500 characters');
    });

    it('returns 404 when conversation not found', async () => {
      const returningMock = vi.fn().mockResolvedValue([]);
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: returningMock }),
      });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: setMock });

      const request = createMockRequest({ title: 'New Title' }, { method: 'PATCH' });
      const response = await updateConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      await expectErrorResponse(response, 404, 'Conversation not found');
    });

    it('returns 400 for invalid UUID', async () => {
      const request = createMockRequest({ title: 'New Title' }, { method: 'PATCH' });
      const response = await updateConversation(request, { params: Promise.resolve({ id: 'invalid-id' }) });

      await expectErrorResponse(response, 400, 'Invalid conversation ID');
    });

    it('returns 401 when unauthenticated', async () => {
      authState.rejected = true;

      const request = createMockRequest({ title: 'New Title' }, { method: 'PATCH' });
      const response = await updateConversation(request, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });

      await expectErrorResponse(response, 401, 'Unauthorized');
    });
  });
});
