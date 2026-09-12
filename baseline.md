# Baseline — contexto para abrir cualquier chat

> **Cómo se usa:** pegá este archivo (o pedile al agente que lo lea) como **primera lectura de un chat nuevo**. Con esto alcanza para hablar de producto, negocio, motor, IA, plan o pitch sin repetir nada. Si el tema necesita más profundidad, al final está dónde buscar.
>
> Última actualización: septiembre de 2026.

---

## 1. Qué construimos

**AgroMatch: conectamos y resolvemos las necesidades del agro.** El productor escribe lo que necesita en lenguaje natural; un **motor determinístico** calcula quién se lo resuelve mejor y la **IA explica por qué**.

| Capa | Qué resuelve | Cómo puntúa |
|---|---|---|
| **Núcleo** | Cualquier necesidad: "necesito quien me are 40 ha en Río Cuarto la semana que viene" | Cobertura, disponibilidad, capacidad, precio, reputación |
| **Vertical genético (Torinder)** | "Quiero mejorar los sólidos de mi tambo" | Motor genético: clasificación del rodeo, cría esperada y compatibilidad |

**Por qué las dos capas:** el núcleo da alcance, el vertical da profundidad **y retención**. En marketplaces de servicios la desintermediación se lleva hasta el 80% de los ingresos; nadie vuelve a una lista de contratistas, pero sí volvés todos los meses a algo que te dice qué hacer con cada vaca.

**Contexto:** hackathon, track AGRO, **4 devs, ~20 horas**. El pitch lo arma otro compañero.

---

## 2. Estado

| Área | Estado |
|---|---|
| Análisis y validación de mercado | ✅ Cerrado, con fuentes |
| Modelo de dominio (39 reglas, 12 flujos) | ✅ Cerrado |
| Definiciones de negocio | ✅ Cerradas (N1–N10) |
| Motor: qué datos usa y de dónde salen | ✅ Documentado |
| Plan de trabajo y 37 tareas en Notion | ✅ Listo |
| **Código** | ❌ **Cero.** Lo primero es T0 |

