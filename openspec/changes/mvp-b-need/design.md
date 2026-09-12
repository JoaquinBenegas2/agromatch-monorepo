## Context

La base `contracts-v1` ya provee los esquemas Zod, puertos de repositorio, `LlmClient`, guardas, filtro global de errores, cliente HTTP, MSW y las rutas vacías del shell. `matchNeed` existe como stub T0 y es la única dependencia permitida para construir el flujo hasta que `mvp-a-core` entregue M2. La implementación cruza `packages/ai`, cuatro contextos del backend y dos features del frontend, no agrega dependencias y aplica una corrección aditiva al contrato de `Need` para representar borradores incompletos.

Las restricciones determinantes son RN-30 a RN-39 y ADR-0002: no se busca antes de confirmar, fecha y lugar ausentes siguen ausentes, el matching se delega al núcleo, el contacto se revela solo al crear una solicitud, las semillas nunca aparentan estar verificadas y las necesidades genéticas se derivan a la experiencia dedicada.

## Goals / Non-Goals

**Goals:**

- Mantener una única máquina de estados de la necesidad (`DRAFT` → `OPEN` → `MATCHED`) compartida por API y UI.
- Aislar la variabilidad del LLM en un adaptador validado que preserve campos faltantes y confianza por campo.
- Mantener controladores delgados y concentrar autorización, transiciones y orquestación en servicios de aplicación.
- Hacer que el recorrido completo sea verificable tanto contra la API como con MSW, con los mismos contratos.
- Permitir reemplazar los stubs de matching y clasificación sin cambiar los consumidores de esta ruta.

**Non-Goals:**

- Implementar lógica de ranking, filtros o explicación genérica fuera de `matching-core`.
- Agregar contratos, librerías de UI, geocodificación, audio, pagos, chat, verificación o gestión de proveedores.
- Persistir o mostrar contacto fuera de `ServiceRequest`.
- Convertir el panel del asesor en una herramienta de drill-down, filtrado o exportación.

## Decisions

### 0. `Need` representa la incompletitud sin valores centinela

`NeedSchema.where` y `NeedSchema.window` son opcionales porque RN-30 exige que un `DRAFT` conserve su ausencia real. La API valida ambos al confirmar y ninguna necesidad puede llegar a `OPEN`, `MATCHED` o `CLOSED` sin ellos. Prisma refleja esa temporalidad con columnas JSON anulables. `UpdateNeedBodySchema.confirm` es opcional para permitir correcciones que siguen en `DRAFT`.

Se descartan coordenadas `0,0`, etiquetas como “Sin ubicación”, fechas vacías y casts que oculten campos ausentes: los primeros inventan datos y los últimos rompen Zod/persistencia. Los consumidores que calculan matching deben estrechar la precondición antes de usar ubicación o ventana.

### 1. El intake usa un esquema de salida parcial y proyecta a `Need`

`NeedIntakePort` llamará a `LlmClient.completeJson` con un esquema Zod específico del resultado interpretable: categoría, descripción, magnitud, restricciones, objetivo, ubicación y ventana opcionales, más confianza. El adaptador construirá el `Need` definitivo con `id`, `farmId`, `rawText`, `createdAt` y `status: 'DRAFT'`, y calculará `missingFields` sin completar `where` ni `window`.

Esto evita pedirle al modelo identificadores, estado o metadatos que pertenecen a la aplicación. La alternativa de validar directamente con `NeedSchema` obliga a fabricar campos requeridos cuando el texto es incompleto y contradice RN-30.

El prompt incluye los tres escenarios de la spec como few-shot y ordena conservar números/unidades textuales. Los errores de esquema suben sin transformarse para que el filtro global mantenga los códigos `LLM_*`.

### 2. Las transiciones y permisos viven en servicios de aplicación

Cada módulo mantiene controlador → servicio → puerto. `NeedsService` crea, actualiza, confirma y lista; antes de confirmar calcula faltantes efectivos y solo persiste `OPEN` si `where` y `window` existen. Un `PATCH` sin `confirm` persiste correcciones y conserva `DRAFT`. La verificación de pertenencia usa el usuario inyectado y `farmIds` antes de leer o mutar una necesidad.

La alternativa de distribuir estas reglas entre pipes, controladores y repositorios vuelve inconsistentes los códigos 403/409 y dificulta reutilizar la autorización desde matching, solicitudes y reviews.

### 3. Matching es una orquestación sin ranking propio

`MatchingService` carga la necesidad, valida pertenencia y estado, obtiene capacidades y proveedores filtrados por categoría y llama exactamente a `matchNeed(need, capabilities, providers, listVerticals())`. Persiste la necesidad como `MATCHED` y conserva el tablero/reasons mediante el mecanismo ya disponible en el repositorio; no ordena ni recalcula candidatos.

Durante el stub T0 se acepta que `excluded` esté vacío contra backend. MSW usa el fixture con excluidos para construir y verificar la UI. Cuando M2 llegue, el servicio no cambia. Implementar un ordenamiento temporal en backend fue descartado porque violaría RN-32/RN-34 y crearía un segundo motor.

### 4. Los DTO públicos de proveedor se sanitizan en el límite de lectura

El repositorio conserva `Provider.contact` porque `RequestsService` lo necesita, pero `ProvidersService.listPublic` devuelve una proyección sin la clave `contact`. Matching tampoco incorpora objetos `Provider` en los candidatos. Solo `RequestsService.create` copia el contacto a la `ServiceRequest` luego de validar proveedor, necesidad, pertenencia y estado.

