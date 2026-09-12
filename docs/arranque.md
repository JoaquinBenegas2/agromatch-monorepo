# Arranque: cómo empezamos los 4

> Para leer **una vez, entre todos, antes de escribir código**. Después cada uno va a su sección y arranca.

---

## Paso 0 · Los cuatro, en paralelo (15 minutos)

Cada dev, **en su propia carpeta** (clon propio, no compartido):

```bash
git clone <repo> && cd agromatch-monorepo
git checkout develop && git pull
npm install
cp .env.example .env        # y pegá tu ANTHROPIC_API_KEY
npm run db:up && npm run db:migrate
npm run dev                 # backend :3333, frontend :4200
```

Mientras compila, leé **en este orden** y nada más:

1. `CLAUDE.md` — qué construimos y las reglas que no se negocian.
2. `docs/convenciones-tecnicas.md` — cómo se escribe el código acá.
3. **Tu tarea en Notion** (base *Tareas Torinder*): archivos, qué consume, qué produce y criterios de aceptación.
4. El ADR que te toca: **A y B → ADR-0001 y ADR-0002**, C y D → solo ADR-0002.

**Regla de oro del día:** si dudás de algo que está escrito, seguí lo escrito y avisá. Si dudás de algo que **no** está escrito, decidilo, hacelo y dejalo anotado en el PR.

---

## Paso 1 · La semilla (25 minutos, UNA persona)

Lo único que bloquea a los demás. Sale del contenido de la tarea **T0** en Notion.

- Generar los 3 paquetes: `npx nx g @nx/js:lib packages/matching-core` (ídem `genetics-core` y `ai`).
- Pegar los contratos en `packages/shared-types` **tal como están en T0**, con los cambios del ADR-0002 ya aplicados: sin `MatchResult` ni `MatchSet`, con `MatchCandidate` / `MatchBoard`, y `VerticalEngine` devolviendo score crudo.
- Stubs ingenuos con la firma final + fakes de la IA.
- Mergear a `develop`.

**Los otros tres, mientras tanto:** terminan el paso 0 y preparan el esqueleto de sus carpetas (sin lógica).

**Cuando la semilla está en `develop`, todos hacen `git pull` y arrancan.** A partir de ahí, nadie espera a nadie.

---

## Paso 2 · Cada uno con lo suyo

### Dev A — los motores

**Tu ventaja:** no dependés de nadie y todo lo tuyo es función pura, así que tus tests son baratos y rápidos.

| Orden | Tarea | Detalle |
|---|---|---|
| 1 | **A1** rasgos y cría esperada | Es la base de todo lo demás |
| 2 | **A2** caseínas y **A3** filtros | Cortas e independientes entre sí |
| 3 | **M2** motor genérico | Filtros duros + score + **el reescalado 0-100 vive acá**, no en el vertical (ADR-0002) |
| 4 | **A4** score genético | Dos funciones: `scoreOneCandidate` (un par hembra×toro, score **crudo**) y `scoreCandidates` por encima |
| 5 | **A5** hechos + **M3** el vertical enchufado | `GeneticsVertical` implementa `VerticalEngine` y se registra |
| 6 | Después: **D6** panel del asesor y **D8** chat | Son pantallas simples y para entonces D está saturado |

**Tu regla de oro:** `matching-core` **no importa nada** de `genetics-core`. El registro pasa al arrancar la API. Escribí el test que lo verifica el primer día.

---

### Dev B — backend y clasificación

**Tu ventaja:** los contratos ya definen cada ruta y su respuesta. No inventás la API, la implementás.

| Orden | Tarea | Detalle |
|---|---|---|
| 1 | **B1** esqueleto | Guard con `x-user-id`, repos **detrás de interfaces**, seed que carga el rodeo real |
| 2 | **B2** clasificación | Cupos + alertas + **zona gris de ADR-0001** (SCS 3,10-3,18 y PL 0,00-0,20 no bajan tier, pero marcan `corrective`) |
| 3 | **B3** endpoints de clasificación | Con `classifyHerd` real, ya no el stub |
| 4 | **M5** API del núcleo | needs, providers, matches, requests |
| 5 | **B4** matching | **Arma el `Need` sintético y llama a `matchNeed`**, no a `scoreCandidates` (ADR-0002). El contrato HTTP no cambia |
| 6 | **B5** plan, **B6** panel, **B7** objetivo y chat | |

**Tu regla de oro:** el controlador valida con zod y no piensa. El servicio orquesta. **Prisma no se importa fuera del repositorio.**

---

### Dev C — IA e ingesta

**Tu ventaja:** trabajás contra Claude de verdad desde el primer minuto, así que las sorpresas aparecen temprano.

