import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamChat, type StreamChatParams } from '@agent/harness';
import type { AIClient, AIStreamTextParams, AIStreamTextResult } from '@ai/types';

// Mock AI client
const createMockAIClient = (): AIClient => ({
  streamText: vi.fn(),
});

describe('streamChat', () => {
  let mockClient: AIClient;
  let mockStreamText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClient = createMockAIClient();
    mockStreamText = mockClient.streamText as ReturnType<typeof vi.fn>;
  });

  it('converts UI messages to model messages and calls client', async () => {
    const mockResult = {
      stream: new ReadableStream(),
      usage: { promptTokens: 10, completionTokens: 20 },
    } as unknown as AIStreamTextResult;

    mockStreamText.mockResolvedValue(mockResult);

    const params: StreamChatParams = {
      messages: [
        { id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      ],
      system: 'Test system prompt',
    };

    const result = await streamChat(params, mockClient);

    expect(mockStreamText).toHaveBeenCalledOnce();
    const callArgs = mockStreamText.mock.calls[0][0] as AIStreamTextParams;
    expect(callArgs.model).toBe('chat');
    expect(callArgs.system).toBe('Test system prompt');
    expect(callArgs.messages).toBeDefined();
    expect(callArgs.maxOutputTokens).toBe(1024);
    expect(result).toBe(mockResult);
  });

  it('passes abort signal when provided', async () => {
    const mockResult = {
      stream: new ReadableStream(),
      usage: { promptTokens: 10, completionTokens: 20 },
    } as unknown as AIStreamTextResult;

    mockStreamText.mockResolvedValue(mockResult);

    const abortSignal = new AbortController().signal;
    const params: StreamChatParams = {
      messages: [
        { id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      ],
      system: 'Test system prompt',
      abortSignal,
    };

    await streamChat(params, mockClient);

    const callArgs = mockStreamText.mock.calls[0][0] as AIStreamTextParams;
    expect(callArgs.abortSignal).toBe(abortSignal);
  });

  it('uses default maxOutputTokens of 1024', async () => {
    const mockResult = {
      stream: new ReadableStream(),
      usage: { promptTokens: 10, completionTokens: 20 },
    } as unknown as AIStreamTextResult;

    mockStreamText.mockResolvedValue(mockResult);

    const params: StreamChatParams = {
      messages: [
        { id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      ],
      system: 'Test system prompt',
    };

    await streamChat(params, mockClient);

    const callArgs = mockStreamText.mock.calls[0][0] as AIStreamTextParams;
    expect(callArgs.maxOutputTokens).toBe(1024);
  });

  it('handles empty messages array', async () => {
    const mockResult = {
      stream: new ReadableStream(),
      usage: { promptTokens: 0, completionTokens: 0 },
    } as unknown as AIStreamTextResult;

    mockStreamText.mockResolvedValue(mockResult);

    const params: StreamChatParams = {
      messages: [],
      system: 'Test system prompt',
    };

    const result = await streamChat(params, mockClient);
    expect(result).toBe(mockResult);
  });

  it('falls back to the factory client when none is provided', async () => {
    const client = createMockAIClient();
    (client.streamText as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    // harness.ts calls getAIClient() from lib/ai as its default client;
    // '@ai/index' and harness's relative '../ai' resolve to the same module.
    vi.resetModules();
    vi.doMock('@ai/index', () => ({ getAIClient: () => client }));

    const { streamChat: freshStreamChat } = await import('@agent/harness');
    await freshStreamChat({
      messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }],
      system: 'Test system prompt',
    });

    expect(client.streamText).toHaveBeenCalledOnce();
  });
});