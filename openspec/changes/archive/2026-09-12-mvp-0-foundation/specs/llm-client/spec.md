# llm-client — El único punto de contacto con Claude

**Dueño:** Dev C (C1). ~1,5 h. Lo publica apenas está y avisa por Notion.
**Prioridad:** P0. Todo adaptador de IA (M4, C2, C4, C5, C6) se construye sobre esto.

## Purpose

Encapsula toda llamada a Claude Haiku 4.5 detrás de la interfaz `LlmClient` de `shared-contracts`: salidas estructuradas validadas con zod, caché de prompts en la parte fija, memoización por sesión, reintento acotado y el modo `fake` para trabajar sin clave. Ningún otro paquete importa `@anthropic-ai/sdk`.

## Alcance

**Entra**
- `packages/ai/src/llm-client.ts`: `AnthropicLlmClient implements LlmClient`.
- `packages/ai/src/cache.ts`: memoización en memoria por hash de `(modelo + prompt + esquema)` dentro del proceso.
- `packages/ai/src/errors.ts`: `LlmSchemaMismatchError`, `LlmUnavailableError` (se mapean a 502 en `api-skeleton`).
- Lectura de `ANTHROPIC_API_KEY` y `AI_MODE` desde el entorno.
- Un `README` de 10 líneas en `packages/ai` con cómo usarlo desde un adaptador.

**Queda afuera**
- Los adaptadores concretos (intake, mapeo, explicación, objetivo, chat): cada uno vive en su spec de flujo.
- Grabación/replay de respuestas: la demo corre en vivo (D5, convenciones §6).
- Streaming.

## Contratos

Consume `LlmClient` y `LlmPrompt` de `shared-contracts`:

```ts
export interface LlmClient {
  completeJson<T>(prompt: LlmPrompt, schema: ZodType<T>): Promise<T>;
  completeText(prompt: LlmPrompt): Promise<string>;
}
export interface LlmPrompt { system: string; user: string; maxTokens?: number }
```

Parámetros de la llamada real (D5 del handoff, `CLAUDE.md`):

| Parámetro | Valor |
|---|---|
| Modelo | `claude-haiku-4-5` |
| SDK | `@anthropic-ai/sdk` |
| JSON | **Salidas estructuradas** (`output_config.format` con el JSON Schema derivado del esquema zod) o herramienta con `strict: true`. Nunca "devolveme JSON" y parsear a mano |
| Caché | `cache_control: { type: 'ephemeral' }` sobre el bloque `system` (la parte fija) |
| Razonamiento | **No usar** `thinking: { type: 'adaptive' }` ni `output_config.effort` (Haiku 4.5 devuelve 400). Si hace falta: `thinking: { type: 'enabled', budget_tokens: N }` con `1024 ≤ N < max_tokens` |
| `max_tokens` | `prompt.maxTokens ?? 1024` |
| Clave | `ANTHROPIC_API_KEY` del entorno. Nunca en el repo |

Modos:

| `AI_MODE` | Comportamiento |
|---|---|
| `live` (default) | Llama a Claude. Si falta `ANTHROPIC_API_KEY` al construir el cliente, falla al arrancar con un mensaje claro |
| `fake` | Devuelve `FakeLlmClient` de `shared-contracts/testing`. Solo para tests de los núcleos y para trabajar sin clave. **Nunca para mostrar** |

## ADDED Requirements

### Requirement: REQ-LC-01 Toda salida JSON se valida contra el esquema
`completeJson(prompt, schema)` SHALL pedir a Claude una salida estructurada conforme al JSON Schema derivado de `schema` y SHALL validar la respuesta con ese mismo esquema zod antes de devolverla. Si no valida, SHALL reintentar exactamente una vez; si vuelve a fallar, SHALL lanzar `LlmSchemaMismatchError` con los issues de zod.

#### Scenario: Respuesta válida
- **WHEN** se llama `completeJson(prompt, BreedingGoalSchema)` y Claude devuelve un objeto que cumple el esquema
- **THEN** devuelve el objeto tipado como `BreedingGoal` sin ningún parseo manual de texto

#### Scenario: Respuesta inválida dos veces
- **WHEN** Claude devuelve dos veces un JSON que no cumple el esquema (por ejemplo `weights` con un rasgo desconocido)
- **THEN** se hicieron exactamente 2 llamadas y se lanza `LlmSchemaMismatchError` con `issues` no vacío

### Requirement: REQ-LC-02 Memoización por sesión
Dos llamadas idénticas (mismo modelo, mismo `system`, mismo `user`, mismo esquema) dentro del mismo proceso SHALL producir una sola llamada a Claude. Un cambio en cualquiera de esos elementos SHALL producir una llamada nueva. La memoización SHALL no persistir entre reinicios.

#### Scenario: Dos llamadas iguales seguidas
- **WHEN** en `live` se llama dos veces `completeText` con el mismo `LlmPrompt`
- **THEN** el SDK se invoca una sola vez y las dos llamadas devuelven el mismo texto

