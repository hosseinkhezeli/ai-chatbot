import { tutorV1 } from './prompts/tutor';

export type PersonaId = 'tutor';

export const SYSTEM_PROMPT_VERSION = 'v1';

const personas: Record<PersonaId, { version: string; text: string }> = {
  tutor: { version: tutorV1.version, text: tutorV1.text },
};

export function buildSystemPrompt(personaId: PersonaId = 'tutor'): string {
  const persona = personas[personaId];
  if (!persona) {
    throw new Error(
      `Unknown personaId: ${personaId}. Valid personas: ${Object.keys(personas).join(', ')}`,
    );
  }
  return persona.text;
}
