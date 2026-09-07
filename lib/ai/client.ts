import type { AIClient, AIStreamTextParams, AIStreamTextResult } from './types';

export abstract class BaseAIClient implements AIClient {
  abstract streamText(params: AIStreamTextParams): Promise<AIStreamTextResult>;
}
