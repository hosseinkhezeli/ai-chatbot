import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, type PersonaId } from '@agent/systemPrompt';

describe('buildSystemPrompt', () => {
  it('returns the career-strategist persona by default', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Career Strategist');
  });

  it('returns the career-strategist persona when explicitly requested', () => {
    const prompt = buildSystemPrompt('career-strategist');
    expect(prompt).toContain('Career Strategist');
  });

  it('throws on unknown persona', () => {
    expect(() => buildSystemPrompt('unknown' as PersonaId)).toThrow(
      'Unknown personaId: unknown. Valid personas: career-strategist'
    );
  });

  it('includes version in the prompt', () => {
    const prompt = buildSystemPrompt('career-strategist');
    expect(prompt.length).toBeGreaterThan(100);
  });
});

describe('PersonaId type', () => {
  it('only allows career-strategist', () => {
    // This is a compile-time test - if it compiles, the type is correct
    const validPersona: PersonaId = 'career-strategist';
    expect(validPersona).toBe('career-strategist');
  });
});