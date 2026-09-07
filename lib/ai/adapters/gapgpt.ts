import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';

import { BaseAIClient } from '../client';
import type { AIModelId, AIStreamTextParams } from '../types';

const GAPGPT_BASE_URL = process.env.GAPGPT_BASE_URL ?? '404_GAPGPT_BASE_URL';

function getProvider() {
  const apiKey = process.env.GAPGPT_API_KEY;

  if (!apiKey) {
    throw new Error('GAPGPT_API_KEY is not set.');
  }

  return createOpenAICompatible({
    name: 'gapgpt',
    apiKey,
    baseURL: GAPGPT_BASE_URL,
  });
}

function resolveModel(model: AIModelId): string {
  switch (model) {
    case 'chat':
      return 'glm-4-flash';

    default:
      throw new Error(`Unsupported GapGPT model: ${model}`);
  }
}

export class GapGPTAIClient extends BaseAIClient {
  async streamText({ model, system, messages, maxOutputTokens, abortSignal }: AIStreamTextParams) {
    return streamText({
      model: getProvider().chatModel(resolveModel(model)),
      system,
      messages,
      maxOutputTokens,
      abortSignal,
      maxRetries: 0,

      onError({ error }) {
        console.error('GapGPT stream error:', error);
      },
    });
  }
}
