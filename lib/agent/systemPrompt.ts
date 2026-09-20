import { buildRuntimeContext, type HarnessRuntimeContext } from './context';
import { behaviorPrompt } from './prompts/behavior';
import { identityPrompt } from './prompts/identity';
import { memoryPrompt } from './prompts/memory';
import { safetyPrompt } from './prompts/safety';
import { toolsPrompt } from './prompts/tools';
import { trustPrompt } from './prompts/trust';

const CORE_PROMPTS: string[] = [
  identityPrompt,
  behaviorPrompt,
  trustPrompt,
  memoryPrompt,
  toolsPrompt,
  safetyPrompt,
];

export function buildSystemPrompt(context?: HarnessRuntimeContext): string {
  const sections = [...CORE_PROMPTS];

  const runtimeContext = buildRuntimeContext(context);

  if (runtimeContext) {
    sections.push(runtimeContext);
  }

  return sections.join('\n\n');
}
