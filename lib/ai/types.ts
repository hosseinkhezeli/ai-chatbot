import type { ModelMessage, streamText } from 'ai';

export const AI_MODEL_IDS = {
  chat: 'chat',
} as const;

export type AIModelId = (typeof AI_MODEL_IDS)[keyof typeof AI_MODEL_IDS];

export type AIStreamTextParams = {
  model: AIModelId;
  system?: string;
  messages: ModelMessage[];
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
};

export type AIStreamTextResult = ReturnType<typeof streamText>;

export interface AIClient {
  streamText(params: AIStreamTextParams): Promise<AIStreamTextResult>;
}