La alternativa de borrar el contacto al cargar el repositorio impide crear la solicitud; confiar en que el frontend no lo muestre filtraría datos sensibles por red y contradice RN-36.

### 5. Reviews actualizan reputación como una operación del servicio

`RequestsService.review` valida rango 1..5, propiedad de la necesidad asociada y existencia de la solicitud. Crea la `Review` y actualiza la reputación con media incremental `(avg * jobs + rating) / (jobs + 1)`. Las dos escrituras quedan detrás de puertos; no se introduce una abstracción transaccional nueva para el MVP.

La alternativa de recalcular desde todas las reviews requiere ampliar `ReviewRepo`, cambio que esta spec no autoriza.

### 6. La pantalla `/mercado` es una máquina de estados local respaldada por React Query

La feature mantiene estados explícitos `idle`, `interpreted` y `results`; carga y error son estados de las mutaciones/queries, no rutas nuevas. Las operaciones HTTP usan React Query y las claves compartidas. Confirmar ejecuta secuencialmente PATCH y matching solo para categorías generales. Para `GENETICS`, confirma y navega a `/motor-genetico/matching` pasando el objetivo como estado de navegación, sin llamar a matches.

Las ediciones inline actualizan un borrador local. Los campos con confianza menor a 0.8 o presentes en `missingFields` se marcan y siguen editables. Volver desde resultados conserva el borrador; editar el texto vuelve a `idle` y una nueva consulta reemplaza la `Need` interpretada.

Los chips de orden crean copias ordenadas del arreglo en memoria. Nunca mutan `rank`; cada tarjeta muestra `#rank de ranked.length`, incluso si cambia el orden visual. Esta separación evita confundir una preferencia de vista con el ranking neutral del motor.

### 7. MSW replica el contrato, no la implementación

Los handlers de la feature responden con `needs.samples.json` y `samples/match-board-machinery.json`, mantienen en memoria la necesidad activa y devuelven contacto solo en la solicitud. Se registran junto a los handlers existentes sin crear un cliente paralelo.

La alternativa de hardcodear datos dentro de componentes haría que la UI no ejercite la secuencia POST → PATCH → matches → request ni los estados de error.

### 8. La semilla es un conjunto de `{ providers, capabilities }` trazable

El fixture conserva el esquema existente y contiene al menos 25 proveedores públicos de maquinaria/veterinaria, más un proveedor genético por central presente en `bulls.seed.json`. Todos quedan `verified: false`, con `source` no vacío y capacidades que permitan observar incluidos y excluidos en al menos dos regiones.

No se infiere relación comercial ni se usa la empresa, la suscripción o la fuente como señal de ranking. La fuente sirve solo para trazabilidad.

### 9. El panel del asesor se apoya en agregación simple y guardas de rol

`AdvisorService` itera únicamente los `farmIds` del usuario, carga hembras y clasificaciones y produce `FarmSummary`; si no hay clasificación, los tiers son cero. Los porcentajes y medias usan solo hembras con perfil y evitan división por cero. El endpoint exige `ADVISOR` o `ADMIN` además de la restricción por granja.

La UI usa `StatCard`, `ComparisonBar`/`Progress` y componentes existentes. La ruta real reemplaza el placeholder, pero la tab sigue dependiendo de los roles del shell; no hay condición visual propia basada solo en datos del cliente.

## Risks / Trade-offs

- [El LLM puede variar entre corridas] → esquema estricto, few-shot, confianza visible y edición antes de confirmar.
- [El stub T0 no produce exclusiones reales] → mantener una sola llamada al núcleo y verificar excluidos con el fixture MSW hasta integrar M2.
- [La actualización de review y reputación no es atómica con los puertos actuales] → mantener ambas operaciones juntas en el servicio y no ampliar contratos; documentar el límite para una futura transacción Prisma.
- [Las fuentes públicas pueden cambiar o carecer de contacto] → guardar URL/nombre de fuente real, no marcar verificación y exigir al menos un teléfono o email solo para elementos usados en solicitudes demo.
- [El panel depende de datos de clasificación aún no integrados] → ceros explícitos cuando faltan clasificaciones y reemplazo transparente del stub al llegar B2/B3.
- [Pasar el objetivo genético como estado de navegación se pierde al recargar] → la pantalla de matching conserva su comportamiento propio; el estado solo mejora la continuidad y no es requisito de persistencia.

## Migration Plan

1. Aplicar la migración anulable y la corrección de `NeedSchema`; rollback: solo volver a `NOT NULL` después de verificar que no existen borradores incompletos.
2. Integrar M4 y registrar el adaptador bajo `NEED_INTAKE_PORT`; rollback: restaurar el provider fake conservando el contrato corregido.
3. Integrar M5 sobre los repos existentes. Rollback: retirar los módulos de `AppModule` sin pérdida de contratos.
4. Integrar M6 y M7; habilitar la página real de `/mercado` y los handlers. Rollback: volver al placeholder del shell y a la semilla anterior.
5. Integrar el anexo; habilitar endpoint y página real solo para roles autorizados. Rollback: devolver la ruta al placeholder, conservando la tab protegida.
6. Antes de cada PR, ejecutar los targets Nx afectados y el recorrido manual indicado por los escenarios del hito.