| Orden | Tarea | Detalle |
|---|---|---|
| 1 | **C1** cliente del LLM | `claude-haiku-4-5`, `AI_MODE=live`, **salidas estructuradas** para todo JSON. Ojo: Haiku no acepta `thinking: adaptive` ni `effort` |
| 2 | **C2** carga del Excel | Es la tarea más larga tuya. Probala con el Excel real: 293 filas, notas mezcladas, 2 sin padre, caravanas con letras |
| 3 | **C4** explicador | Con el control de alucinación: cada número tiene que existir en los hechos |
| 4 | **M4** intake de necesidades | Texto libre → `Need`, **el usuario confirma antes de buscar** |
| 5 | **C5** objetivo, **C6** chat | |

**Tu regla de oro:** la IA **nunca** devuelve un número que no venga de los hechos. Si falla la validación, se muestra el texto determinístico y listo.

---

### Dev D — frontend

**Tu ventaja:** con MSW no esperás a nadie. **Tu riesgo:** sos el camino crítico de la demo, así que cuidá las horas.

| Orden | Tarea | Detalle |
|---|---|---|
| 1 | **D1** estructura + mocks | Router, selector de usuario, cliente tipado, MSW con los fixtures |
| 2 | **M6** "¿Qué necesitás?" | Texto libre → necesidad interpretada **editable** → resultados |
| 3 | **D2** carga del rodeo y **D3** tablero | En el tablero va el momento del pitch: 47% contra 30% |
| 4 | **D4** swipe | **La pantalla estrella.** Dedicale el tiempo que pide |
| 5 | **D5** plan | |

**Tu regla de oro:** la compatibilidad se muestra como **ranking** ("#1 de 12"), nunca como probabilidad. Y un proveedor no verificado **se ve** como no verificado.

---

## Paso 2.5 · El ritual de Notion

**No es burocracia: es la única forma que tenemos de vernos sin interrumpirnos.** Un dev que no actualiza Notion es un dev invisible, y los otros tres terminan esperándolo o duplicándole el trabajo.

### Antes de arrancar una tarea (5 minutos)

1. **Abrí tu tarea y leela entera**, incluidos los criterios de aceptación. Esos son tus tests.
2. **Abrí cada tarea de "Depende de".** Mirá tres cosas: el **Estado**, el campo **Produce (contrato)** y, si ya está *Hecha*, la sección **"Contrato entregado"** al final de la página. Ahí están las firmas reales y qué sustituto podés borrar.
3. **Mirá "Bloquea a".** Esos son los que van a consumir lo tuyo: lo que escribas tiene que servirles a ellos, no solo a vos.
4. **Leé los comentarios de tu tarea.** Ahí es donde avisan los cambios de contrato.
5. **Pasala a "En curso"** con tu nombre y tu rama, y dejá un comentario diciendo qué sustitutos vas a usar.

### Mientras trabajás

- **Cada criterio que pasa, se tilda.** No al final: en el momento.
- **Si cambiás algo del contrato:** comentario en tu tarea **y** comentario en cada tarea de "Bloquea a". Si el cambio es incompatible, no lo hacés: se habla.
- **Trabado más de 20 minutos** → "Bloqueada", con el motivo, qué necesitás y de quién, mencionando la tarea que te bloquea.

### Al cerrar

1. **Publicás el contrato** en tu página: firmas **copiadas del código** (no de memoria), un ejemplo real de entrada y salida, qué sustituto se puede borrar y las limitaciones conocidas.
2. Tildás **Contrato publicado**, pasás a **En revisión** con el link del PR, y a **Hecha** cuando mergea.
3. **Comentás en cada tarea de "Bloquea a":** *"ya está, podés sacar el stub"*.

### Cómo enterarte de lo que hizo otro sin interrumpirlo

| Lo que querés saber | Dónde está |
|---|---|
| ¿Qué me va a entregar? | Campo **Produce (contrato)** de su tarea |
| ¿Ya está listo para usar? | **Estado** + la casilla **Contrato publicado** |
| ¿Cómo lo uso, con qué firma exacta? | Sección **"Contrato entregado"** al final de su página |
| ¿Por qué lo hizo así? | El **ADR** que menciona su tarea |
| ¿Está trabado esperándome? | Su estado en **Bloqueada** + el comentario |

**Antes de preguntarle algo a otro dev, mirá esos cinco lugares.** Si la respuesta no está ahí, entonces sí preguntá, y de paso avisale que le falta escribirlo.

---

## Paso 2.6 · Fidelidad a los ADR y al negocio

Hay cosas que **no se cambian dentro de un PR**, por más razonable que parezca el cambio en el momento.

### El orden de autoridad

