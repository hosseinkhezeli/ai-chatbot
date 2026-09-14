import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAIClient, AI_PROVIDERS, type AIProvider } from '@ai/factory';
import { GapGPTAIClient } from '@ai/adapters/gapgpt';

// getConfiguredProvider is a private helper in lib/ai/factory.ts — we test its
// behavior through getAIClient(), which selects a provider based on AI_PROVIDER.
describe('AI Provider Factory', () => {
  const originalEnv = process.env.AI_PROVIDER;

  beforeEach(() => {
    process.env.AI_PROVIDER = originalEnv;
  });

  afterEach(() => {
    process.env.AI_PROVIDER = originalEnv;
  });

  describe('provider selection (via getAIClient)', () => {
    it('returns the default provider when AI_PROVIDER is not set', () => {
      delete process.env.AI_PROVIDER;
      expect(getAIClient()).toBeInstanceOf(GapGPTAIClient);
    });

    it('returns the configured provider when AI_PROVIDER is set', () => {
      process.env.AI_PROVIDER = 'gapgpt';
      expect(getAIClient()).toBeInstanceOf(GapGPTAIClient);
    });

    it('throws on unsupported provider', () => {
      process.env.AI_PROVIDER = 'unsupported';
      expect(() => getAIClient()).toThrow(
        'Unsupported AI provider: "unsupported". Supported providers: gapgpt'
      );
    });
  });

  describe('getAIClient', () => {
    it('returns client implementing AIClient interface', () => {
      const client = getAIClient();
      expect(typeof client.streamText).toBe('function');
    });
  });

  describe('AI_PROVIDERS', () => {
    it('contains gapgpt provider', () => {
      expect(AI_PROVIDERS).toHaveProperty('gapgpt');
      expect(AI_PROVIDERS.gapgpt).toBe(GapGPTAIClient);
    });

    it('has correct type', () => {
      const providers = Object.keys(AI_PROVIDERS) as AIProvider[];
      expect(providers).toContain('gapgpt');
    });
  });
});
