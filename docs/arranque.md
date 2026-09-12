# Arranque: cómo empezamos los 4

> Para leer **una vez, entre todos, antes de escribir código**. Después cada uno va a su flujo y arranca.

---

## Cómo dividimos: por flujo, no por capa

**Cada dev se lleva un flujo de punta a punta: API y pantalla.** Así nadie depende de que otro termine "su capa", y en los hitos cada uno muestra algo andando en vez de ver si encaja.

| Dev | Su flujo | De punta a punta |
|---|---|---|
| **A** | **El motor** (transversal) | Filtros, score, ranking, cría esperada, caseínas y hechos. **No tiene pantalla:** le da de comer a los otros tres |
| **B** | **Necesidad → proveedores** | Intake con IA + API de needs/providers/matches/requests + pantalla "¿Qué necesitás?" |
| **C** | **Excel → rodeo clasificado** | Cliente del LLM + carga del Excel + clasificación + endpoints + pantallas de carga y tablero |
| **D** | **Swipe → explicación → plan** | Sistema visual + explicador + endpoints de matching + swipe + plan |

**Lo único que no se reparte es el motor.** Lo usan dos flujos: si dos personas lo escriben desde el suyo, terminamos con dos versiones de la misma lógica.

**Cómo no se pisan aunque toquen las dos puntas:** en el backend, un módulo por flujo; en el frontend, una carpeta por feature. **Tocan los mismos proyectos, nunca los mismos archivos.**

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
2. `baseline.md`, sección **1b** — la narración del MVP: eso es lo que tiene que funcionar.
3. `docs/convenciones-tecnicas.md` — cómo se escribe el código acá.
4. **Tus tareas en Notion** (base *Tareas Torinder*) y `docs/pantallas.md` si tu flujo tiene pantalla.
5. El ADR que te toca: **A y C → ADR-0001 y ADR-0002**; B y D → ADR-0002.

**Regla de oro del día:** si dudás de algo que está escrito, seguí lo escrito y avisá. Si dudás de algo que **no** está escrito, decidilo, hacelo y dejalo anotado en el PR.

---

## Paso 1 · Las tres piezas que son de todos

Ningún flujo arranca sin esto, así que va primero y **se publica como contrato en Notion apenas está**.

| Pieza | Quién | Cuánto | Qué deja |
|---|---|---|---|
| **La semilla** (contratos + paquetes + esqueleto de la API, `B1`) | Una sola persona | ~40 min | Los 3 paquetes generados, los contratos de T0 con los cambios del ADR-0002, el guard con `x-user-id`, los repos detrás de interfaces y el seed |
| **El sistema visual** (`D1`) | **D** | 2 h | Shell + 9 componentes compartidos + las 8 pantallas como cáscara |
| **El cliente del LLM** (`C1`) | **C** | 1,5 h | `LlmClient` con `AI_MODE=live` y salidas estructuradas |

**Los otros tres, mientras corre la semilla:** terminan el paso 0 y arman el esqueleto de sus carpetas, sin lógica. Cuando la semilla está en `develop`, todos hacen `git pull` y **nadie espera más a nadie**.

---

## Paso 2 · El camino de cada uno

### Dev A — el motor

> Tu flujo no se ve en pantalla, pero **si el tuyo falla, los otros tres muestran números inventados**. Sos el que sostiene la credibilidad del producto.

`A1` rasgos y cría esperada → `A2` caseínas + `A3` filtros → **`M2` motor genérico** → `A4` score genético → `A5` hechos → **`M3` el vertical enchufado** → al final, **el chat** (`C6` + `B7` + `D8`).

**Lo que no te podés olvidar:** `A4` son **dos funciones** (`scoreOneCandidate` devuelve el score **crudo**; `scoreCandidates` va por encima), porque el reescalado 0-100 vive en `M2`. Y `matching-core` **no importa nada** de `genetics-core`: escribí ese test el primer día.

**Publicá temprano:** apenas `A1` está, los otros ya pueden calcular crías esperadas. No esperes a tener todo.

---

### Dev B — necesidad → proveedores

> Tu flujo es **la puerta de entrada del producto**. Es lo primero que ve el jurado.

`M4` intake con IA → `M5` API del núcleo → `M6` pantalla "¿Qué necesitás?" → `M7` proveedores semilla → al final, **el panel del asesor** (`B6` + `D6`) y el **plan del lado API** (`B5`).

**Lo que no te podés olvidar:** la necesidad interpretada **se confirma antes de buscar** (RN-30); la IA nunca publica sola. El contacto del proveedor **aparece recién al crear la solicitud** (RN-36). Y el no verificado **se ve** no verificado.

---

### Dev C — Excel → rodeo clasificado

> Tu flujo es el que **demuestra que los datos son reales**. Es el que se prueba en I1.

`C1` cliente del LLM (publicalo apenas esté) → `C2` carga del Excel → **`B2` clasificación** → `B3` endpoints → `D2` pantalla de carga → `D3` tablero.

**Lo que no te podés olvidar:** el Excel real tiene 293 filas, notas mezcladas, 2 animales sin padre y caravanas con letras. `B2` incorpora la **zona gris del ADR-0001** (SCS 3,10-3,18 y PL 0,00-0,20 marcan `corrective` **sin** bajar de tier). Y en el tablero va la comparación **47% contra 30%**, que es el argumento visual del producto.

---

### Dev D — swipe → explicación → plan

> **Primero el sistema visual, después tu flujo.** Los otros tres construyen sus pantallas encima de lo tuyo: si tardás, tardan todos.