```
ADR  >  modelo-de-dominio.md  >  plan-de-trabajo.md  >  lo que te parezca a vos
```

**Si un documento viejo contradice un ADR, gana el ADR** y avisás para que se corrija el documento. Hoy ya pasa: ADR-0001 cambió RN-09 (zona gris) y ADR-0002 cambió los contratos del matching.

### Lo que no se toca por cuenta propia

- **Las reglas RN-xx** del modelo de dominio.
- **Las decisiones de negocio N1 a N10** (categorías, quién paga, neutralidad, verificación).
- **Los contratos de `shared-types`**, salvo agregados.
- **Las decisiones de un ADR aceptado.**

Si tu implementación necesita romper una de esas, **eso no es un detalle técnico: es una señal**. Frená, avisá y, si el equipo está de acuerdo, se escribe un **ADR nuevo numerado** y recién ahí cambia. Toma 15 minutos y evita que el producto se vuelva otra cosa sin que nadie lo haya decidido.

### El chequeo de 30 segundos antes de abrir el PR

- [ ] ¿Mi cambio contradice alguna de las 5 reglas que hacen creíble al producto?
- [ ] ¿Toca una regla RN-xx o una decisión de negocio? Si sí, ¿hay ADR que lo respalde?
- [ ] ¿Inventé algún dato que no está etiquetado como inventado?
- [ ] ¿La descripción del PR dice **el ID de la tarea** y **qué RN o ADR implementa**?

---

## Paso 3 · Cómo nos sincronizamos

### Git

- Una tarea = una rama `feature/<ID>-<nombre>` desde `develop` = un PR chico.
- **`git add <tus rutas>`. Nunca `git add -A`.** Si en `git status` aparece algo que no tocaste, no va en tu commit.
- `git pull origin develop` al empezar cada tarea, y sí o sí antes de cada hito.

### Notion

La skill `torinder-notion-sync` lo hace sola, pero el trato es este:

| Momento | Qué pasa |
|---|---|
| Arrancás | La tarea pasa a **En curso**, con tu nombre y tu rama |
| Te trabás más de 20 min | **Bloqueada**, con el motivo y a quién necesitás |
| Terminás | **Publicás el contrato** en la tarea (firmas reales copiadas del código, ejemplo de entrada y salida, qué sustituto se puede borrar) y **avisás a las tareas que dependen de vos** |

### Los dos hitos

| Hito | Hora | Qué se prueba |
|---|---|---|
| **I1** | 9 | Excel real → mapeo con Claude → rodeo clasificado, de punta a punta |
| **I2** | 13 | Necesidad en texto → resultados → swipe → explicación real → plan |

15 minutos, los 4 juntos, cambiando sustitutos por piezas reales y corriendo el recorrido entero.

### Cambios de contrato

- **Aditivo** (campo opcional, tipo nuevo, endpoint nuevo): lo hacés, lo anotás en la tarea y avisás.
- **Incompatible** (renombrar, borrar, cambiar un tipo): **frenás y lo hablamos.** Rompe a los cuatro.

---

## Paso 4 · Qué significa "de calidad" acá

**Terminado es esto, no menos:**

- [ ] Todos los criterios de aceptación de la tarea, tildados.
- [ ] Núcleos con sus tests en verde. API y front **verificados a mano, y el PR dice cómo** ("subí el Excel real, clasificó 293, la 3031 quedó en COMMERCIAL").
- [ ] Sin `any` en los bordes públicos.
- [ ] Contrato publicado en Notion si alguien depende de vos.
- [ ] Revisado por otro dev en menos de 10 minutos.

**Las cinco reglas que hacen que el producto sea creíble:**

1. La IA **no calcula**: explica lo que calculó el motor.
2. El ranking **no se compra** ni depende de la empresa.
3. Todo valor genético en **escala CDCB**, o no entra.
4. La compatibilidad es **ranking**, no probabilidad.
5. Todo dato inventado **dice que es inventado**.

**Los cinco errores que ya sabemos que van a aparecer:**

- Pedirle al LLM que devuelva un número del motor.
- Importar `genetics-core` desde `matching-core`.
- Importar Prisma fuera del repositorio.
- Tocar la carpeta de otro "porque era un toque".
- Llegar al ensayo con la base sucia: **antes de cada ensayo, reset + seed.**

---

## Si algo se complica

**Nunca esperes a otro dev.** Siempre hay un sustituto: stub, fake o MSW. Si estás trabado 20 minutos, marcá la tarea como bloqueada y seguí con la siguiente.

**Si algo no entra en el tiempo**, el orden de caída ya está decidido: A6 → M7 → C5 → D5. Lo P0 no se toca.
