# MASTER HANDOFF — AgroMatch

> **Qué es este documento:** la **fuente de verdad y el índice** del proyecto. Si lo leés entero, tenés todo el contexto: qué construimos, qué está decidido, dónde vive cada cosa, quién hace qué y cuál es el próximo paso.
>
> **Cómo se usa:** es la **primera lectura de cualquier chat o agente nuevo**. Todo lo demás se lee solo si este documento te manda ahí.
>
> Última actualización: septiembre de 2026.

---

## 1. El objetivo

**Ganar el track AGRO de la hackathon** con una solución de mercado convertida en producto: **4 devs, ~20 horas**.

**Qué construimos:** **AgroMatch conecta y resuelve las necesidades del agro.** El productor escribe lo que necesita en lenguaje natural, un **motor determinístico** calcula quién se lo resuelve mejor y **la IA explica por qué**.

| Capa | Qué resuelve | Cómo puntúa |
|---|---|---|
| **Núcleo** | Cualquier necesidad: maquinaria, veterinaria, insumos | Cobertura, disponibilidad, capacidad, precio, reputación |
| **Vertical genético (Torinder)** | "Quiero mejorar los sólidos de mi tambo" | Motor genético: clasificación del rodeo, cría esperada y compatibilidad |

**Por qué las dos:** el núcleo da alcance, el vertical da profundidad **y retención**. En marketplaces de servicios la desintermediación se lleva hasta el 80% de los ingresos; nadie vuelve a una lista de contratistas, pero sí volvés cada mes a algo que te dice qué hacer con cada vaca.

**El MVP es la narración de `baseline.md` sección 1b.** Si algo no aparece en esa historia, no entra. Si algo de esa historia no funciona, no llegamos.

---

## 2. El orden de autoridad

Cuando dos documentos se contradicen, **gana el de arriba**:

```
1. ADR (docs/adr/)                    ← decisiones con consecuencias, numeradas
2. MASTER-HANDOFF.md  (este)          ← índice y estado
3. docs/modelo-de-dominio.md          ← reglas RN-xx y flujos
4. docs/convenciones-tecnicas.md      ← cómo se escribe el código
5. docs/plan-de-trabajo.md            ← tareas y contratos
6. El resto
```

**Si encontrás una contradicción, no la resuelvas en silencio:** seguí el de arriba y avisá para corregir el de abajo.

---

## 3. Dónde está todo

### En el repo (`agromatch-monorepo`, rama `develop`)

| Archivo | Qué responde |
|---|---|
| `MASTER-HANDOFF.md` | **Este.** Índice, estado y próximo paso |
| `baseline.md` | Contexto para abrir cualquier chat + **la narración del MVP** (sección 1b) |
| `CLAUDE.md` | Contexto para el agente de cada dev + reglas que no se negocian |
| `docs/arranque.md` | Cómo empieza cada dev, el ritual de Notion y la definición de calidad |
| `docs/modelo-de-dominio.md` | Lenguaje ubicuo, entidades, **RN-01 a RN-39**, flujos **N1–N5** y **F1–F7** |
| `docs/motor-datos-de-toros.md` | Qué datos del toro entran al match y de dónde salen |
| `docs/pantallas.md` | Las 8 pantallas, sus estados y los componentes compartidos |
| `docs/convenciones-tecnicas.md` | Tests, validación, errores, estructura, persistencia, LLM |
| `docs/definiciones-de-negocio.md` | **N1 a N10**: categorías, quién paga, neutralidad, métricas |
| `docs/plan-de-trabajo.md` | Contratos de T0 + las 38 tareas con criterios de aceptación |
| `docs/validacion-mercado.md` | Competencia, mercado argentino y evidencia del dolor |
| `docs/conceptos-dominio-y-negocio.md` | El mundo del tambo, explicado para devs |
| `docs/analisis-idea-04-matching-reproductivo.md` | El análisis del rodeo real y por qué las reglas originales fallaban |
| `docs/fuentes-datos-toros.md` | Fuentes de datos de toros, escalas y licencias |
| `docs/adr/000{1,2,3}-*.md` | **Las tres decisiones que mandan** |
| `fixtures/herd-farm-a.json` | **293 animales reales, anonimizados** |
| `AgroMatch Design System.dc.html` | El lenguaje visual: tipografía, color, controles, badges |

### En Notion (workspace *Dario Cuevas's Space*)

