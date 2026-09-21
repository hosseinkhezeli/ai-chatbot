import { GapGPTAIClient } from './adapters/gapgpt';
import { GoogleAIClient } from './adapters/google';

import type { AIClient } from './types';

export const AI_PROVIDERS = {
  google: GoogleAIClient,
  gapgpt: GapGPTAIClient,
} as const;

export type AIProvider = keyof typeof AI_PROVIDERS;

const DEFAULT_PROVIDER: AIProvider = 'google';

function getConfiguredProvider(): AIProvider {
  const value = process.env.AI_PROVIDER;

  if (!value) {
    return DEFAULT_PROVIDER;
  }

  if (value in AI_PROVIDERS) {
    return value as AIProvider;
  }

  throw new Error(
    `Unsupported AI provider: "${value}". ` +
      `Supported providers: ${Object.keys(AI_PROVIDERS).join(', ')}`,
  );
}

export function getAIClient(): AIClient {
  const Provider = AI_PROVIDERS[getConfiguredProvider()];

  return new Provider();
}
