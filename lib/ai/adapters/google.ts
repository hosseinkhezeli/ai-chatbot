import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

import { BaseAIClient } from '../client';
import type { AIModelId, AIStreamTextParams } from '../types';

function getProvider() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set.');
  }

  return createGoogleGenerativeAI({
    apiKey,
  });
}

function resolveModel(model: AIModelId): string {
  switch (model) {
    case 'chat':
      return 'gemma-4-26b-a4b-it';

    default:
      throw new Error(`Unsupported Google AI model: ${model}`);
  }
}

export class GoogleAIClient extends BaseAIClient {
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
        console.error('Google AI stream error:', error);
      },
    });
  }
}
