import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as chatHandler } from '@/app/api/chat/route';
import { createMockRequest, expectErrorResponse } from '../utils/test-api';
import { db } from '@/db/client';

// A controllable fake for getRequiredCurrentUser: by default it resolves to
// testUser; individual tests flip the shared `authState` to force a rejection.
// (Same pattern as conversations.test.ts — mock implementations assigned only
// in beforeEach proved unreliable for this route's dynamic import chain.)
const authState = vi.hoisted(() => ({ rejected: false }));

const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: null,
  createdAt: new Date(),
};

const VALID_CONV_ID = '550e8400-e29b-41d4-a716-446655440000';

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

vi.mock('@agent/harness', () => ({
  streamChat: vi.fn(),
}));

vi.mock('@agent/systemPrompt', () => ({
  buildSystemPrompt: vi.fn(),
}));

vi.mock('ai', () => ({
  createUIMessageStreamResponse: vi.fn(),
  toUIMessageStream: vi.fn(),
}));

import { getRequiredCurrentUser } from '@/lib/auth/current-user';
import { streamChat } from '@agent/harness';
import { buildSystemPrompt } from '@agent/systemPrompt';
import { createUIMessageStreamResponse, toUIMessageStream } from 'ai';

function oneUserMessage() {
  return [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }];
}

// Default streaming setup: toUIMessageStream returns a passthrough stream,
// createUIMessageStreamResponse wraps it into a Response.
function mockStreamingSuccess() {
  const mockStream = new ReadableStream();
  (streamChat as ReturnType<typeof vi.fn>).mockResolvedValue({ stream: mockStream });
  (toUIMessageStream as ReturnType<typeof vi.fn>).mockReturnValue(mockStream);
  (createUIMessageStreamResponse as ReturnType<typeof vi.fn>).mockImplementation(
    () => new Response(mockStream)
  );
}

// Default DB behavior matching the route's call sequence:
//   select(...).from(...).where(...).limit(1)  -> resolves [] (overridden per-test)
//   insert(...).values(...)                    -> resolves undefined
//   update(...).set(...).where(...)            -> resolves undefined
function mockDefaultDb() {
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

// Mock the conversation-lookup select to return a matching conversation.
function mockConversationFound(id: string) {
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id }]),
      }),
    }),
  });
}

describe('Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.rejected = false;
    (getRequiredCurrentUser as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      if (authState.rejected) throw new Error('UNAUTHENTICATED');
      return testUser;
    });
    (buildSystemPrompt as ReturnType<typeof vi.fn>).mockReturnValue('Test system prompt');
    mockDefaultDb();
  });

  it('returns 401 when unauthenticated', async () => {
    authState.rejected = true;

    const request = createMockRequest({ messages: oneUserMessage() });
    const response = await chatHandler(request);

    await expectErrorResponse(response, 401, 'Unauthorized');
  });

  it('returns 400 for invalid JSON', async () => {
    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });
    const response = await chatHandler(request);

    await expectErrorResponse(response, 400, 'Request body must be valid JSON');
  });

  it('returns 400 for missing messages array', async () => {
    const request = createMockRequest({ notMessages: [] });
    const response = await chatHandler(request);

    await expectErrorResponse(response, 400, 'Request body must include a messages array');
  });

  it('returns 400 for empty messages array', async () => {
    const request = createMockRequest({ messages: [] });
    const response = await chatHandler(request);

    await expectErrorResponse(response, 400, 'Messages array cannot be empty');
  });

  it('returns 400 when last message is not from user', async () => {
    const request = createMockRequest({
      messages: [
        ...oneUserMessage(),
        { id: '2', role: 'assistant', parts: [{ type: 'text', text: 'Hi!' }] },
      ],
    });
    const response = await chatHandler(request);

    await expectErrorResponse(response, 400, 'Last message must be from user');
  });

  it('returns 400 for invalid conversation ID', async () => {
    const request = createMockRequest({
      messages: oneUserMessage(),
      conversationId: 'invalid-id',
    });
    const response = await chatHandler(request);

    await expectErrorResponse(response, 400, 'Invalid conversation ID');
  });

  it('returns 404 when conversation not found', async () => {
    const request = createMockRequest({
      messages: oneUserMessage(),
      conversationId: VALID_CONV_ID,
    });
    const response = await chatHandler(request);

    await expectErrorResponse(response, 404, 'Conversation not found');
  });

  it('creates new conversation when no ID provided', async () => {
    const returningMock = vi.fn().mockResolvedValue([{ id: VALID_CONV_ID }]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: valuesMock });
    mockStreamingSuccess();

    const request = createMockRequest({ messages: oneUserMessage() });
    const response = await chatHandler(request);

    expect(response.status).toBe(200);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testUser.id,
        title: null,
        systemPromptVersion: 'v1',
      })
    );
  });

  it('uses existing conversation when ID provided', async () => {
    mockConversationFound(VALID_CONV_ID);
    mockStreamingSuccess();

    const request = createMockRequest({
      messages: oneUserMessage(),
      conversationId: VALID_CONV_ID,
    });
    const response = await chatHandler(request);

    expect(response.status).toBe(200);
  });

  it('persists user message before streaming', async () => {
    mockConversationFound(VALID_CONV_ID);
    mockStreamingSuccess();

    // With a conversationId, the route performs exactly one insert: the user message.
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: valuesMock });

    const request = createMockRequest({
      messages: oneUserMessage(),
      conversationId: VALID_CONV_ID,
    });
    await chatHandler(request);

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: VALID_CONV_ID,
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      })
    );
  });

  it('calls harness with correct parameters', async () => {
    mockConversationFound(VALID_CONV_ID);
    mockStreamingSuccess();

    const request = createMockRequest({
      messages: [
        ...oneUserMessage(),
        { id: '2', role: 'user', parts: [{ type: 'text', text: 'How are you?' }] },
      ],
      conversationId: VALID_CONV_ID,
    });
    await chatHandler(request);

    expect(streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        system: 'Test system prompt',
      })
    );
  });

  it('returns 500 when harness fails', async () => {
    mockConversationFound(VALID_CONV_ID);
    (streamChat as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Harness error'));

    const request = createMockRequest({
      messages: oneUserMessage(),
      conversationId: VALID_CONV_ID,
    });
    const response = await chatHandler(request);

    await expectErrorResponse(response, 500, 'Failed to generate chat response');
  });

  it('returns 500 when persisting the user message fails', async () => {
    mockConversationFound(VALID_CONV_ID);
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('DB write failed')),
    });

    const request = createMockRequest({
      messages: oneUserMessage(),
      conversationId: VALID_CONV_ID,
    });
    const response = await chatHandler(request);

    await expectErrorResponse(response, 500, 'Failed to persist message');
  });
});