Página **Hackathon: contexto y criterios** → **Torinder**, con 11 subpáginas espejo de los documentos y la base **Tareas Torinder** (38 tareas con dependencias, criterios y contratos publicados).

**Notion es para el estado del trabajo. El repo es para la verdad técnica.** Si no coinciden, gana el repo.

---

## 4. Lo que ya está decidido

### Negocio (N1–N10)

| # | Decisión |
|---|---|
| N1 | **AgroMatch** (producto) + **Torinder** (vertical genético) |
| N3 | Categorías del MVP: **maquinaria, veterinaria y genética**. Insumos queda afuera |
| N4 | El productor **no paga**; el proveedor paga suscripción. **Sin comisión sobre el trabajo** |
| N5 | Lo que retiene es **el vertical**, no el marketplace |
| N6 | **El ranking no se vende.** Nunca |
| N7 | Tres niveles de proveedor; el no verificado **se muestra como tal** |
| N8 | Fuera de alcance: pagos, contratos, escrow, seguros, logística |
| N10 | La métrica que predice si el negocio vive: **cuántos tambos vuelven al vertical al mes siguiente** |

### Técnicas

| # | Decisión |
|---|---|
| D1 | **CI** = índice general compuesto propio (ADR-0001) |
| D5 | **Claude Haiku 4.5** (`claude-haiku-4-5`) vía `@anthropic-ai/sdk`, detrás de `LlmClient`. `AI_MODE=live` **también en la demo** |
| D9 | **PostgreSQL + Prisma** con Docker Compose, todo detrás de interfaces de repositorio |
| — | Nx + npm · NestJS `:3333` · React + Vite + Tailwind `:4200` · `packages/shared-types` |
| — | Zod compartido · React Query · shadcn/ui con los tokens del design system · error global `{code, message, details}` |
| — | **Tests solo en los núcleos**; API y front se verifican a mano y el PR dice cómo |

### ADR

| ADR | Qué decidió |
|---|---|
| **0001** | Clasificación por cupos + **zona gris** en las alertas de salud (SCS 3,10–3,18 y PL 0,00–0,20 marcan `corrective` sin bajar de tier). El gate de salud se mantiene aparte del CI a propósito |
| **0002** | **El vertical va enchufado al núcleo**: se borran `MatchResult`/`MatchSet`, cada `Bull` es una `Capability`, `B4` arma un `Need` sintético y llama a `matchNeed`, `A4` se parte en `scoreOneCandidate` + `scoreCandidates` |
| **0003** | Fuente y licencia de datos de toros para producción |

---

## 5. Las reglas que no se negocian

1. **La IA no calcula.** Recibe un JSON de hechos y redacta. Cada número de una explicación tiene que existir en los hechos (RN-17, RN-18).
2. **El ranking no se compra** ni depende de la empresa (RN-34).
3. **Escala única CDCB.** Lo que no la declara, no entra al motor (RN-01).
4. **La compatibilidad es un ranking** ("#1 de 12"), nunca una probabilidad (RN-15, RN-33).
5. **Todo dato inventado dice que es inventado** (RN-37).

**Y una de datos:** un faltante **nunca** se rellena con un promedio. O el registro queda afuera, o compite sin ese rasgo y la interfaz lo dice.

---

## 6. Quién hace qué

**Se divide por flujo de punta a punta, no por capa.** Cada dev hace API **y** pantalla de su flujo.

| Dev | Su flujo | Tareas | Horas |
|---|---|---|---|
| **A** | **El motor** (transversal, sin pantalla) | A1–A5, M2, M3 + el chat (C6, B7, D8) | 14,5 |
| **B** | **Necesidad → proveedores** | M4, M5, M6, M7 + panel del asesor (B6, D6) + B5 | 13,5 |
| **C** | **Excel → rodeo clasificado** | C1, C2, B2, B3, D2, D3 | 13,5 |
| **D** | **Swipe → explicación → plan** | D1, C4, B4, D4, D5, C5 | 12,5 |

**El motor no se reparte:** lo usan dos flujos y se duplicaría la lógica.

**Tres piezas son de todos y van primero:** la **semilla** (contratos + paquetes + esqueleto de la API `B1`, 40 min, una persona), el **sistema visual** (`D1`, 2 h, lo hace D) y el **cliente del LLM** (`C1`, lo hace C y lo publica apenas está).