#### Scenario: Prompt distinto
- **WHEN** cambia una palabra del `user`
- **THEN** el SDK se invoca de nuevo

### Requirement: REQ-LC-03 Caché de prompts en la parte fija
El bloque `system` SHALL enviarse con `cache_control` para que las llamadas repetidas de la demo bajen costo y latencia sin dejar de generarse en vivo.

#### Scenario: Inspección del request
- **WHEN** se captura el request enviado al SDK en una llamada `live`
- **THEN** el bloque `system` lleva `cache_control: { type: 'ephemeral' }` y el mensaje `user` no

### Requirement: REQ-LC-04 Parámetros compatibles con Haiku 4.5
El cliente SHALL usar el modelo `claude-haiku-4-5` y SHALL no enviar `thinking: { type: 'adaptive' }` ni `output_config.effort`. Si se habilita razonamiento, SHALL usar `thinking: { type: 'enabled', budget_tokens }` con `budget_tokens ≥ 1024` y menor que `max_tokens`.

#### Scenario: Request por defecto
- **WHEN** se captura el request de una llamada sin razonamiento
- **THEN** `model === 'claude-haiku-4-5'`, no hay clave `thinking` ni `output_config.effort`

### Requirement: REQ-LC-05 Modo fake sin red ni clave
Con `AI_MODE=fake` el cliente resuelto SHALL ser `FakeLlmClient`, SHALL no leer `ANTHROPIC_API_KEY` y SHALL no hacer ninguna llamada de red.

#### Scenario: Tests de los núcleos sin clave
- **WHEN** corre `npx nx run-many -t test` en una máquina sin `ANTHROPIC_API_KEY` y `AI_MODE=fake`
- **THEN** todos los tests pasan y no hay tráfico saliente

#### Scenario: Live sin clave
- **WHEN** la API arranca con `AI_MODE=live` y sin `ANTHROPIC_API_KEY`
- **THEN** falla al construir `AnthropicLlmClient` con un mensaje en español que dice qué variable falta

### Requirement: REQ-LC-06 Errores tipados hacia la API
Un fallo de red o del proveedor tras el reintento SHALL lanzar `LlmUnavailableError`; un JSON que no cumple el esquema tras el reintento SHALL lanzar `LlmSchemaMismatchError`. Ambos SHALL mapearse en `api-skeleton` a 502 con `code` `LLM_UNAVAILABLE` / `LLM_SCHEMA_MISMATCH`.

#### Scenario: Proveedor caído
- **WHEN** el SDK rechaza con un error de conexión en las dos llamadas
- **THEN** el adaptador que llamó recibe `LlmUnavailableError` y la API responde 502 `LLM_UNAVAILABLE` con un `message` en español

## Reglas que respeta

RN-17 (el cliente redacta o estructura; **nunca** se le pide un score ni un valor genético — eso lo garantizan los adaptadores, pero el cliente no ofrece ninguna API para "calcular") · RN-18 (validación de esquema en toda salida JSON) · D5 · convenciones §6 y §11 · `CLAUDE.md` sección LLM.

## Criterios de aceptación

- [ ] Test con el SDK mockeado: dos llamadas idénticas → una invocación (REQ-LC-02).
- [ ] Test con el SDK mockeado: JSON inválido dos veces → 2 invocaciones y `LlmSchemaMismatchError` (REQ-LC-01).
- [ ] Test: el request lleva `cache_control` en `system` y `model: 'claude-haiku-4-5'` sin `thinking` (REQ-LC-03, REQ-LC-04).
- [ ] Verificación manual en `live` con clave real: `completeJson` con `BreedingGoalSchema` y el prompt de C5 devuelve un objeto válido (se anota en el PR).
- [ ] `rg "@anthropic-ai/sdk" packages apps` solo matchea dentro de `packages/ai`.

## Riesgos y supuestos

- **Riesgo:** la demo depende de la conexión del evento (convenciones §6). Mitigación: se prueba en el lugar; `cache_control` y la memoización reducen latencia; no hay plan B pregrabado a propósito.
- **Riesgo:** el JSON Schema derivado de zod usa construcciones que las salidas estructuradas de Anthropic no soportan (por ejemplo `Record` con claves dinámicas). Mitigación: los esquemas que van al LLM (`BreedingGoal`, `Need`, `MappingProposal`, `ChatAnswer`) se mantienen simples; `weights` se modela como objeto con las 8 claves opcionales, no como `Record`.
- **Supuesto:** la memoización en memoria alcanza; no hay más de un proceso de API en la demo.

## Preguntas abiertas

| # | Pregunta | Default | Quién cierra |
|---|---|---|---|
| Q1 | ¿`completeJson` con `output_config.format` o con tool `strict: true`? | `output_config.format`; si el SDK instalado no lo expone, tool `strict: true` | Dev C en C1 |
| Q2 | ¿Se loguea cada llamada (tokens, latencia)? | Sí, a consola en desarrollo, sin el contenido del prompt | Dev C |
