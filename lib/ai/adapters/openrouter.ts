import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';

import { BaseAIClient } from '../client';
import type { AIModelId, AIStreamTextParams } from '../types';

function getProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set.');
  }

  return createOpenAICompatible({
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });
}

function resolveModel(model: AIModelId): string {
  switch (model) {
    case 'chat':
      return 'openrouter/free';

    default:
      throw new Error(`Unsupported OpenRouter model: ${model}`);
  }
}

export class OpenRouterClient extends BaseAIClient {
  async streamText({
    model,
    system,
    messages,
    maxOutputTokens,
    abortSignal,
    tools,
    stopWhen,
  }: AIStreamTextParams) {
    return streamText({
      model: getProvider()(resolveModel(model)),
      system,
      messages,
      maxOutputTokens,
      abortSignal,
      tools,
      stopWhen,
      maxRetries: 0,

      onError({ error }) {
        console.error('OpenRouter stream error:', error);
      },
    });
  }
}
