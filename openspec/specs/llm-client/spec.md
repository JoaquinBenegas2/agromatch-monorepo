# llm-client Specification

## Purpose

Encapsula toda llamada a Claude Haiku 4.5 detrás de la interfaz `LlmClient` de `shared-contracts`: salidas estructuradas validadas con zod, caché de prompts en la parte fija, memoización por sesión, reintento acotado y el modo `fake` para trabajar sin clave. Ningún otro paquete importa `@anthropic-ai/sdk`.

## Requirements

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