`D1` shell + componentes (2 h, es de todos) → `C4` explicador con control de alucinación → `B4` endpoints de matching → **`D4` swipe** → `D5` plan → `C5` objetivo en lenguaje natural.

**Lo que no te podés olvidar:** `B4` **no llama a `scoreCandidates`**: arma el `Need` sintético y llama a `matchNeed` (ADR-0002). La compatibilidad se muestra como **ranking** ("#1 de 12"), nunca como probabilidad. Y cada número de la explicación tiene que existir en los hechos: si no, se muestra el texto determinístico.

---

## Paso 3 · El ritual de Notion

**No es burocracia: es la única forma que tenemos de vernos sin interrumpirnos.** Un dev que no actualiza Notion es un dev invisible, y los otros tres terminan esperándolo o duplicándole el trabajo.

### Antes de arrancar una tarea (5 minutos)

1. **Abrí tu tarea y leela entera**, incluidos los criterios de aceptación. Esos son tus tests.
2. **Abrí cada tarea de "Depende de".** Mirá el **Estado**, el campo **Produce (contrato)** y, si ya está *Hecha*, la sección **"Contrato entregado"** al final de la página: ahí están las firmas reales y qué sustituto podés borrar.
3. **Mirá "Bloquea a".** Esos van a consumir lo tuyo.
4. **Leé los comentarios.** Ahí avisan los cambios de contrato.
5. **Pasala a "En curso"** con tu nombre y tu rama, y comentá qué sustitutos vas a usar.

### Mientras trabajás

- **Cada criterio que pasa, se tilda.** En el momento, no al final.
- **Si cambiás algo del contrato:** comentario en tu tarea **y** en cada tarea de "Bloquea a". Si el cambio es incompatible, no lo hacés: se habla.
- **Trabado más de 20 minutos** → "Bloqueada", con el motivo y a quién necesitás.

### Al cerrar

1. **Publicás el contrato**: firmas **copiadas del código**, ejemplo real de entrada y salida, qué sustituto se borra y limitaciones.
2. Tildás **Contrato publicado**, pasás a **En revisión** con el PR, y a **Hecha** cuando mergea.
3. **Comentás en cada tarea de "Bloquea a":** *"ya está, podés sacar el stub"*.

### Cómo enterarte de lo que hizo otro sin interrumpirlo

| Lo que querés saber | Dónde está |
|---|---|
| ¿Qué me va a entregar? | Campo **Produce (contrato)** de su tarea |
| ¿Ya está listo para usar? | **Estado** + casilla **Contrato publicado** |
| ¿Cómo lo uso, con qué firma exacta? | Sección **"Contrato entregado"** de su página |
| ¿Por qué lo hizo así? | El **ADR** que menciona su tarea |
| ¿Está trabado esperándome? | Su estado en **Bloqueada** + el comentario |

**Antes de preguntarle algo a otro dev, mirá esos cinco lugares.**

---

## Paso 4 · Fidelidad a los ADR y al negocio

```
ADR  >  modelo-de-dominio.md  >  plan-de-trabajo.md  >  lo que te parezca a vos
```

**Si un documento viejo contradice un ADR, gana el ADR** y avisás para corregir el documento. Ya pasa hoy: ADR-0001 cambió RN-09 y ADR-0002 cambió los contratos del matching.

**No se tocan dentro de un PR:** las reglas **RN-xx**, las decisiones de negocio **N1 a N10**, los **contratos** (salvo agregados) y las decisiones de un **ADR aceptado**. Si tu implementación necesita romper una, **frená y avisá**: se escribe un ADR nuevo y toma 15 minutos.

### El chequeo de 30 segundos antes de abrir el PR

- [ ] ¿Contradice alguna de las 5 reglas que hacen creíble al producto?
- [ ] ¿Toca una RN o una decisión de negocio? ¿Hay ADR que lo respalde?
- [ ] ¿Inventé algún dato que no está etiquetado como inventado?
- [ ] ¿La descripción del PR dice **el ID de la tarea** y **qué RN o ADR implementa**?

---

## Paso 5 · Git y los hitos

- Una tarea = una rama `feature/<ID>-<nombre>` desde `develop` = un PR chico.
- **`git add <tus rutas>`. Nunca `git add -A`.**
- `git pull origin develop` al empezar cada tarea y antes de cada hito.

| Hito | Hora | Qué se prueba |
|---|---|---|
| **I1** | 9 | El flujo de **C** entero: Excel real → mapeo con Claude → rodeo clasificado en pantalla |
| **I2** | 13 | El flujo de **B** y el de **D**: necesidad en texto → resultados → swipe → explicación real → plan |

Como cada uno trae su flujo andando, **los hitos dejan de ser "a ver si encaja" y pasan a ser "mostrá lo tuyo"**.

---

## Paso 6 · Qué significa "de calidad" acá

- [ ] Todos los criterios de aceptación tildados.
- [ ] Núcleos con tests en verde. API y front **verificados a mano, y el PR dice cómo**.
- [ ] Sin `any` en los bordes públicos.
- [ ] Contrato publicado si alguien depende de vos.
- [ ] Revisado por otro dev en menos de 10 minutos.

**Las cinco reglas que hacen creíble al producto:**

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

**Nunca esperes a otro dev.** Siempre hay un sustituto: stub, fake o MSW. Si estás trabado 20 minutos, marcá la tarea como bloqueada y seguí con la siguiente de tu flujo.

**Si algo no entra en el tiempo**, el orden de caída ya está decidido: A6 → M7 → C5 → D5. **Lo P0 no se toca.**
