export { BaseAIClient } from './client';

export { getAIClient } from './factory';

export { AI_PROVIDERS, type AIProvider } from './factory';

export { GapGPTAIClient } from './adapters/gapgpt';

export { AI_MODEL_IDS } from './types';

export type { AIClient, AIModelId, AIStreamTextParams, AIStreamTextResult } from './types';
