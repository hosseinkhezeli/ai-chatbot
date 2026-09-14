import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GapGPTAIClient } from '@ai/adapters/gapgpt';
import type { AIModelId, AIStreamTextParams, AIStreamTextResult } from '@ai/types';
import { streamText } from 'ai';

// Mock the AI SDK
vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

// Mock the openai-compatible provider
vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: vi.fn(() => ({
    chatModel: vi.fn((model: string) => ({ model })),
  })),
}));

describe('GapGPTAIClient', () => {
  const originalApiKey = process.env.GAPGPT_API_KEY;
  const originalBaseUrl = process.env.GAPGPT_BASE_URL;
  let mockStreamText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GAPGPT_API_KEY = 'test-api-key';
    process.env.GAPGPT_BASE_URL = 'https://api.test.com/v1';
    mockStreamText = streamText as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    process.env.GAPGPT_API_KEY = originalApiKey;
    process.env.GAPGPT_BASE_URL = originalBaseUrl;
  });

  it('throws when GAPGPT_API_KEY is not set', async () => {
    // The key check lives in getProvider(), which runs inside streamText() —
    // constructing the client itself is allowed without a key.
    delete process.env.GAPGPT_API_KEY;
    const client = new GapGPTAIClient();
    const params: AIStreamTextParams = {
      model: 'chat',
      system: 'Test system',
      messages: [],
      maxOutputTokens: 1024,
    };

    await expect(client.streamText(params)).rejects.toThrow('GAPGPT_API_KEY is not set.');
  });

  it('maps chat model to glm-4-flash', async () => {
    const mockResult = {
      stream: new ReadableStream(),
      usage: { promptTokens: 10, completionTokens: 20 },
    } as unknown as AIStreamTextResult;

    mockStreamText.mockResolvedValue(mockResult);

    const client = new GapGPTAIClient();
    const params: AIStreamTextParams = {
      model: 'chat',
      system: 'Test system',
      messages: [],
      maxOutputTokens: 1024,
    };

    const result = await client.streamText(params);

    expect(mockStreamText).toHaveBeenCalledOnce();
    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.model.model).toBe('glm-4-flash');
    expect(result).toBe(mockResult);
  });

  it('throws on unsupported model', async () => {
    const client = new GapGPTAIClient();
    const params: AIStreamTextParams = {
      model: 'unsupported' as unknown as AIModelId,
      system: 'Test system',
      messages: [],
      maxOutputTokens: 1024,
    };

    await expect(client.streamText(params)).rejects.toThrow('Unsupported GapGPT model: unsupported');
  });

  it('passes through all parameters to streamText', async () => {
    const mockResult = {
      stream: new ReadableStream(),
      usage: { promptTokens: 10, completionTokens: 20 },
    } as unknown as AIStreamTextResult;

    mockStreamText.mockResolvedValue(mockResult);

    const client = new GapGPTAIClient();
    const abortSignal = new AbortController().signal;
    const params: AIStreamTextParams = {
      model: 'chat',
      system: 'Custom system prompt',
      messages: [{ role: 'user', content: 'Hello' }],
      maxOutputTokens: 512,
      abortSignal,
    };

    await client.streamText(params);

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.system).toBe('Custom system prompt');
    expect(callArgs.messages).toEqual([{ role: 'user', content: 'Hello' }]);
    expect(callArgs.maxOutputTokens).toBe(512);
    expect(callArgs.abortSignal).toBe(abortSignal);
    expect(callArgs.maxRetries).toBe(0);
  });

  it('includes onError handler', async () => {
    const mockResult = {
      stream: new ReadableStream(),
      usage: { promptTokens: 10, completionTokens: 20 },
    } as unknown as AIStreamTextResult;

    mockStreamText.mockResolvedValue(mockResult);

    const client = new GapGPTAIClient();
    const params: AIStreamTextParams = {
      model: 'chat',
      system: 'Test system',
      messages: [],
      maxOutputTokens: 1024,
    };

    await client.streamText(params);

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(typeof callArgs.onError).toBe('function');
  });
});