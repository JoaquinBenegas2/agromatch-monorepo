# @org/ai

El único punto de contacto con Claude Haiku 4.5.

```ts
import { AnthropicLlmClient } from '@org/ai';

const llm = new AnthropicLlmClient(); // lee ANTHROPIC_API_KEY del entorno
const goal = await llm.completeJson({ system, user }, BreedingGoalSchema);
const text = await llm.completeText({ system, user });
```

- `AI_MODE=fake` usa `FakeLlmClient` de `@org/shared-types/testing` en su lugar (sin red, sin clave).
- `LlmSchemaMismatchError` / `LlmUnavailableError` se mapean a 502 en `api-skeleton`.
- Cada adaptador de flujo (intake, mapeo, explicación, objetivo, chat) construye su propio `LlmPrompt`; este paquete no sabe de dominio.