**Hitos:** **I1** (hora 9) el flujo de C entero; **I2** (hora 13) los de B y D; **congelamiento** a la hora 16.

---

## 7. Los datos

**`fixtures/herd-farm-a.json`: 293 animales reales de un tambo argentino, anonimizados.** Es la fixture de todos los tests del vertical y de la demo.

Detalles que rompen implementaciones ingenuas:
- `visualId` es **texto**: hay caravanas como `C136`.
- **2 animales sin padre**: no se puede controlar consanguinidad.
- Un solo toro tiene **41 hijas** (14% del rodeo).
- **50% del rodeo es A2/A2**; 51 animales son A2/A2 **y** BB.

**El catálogo de toros todavía no existe** (tarea A6): hoy se usa uno semilla. La ficha mínima está en `docs/motor-datos-de-toros.md`.

**Los 5 números del pitch, todos con fuente:** 80-90% de las labores tercerizadas · mercado de servicios USD 2.000-3.000 M/año · *"el acuerdo se cierra por WhatsApp"* · 8.895 tambos · **47% a carne con las reglas viejas contra 30% con las nuestras**.

⚠️ **Sin verificar:** cuántos tambos genotipan, el precio local del genotipado, el uso de semen sexado y **si el proveedor pagaría**.

---

## 8. Estado y pendientes

| Área | Estado |
|---|---|
| Análisis, negocio, dominio, motor, pantallas, convenciones, ADR | ✅ Cerrado |
| 38 tareas en Notion con dependencias y criterios | ✅ Listas |
| **Código** | ❌ **Cero** |

**Pendientes que no bloquean:** confirmar el nombre · precios · proveedor del genotipado · validar el algoritmo de clasificación con el analista · si el proveedor pagaría · mover la raíz de Notion al teamspace y borrar la página duplicada.

---

## 9. El próximo paso: specs de todo (SDD, solo la fase de specs)

**Qué hacemos ahora:** escribir **las specs de absolutamente todo**, a partir de este handoff. **Solo specs.** Nada de plan de tareas ni de ejecución: eso lo hace después cada dev por su camino.

### Las cinco specs

| Spec | Alcance | Quién la ejecuta después |
|---|---|---|
| **SPEC-SHARED** | Contratos, esqueleto de la API, sistema visual y cliente del LLM: las tres piezas comunes | La semilla + D + C |
| **SPEC-CORE** | `matching-core` y `genetics-core`: filtros, score, ranking, cría esperada, caseínas, clasificación y hechos | **A** |
| **SPEC-FLOW-NEED** | Necesidad → proveedores: intake, API, pantalla y proveedores semilla | **B** |
| **SPEC-FLOW-HERD** | Excel → rodeo clasificado: carga, clasificación, endpoints y pantallas | **C** |
| **SPEC-FLOW-MATCH** | Swipe → explicación → plan | **D** |

### Qué tiene que tener cada spec

1. **Propósito** en una línea, atado a la narración del MVP.
2. **Alcance:** qué entra y **qué queda explícitamente afuera**.
3. **Requisitos con ID** (`REQ-xx`), cada uno con escenarios verificables: *dado / cuando / entonces*.
4. **Contratos:** qué consume y qué produce, con las firmas exactas.
5. **Reglas que respeta:** las `RN-xx` y los `ADR` que aplican. **Si un requisito contradice una RN o un ADR, no se escribe: se frena y se discute.**
6. **Criterios de aceptación**, los mismos que después son los tests o la verificación manual.
7. **Riesgos y supuestos.**

### Las reglas de esta fase

- **Las specs no inventan producto.** Todo requisito sale de este handoff, del modelo de dominio, de las pantallas o de un ADR. Si algo no está decidido, **se marca como pregunta abierta**, no se resuelve por las suyas.
- **Se escriben las cinco antes de empezar cualquier plan.** Si una spec necesita algo de otra, se anota la dependencia.
- **Se congelan cuando las cuatro personas las leyeron.** A partir de ahí, cambio de spec = cambio aditivo o ADR nuevo.
- **Después**, cada dev toma su spec y sigue solo: plan de tareas y ejecución, por su camino.

---

## 10. Si abrís un chat nuevo

```
Leé MASTER-HANDOFF.md antes de responder. <tu pedido>
```

Y si el tema es profundo, el handoff te dice a qué documento ir. **No hay que leer todo: hay que leer este y lo que este mande.**
