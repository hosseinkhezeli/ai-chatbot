import { careerStrategistV1 } from './prompts/career-strategist';

export type PersonaId = 'career-strategist';

const personas: Record<PersonaId, { version: string; text: string }> = {
  'career-strategist': {
    version: careerStrategistV1.version,
    text: careerStrategistV1.text,
  },
};

export function buildSystemPrompt(personaId: PersonaId = 'career-strategist'): string {
  const persona = personas[personaId];

  if (!persona) {
    throw new Error(
      `Unknown personaId: ${personaId}. Valid personas: ${Object.keys(personas).join(', ')}`,
    );
  }

  return persona.text;
}