**PR abierta:** [#2 docs → develop](https://github.com/JoaquinBenegas2/agromatch-monorepo/pull/2), sin conflictos.

---

## 3. Decisiones tomadas

### Negocio

| # | Decisión |
|---|---|
| N1 | Nombre: **AgroMatch** (producto), **Torinder** (vertical genético). Falta confirmarlo, no bloquea |
| N3 | Categorías del MVP: **maquinaria, veterinaria y genética**. Insumos queda afuera: ahí Agrofy, Agroads y Mercado Libre ya dominan |
| N4 | El **productor no paga**. El proveedor paga **suscripción**. **No cobramos comisión sobre el trabajo**, porque cobrar un porcentaje premia irse por afuera |
| N5 | Lo que retiene es el **vertical**, no el marketplace |
| N6 | **El ranking no se vende.** Nunca. Si hay patrocinio, va fuera del ranking y etiquetado |
| N7 | Tres niveles de proveedor: no verificado, verificado, con historial. El no verificado **se muestra como tal** |
| N8 | Fuera de alcance: pagos, contratos, escrow, seguros, logística |
| N10 | La métrica que predice si el negocio vive: **cuántos tambos vuelven al vertical al mes siguiente** |

### Producto y técnica

| # | Decisión |
|---|---|
| — | **La IA nunca produce los números del motor.** Recibe un JSON de hechos y redacta. Todo número de una explicación tiene que existir en los hechos |
| — | **Escala única CDCB** en todo valor genético. Lo que no la declara, no entra al motor |
| — | La compatibilidad es un **ranking relativo** ("#1 de 12"), nunca una probabilidad |
| — | **Multi-establecimiento** desde el día uno, con datos aislados |
| D5 | **LLM: Claude Haiku 4.5** (`claude-haiku-4-5`, `@anthropic-ai/sdk`), detrás del puerto `LlmClient` |
| D9 | Persistencia: **PostgreSQL + Prisma** con Docker Compose. Todo detrás de interfaces de repositorio; los fixtures entran por un seed que se puede volver a correr |
| — | Usuarios **simulados** con header `x-user-id`. Sin login |
| — | La demo corre **100% real**: Claude en vivo, nada pregrabado |
| RN-09 | Una **alerta de salud nunca manda una vaca a carne**: baja un nivel o activa apareamiento correctivo. Carne se decide solo por cupo |

---

## 4. Los datos que tenemos

### Rodeo real (el activo más fuerte)

`fixtures/herd-farm-a.json`: **293 animales reales** de un tambo argentino, **anonimizados**. Nacidos entre 2023 y 2025, hijos de 28 toros.

Detalles que importan:
- `visualId` es **texto**: hay caravanas como `C136`.
- **2 animales sin padre**: no se puede controlar consanguinidad.
- Un solo toro tiene **41 hijas** (14% del rodeo).
- **50% del rodeo es A2/A2**; 51 animales son A2/A2 **y** BB.
- El Excel original **no está en el repo** y mezcla filas de notas con los datos.

**Hallazgo que sostiene el pitch:** aplicando las reglas del documento de mercado tal como están, **el 47% del rodeo va a carne** cuando la intención era 30%. Con las reglas corregidas, 30%.

### Toros

Todavía **no tenemos catálogo real** (tarea A6). La ficha mínima que hay que conseguir:

| Obligatorio | Deseable |
|---|---|
| `naab`, raza, central, fuente, escala CDCB | Caseínas beta y kappa |
| Padre del toro (`sireNaab`) → filtro de consanguinidad | Precio por dosis |
| Facilidad de parto → filtro en vaquillonas | Eficiencia (FS, RFI) e índice CI |
| Tipo de semen (sexado, convencional, carne) | |
| Valores genéticos: leche, grasa, proteína, vida útil y **SCS** | |

**Nunca se rellena un faltante con un promedio.** O el toro queda fuera, o compite sin ese rasgo y la tarjeta lo dice.

**De dónde salen:** catálogos públicos de ABS, Genex y Semex Argentina + consultas públicas de CDCB. En producción: licencia con CDCB, catálogos cargados por las centrales y PDFs que suben los propios tambos.

**Lo que falta y hay que admitir:** **haplotipos y defectos genéticos**. Los programas de apareamiento serios los filtran siempre. Entran como un filtro duro más, al lado de la consanguinidad.

---

## 5. Números verificados (los únicos que se usan)

| Número | Fuente |
|---|---|
| Los contratistas hacen el **80-90%** de siembra, cosecha y aplicaciones | BCR, Infocampo |
| Servicios agrícolas: **USD 2.000-3.000 millones al año**, ~12.000 contratistas | Infocampo |
| *"El acuerdo se cierra por WhatsApp y la palabra alcanza"* | Infocampo |
| **8.895 tambos** y 1.484.000 vacas (dic-2025), en caída y concentrándose | OCLA |
| **293 animales reales**; 47% a carne con las reglas viejas contra 30% con las nuestras | Nuestro análisis del Excel |

⚠️ **Sin verificar:** cuántos tambos genotipan en Argentina, el precio local del genotipado, el uso de semen sexado y **si el proveedor pagaría**. No se dicen como si fueran datos.

---

## 6. Contra quién competimos

| Player | Qué hace | Diferencia |
|---|---|---|
| **Malevo**, **Agrofinders** (AR) | Publican proveedores de servicios y filtran | Nosotros **interpretamos y calculamos**, con explicación |
| **Agrofy**, **Agroads**, **Mercado Libre Agro** | Venden **productos** | Nosotros resolvemos **necesidades**, que son servicios |
| Centrales de semen (ABS, Semex, CRV) | Programas de apareamiento con **sus** toros | Nosotros somos **neutrales** |

**No se encontró ningún producto, ni en Argentina ni afuera, que interprete la necesidad en lenguaje natural y la matchee con un motor.** Ese es el hueco.

---

## 7. El repo

**`agromatch-monorepo`** (GitHub, privado). Ya tiene scaffold **Nx 23 + npm**.

| Proyecto | Qué es |
|---|---|
| `apps/backend` | NestJS + Prisma (SQLite), prefijo `/api`, puerto 3333 |
| `apps/frontend` | React + Vite + Tailwind, puerto 4200 |
| `packages/shared-types` | **Los contratos** (`@org/shared-types`) |
| `packages/matching-core`, `genetics-core`, `ai` | Se generan en T0 con Nx |

**Git Flow:** ramas `feature/<ID>-<nombre>` desde `develop`, conventional commits con scope.

**Principio:** todo apunta a los núcleos. `matching-core` y `genetics-core` no conocen Nest, ni la base de datos, ni el LLM. Un vertical no toca el núcleo: **se registra**.

---

## 8. El plan

**T0 (hora 0 a 2, los 4 juntos):** contratos congelados, paquetes generados, fixtures y fakes. **Nadie escribe lógica antes.**

| Dev | Es dueño de | Tareas |
|---|---|---|
| **A** | Motores: matcheo genérico y genética | M2, M3, A1–A6 |
| **B** | Backend y clasificación | M5, B1–B7 |
| **C** | IA e ingesta de archivos | M4, C1–C6 |
| **D** | Frontend | M6, D1–D7 |

**Cómo no se pisan:** después de T0 cada uno trabaja contra **sustitutos** (stubs, fakes, MSW). Las dependencias reales se resuelven en **I1 (hora 9)** e **I2 (hora 13)**. Congelamiento en la hora 16.

**Dentro del MVP, con alcance recortado:** el **chat sobre el rodeo** (3 herramientas de consulta, no ejecuta acciones) y el **panel del asesor** (tambos, distribución por tier y comparativa). A absorbe las dos pantallas porque termina los motores antes.

**Lo único fuera del MVP:** extracción de catálogos PDF y su pantalla. El catálogo va curado a mano.

---

## 9. La demo

Arranca por el núcleo y entra al vertical desde ahí:

1. *"¿Qué necesitás?"* → dos necesidades de servicios resueltas con proveedores reales, marcados como no verificados.
2. La tercera: *"quiero mejorar los sólidos de mi tambo"* → abre el motor genético con el Excel real.
3. El rodeo clasificado: **"las reglas clásicas mandan el 47% a carne; nosotros el 30%"**.
4. La ternera **3031** (que las reglas mandaban a carne por mastitis) se rescata con un toro de SCS bajo. La IA lo explica.

**Profundidad antes que amplitud.** Amplitud con proveedores inventados es humo y se nota.

---

## 10. Dónde está cada cosa

**Repo, rama `docs`:**

| Archivo | Contenido |
|---|---|
| `CLAUDE.md` | Contexto para el agente de cada dev |
| `docs/plan-de-trabajo.md` | Contratos de T0 y las tareas con criterios de aceptación |
| `docs/modelo-de-dominio.md` | Lenguaje ubicuo, entidades, reglas RN-xx, flujos |
| `docs/motor-datos-de-toros.md` | Qué datos del toro entran al match |
| `docs/definiciones-de-negocio.md` | Negocio cerrado |
| `docs/validacion-mercado.md` | Competencia, mercado y evidencia |
| `docs/conceptos-dominio-y-negocio.md` | El mundo del tambo explicado para devs |
| `docs/analisis-idea-04-matching-reproductivo.md` | Análisis del rodeo real y de las reglas originales |
| `docs/fuentes-datos-toros.md` | Fuentes de datos de toros y licencias |
| `fixtures/herd-farm-a.json` | El rodeo real anonimizado |

**Notion** (workspace Dario Cuevas's Space): página **Hackathon: contexto y criterios** → **Torinder**, con las subpáginas 1 a 8 y la base **Tareas Torinder** (37 tareas con dependencias y criterios de aceptación).

---

## 11. Preguntas abiertas

| Qué | Quién lo cierra | ¿Bloquea? |
|---|---|---|
| Qué es exactamente el índice **CI** del genotipado | El analista o el laboratorio | No |
| Validar el algoritmo de clasificación (cupos y alertas) | Analista + tambero | No |
| Confirmar el nombre | El equipo | No |
| Precios | Después de la hackathon | No |
| **¿El proveedor pagaría?** | Hablar con un contratista y un veterinario | No, pero es la hipótesis más floja |
| D9: memoria o Prisma | El equipo en T0 | No |

---

## 12. Cómo quiero que trabajes en el chat

- **Verificá antes de afirmar.** Si no lo podés verificar, decí que no está verificado.
- **No inventes números ni fuentes.** Ningún dato entra al pitch sin fuente.
- Si algo de acá está mal o quedó viejo, **decilo en vez de seguirme la corriente**.
- Respuestas **cortas** por defecto; profundizá solo si el tema lo pide.
- Español rioplatense.
