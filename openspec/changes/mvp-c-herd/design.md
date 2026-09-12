## Context

El cambio parte del scaffold de `mvp-0-foundation`: los contratos Zod y TypeScript ya viven en `@org/shared-types`, `@org/genetics-core` contiene stubs de clasificación, `@org/ai` expone el `LlmClient`, Nest ya registra repositorios Prisma y el frontend ya tiene el shell, las tabs, el cliente tipado, React Query y handlers MSW del flujo. Ver `proposal.md` para la motivación y `specs/flow-herd/spec.md` para los requisitos.

La implementación cruza cuatro proyectos Nx (`@org/ai`, `@org/genetics-core`, `@org/backend` y `@org/frontend`) y debe preservar las firmas públicas existentes. En particular, `HerdIngestionPort.applyMapping(file, mapping, farmId)` no recibe el nombre del archivo; el backend ya conserva `filename` junto con los bytes y la propuesta en `HerdImportRepo`.

El Excel real no forma parte del repositorio. La automatización se apoya en un `.xlsx` sintético y en `herd-farm-a.json`; la validación de los conteos reales queda como verificación manual.

## Goals / Non-Goals

**Goals:**

- Separar la interpretación asistida del Excel de la confirmación y persistencia, de modo que el LLM nunca escriba datos por sí solo.
- Mantener la clasificación como lógica TypeScript pura, determinística y reproducible dentro de `@org/genetics-core`.
- Orquestar importación, invalidación, clasificación y consultas mediante módulos Nest pequeños, protegidos por los guards existentes.
- Integrar las dos pantallas en las tabs y convenciones existentes del frontend, con estados explícitos de carga, vacío, error y éxito.
- Conservar las firmas de los contratos existentes, incluida `HerdIngestionPort.applyMapping`.

**Non-Goals:**

- Hacer que el LLM calcule perfiles, complete faltantes, asigne tiers o redacte motivos.
- Introducir una cola, almacenamiento externo de archivos o historial de versiones del rodeo y de sus clasificaciones.
- Resolver matching, catálogos PDF, panel del asesor o chat.
- Rediseñar el shell, la navegación o el kit visual compartido.

## Decisions

### 1. La ingesta se divide en lectura determinística, propuesta del LLM y aplicación determinística

`@org/ai` incorporará SheetJS y una clase `HerdIngestion` que implemente el puerto existente. Un lector interno abrirá solo la primera hoja y producirá una matriz de valores sin convertir identificadores a número. La detección recorrerá las filas hasta encontrar la primera con al menos seis textos no vacíos y evidencia de valores numéricos en las siguientes cinco filas no vacías; de no hallarla lanzará un error de dominio traducible a `HEADER_ROW_NOT_FOUND`.

`proposeMapping` enviará al `LlmClient` los encabezados y hasta cinco filas de muestra. Los valores de columnas que parezcan identificadoras (`VISUALID`, `Caravana` y aliases equivalentes) se enmascaran, aunque sus encabezados sí se envían. La salida se valida exclusivamente con `MappingProposalSchema`; los reintentos y `LLM_SCHEMA_MISMATCH` siguen siendo responsabilidad del `LlmClient` existente.

`applyMapping` no llama al LLM. Verifica campos obligatorios, destinos duplicados, rangos y formatos; normaliza fechas de Excel y texto; genera ids estables para el resultado de una confirmación; calcula `category` con `deriveCategory`; y separa hembras, rechazos y avisos. Una fila con identificación y fecha pero sin ningún rasgo se conserva con `profile: null`; faltantes parciales o valores fuera de rango rechazan la fila. Los rangos iniciales serán los defaults de Q2 de la spec.

Alternativa considerada: inferir columnas y limpiar filas completamente con el LLM. Se descarta porque haría variables los resultados, debilitaría la validación y violaría RN-17/RN-18.

### 2. El nombre de archivo se completa en la orquestación sin cambiar el puerto

El endpoint inicial guarda bytes, `filename` y propuesta en `HerdImportRepo`. Al confirmar, el servicio recupera ese registro, llama a `applyMapping` con su firma actual y, antes de persistir o responder, reemplaza `profile.source` de cada hembra con perfil por el `filename` almacenado. El adaptador usa un marcador interno neutro durante el parseo; ese valor no sale de la API ni se guarda.

Esta decisión conserva compatibilidad con el contrato compartido y garantiza el resultado observable requerido. El test unitario del adaptador comprueba el parseo independientemente del nombre; el test del servicio de confirmación comprueba que el nombre real quede aplicado.

Alternativa considerada: agregar `filename` a `applyMapping`. Se descarta por decisión explícita de conservar la firma. También se descarta un cache en memoria que relacione bytes y nombre porque fallaría tras reiniciar el proceso.

### 3. Confirmar una importación reemplaza el estado efectivo y deja la clasificación ausente

El módulo `herd-import` tendrá controller y service. La carga valida extensión y presencia del archivo, obtiene la propuesta y guarda el import pendiente. La confirmación verifica que el import exista y pertenezca al `farmId`, aplica el mapeo, completa `source`, persiste por `(farmId, visualId)` e invalida la clasificación.

Se preservan las firmas de repositorio. `FemaleRepo.upsertMany` mantendrá el upsert idempotente y eliminará dentro de su implementación Prisma las hembras del tambo que no formen parte del conjunto confirmado, para que el resultado sea un reemplazo real. Para invalidar sin agregar `clearForFarm`, el servicio consulta la clasificación existente y, si existe, llama `replaceForFarm(farmId, previous.goal, [])`; la implementación actual ya interpreta el arreglo vacío como borrado.

Las dos escrituras se ejecutan secuencialmente a través de los puertos actuales. Si la invalidación falla después del reemplazo, la confirmación devuelve error y es reintentable: tanto el upsert como el borrado son idempotentes. No se introduce una abstracción transaccional compartida en este cambio.

Alternativa considerada: ampliar los puertos con operaciones `replaceAll` y `clearForFarm`, o acoplar el servicio a `PrismaService` para una transacción. Se descarta para conservar contratos y el límite repositorio/dominio del scaffold.

### 4. La clasificación usa un orden total estable y una tubería de precedencia explícita

`classifyHerd` filtra primero las hembras sin perfil: no produce `Classification` para ellas. Ordena las restantes por CI descendente y desempata por `visualId` y luego `id`, para que percentiles y cortes sean reproducibles. El percentil usa la posición en ese mismo orden, con 100 para el primer elemento y 0 para el último cuando hay más de uno.

Los tamaños iniciales se calculan redondeando `n * pct / 100`; `ELITE` toma el tramo superior y `BEEF` el inferior, limitado por los elementos restantes para impedir solapamientos. El centro es `COMMERCIAL`. La asignación inicial de semen es `SEXED`, `BEEF` o `CONVENTIONAL` según esos tiers.

Cada clasificación pasa luego, en este orden, por salud/zona gris, protección del objetivo, alerta de descarte y etiquetas informativas. Cada etapa acumula `corrective`, `tags` y `reasons` sin duplicados. Salud puede bajar `ELITE` solo a `COMMERCIAL`; la protección puede rescatar `BEEF` a `COMMERCIAL`; `CULL_ALERT` solo se aplica si coinciden las cuatro condiciones de RN-11 y fuerza `semenType: null`. Al finalizar se recalcula `semenType` a partir del tier efectivo.

`classifyHerdClassic` reutiliza utilidades de orden y armado de resultados, pero aplica solo los umbrales reconstruidos en Q1: carne si CI < 355, SCS > 3,15 o FAT/PRO negativos; sexado si CI > 480, PRO/FAT positivos y SCS < 3,00; convencional en otro caso. No usa objetivo, zona gris ni persistencia.

Alternativa considerada: encadenar reglas como mutaciones dispersas sobre arrays. Se descarta porque hace difícil auditar la precedencia, los motivos y la regla de bajar como máximo un tier.

### 5. Nest separa importación, clasificación y lectura del rodeo

Se crearán tres módulos registrados en `AppModule`:

- `herd-import`: endpoints multipart y confirmación; consume `HERD_INGESTION_PORT`, `HERD_IMPORT_REPO`, `FEMALE_REPO` y `CLASSIFICATION_REPO`.
- `classification`: ejecuta `classifyHerd`, reemplaza la clasificación y construye el resumen, incluido `classifyHerdClassic` sobre las hembras con perfil.
- `herd`: combina `FemaleRepo.listByFarm` con la clasificación vigente por `femaleId`.

Los controllers reutilizan `ZodValidationPipe`, `DomainError`, el `UserGuard` global y `FarmAccessGuard` sobre las rutas con `farmId`. Los servicios traducen estados ausentes a los códigos definidos en la spec. El provider real de ingesta se construirá con `LLM_CLIENT` mediante `useFactory`; en modo fake se conserva el fake para poder ejecutar el frontend aislado, mientras que el registro live usa `HerdIngestion` de `@org/ai`.

Alternativa considerada: un único módulo `herd` con todos los endpoints. Se descarta para mantener separadas la carga temporal, la mutación de clasificaciones y la consulta que también consumirán otros cambios.

### 6. El frontend implementa dos features y conserva el shell como dueño de la navegación

`features/herd-import` modelará el recorrido como estados `idle → proposing → review → confirming → result/error`. Mantendrá una copia editable del mapping y un conjunto de encabezados de baja confianza revisados; `Confirmar` solo se habilita cuando todos fueron tocados o marcados. El resultado se muestra antes de navegar al tablero. El botón compartido `UploadHerdButton` vive en esta feature y solo encapsula el estilo y la navegación.

`features/herd` consultará hembras y resumen con las query keys existentes, clasificará mediante mutation y luego invalidará ambas queries. Filtros y expansión de motivos son estado local derivado. `HERD_NOT_CLASSIFIED` se trata como estado vacío clasificable; una lista de hembras vacía se trata como estado vacío de importación; los demás errores muestran el mensaje real.

`ModulePage` dejará de resolver estas rutas mediante placeholders y montará sus componentes reales; `nav.ts` marcará ambas tabs como implementadas sin cambiar paths ni jerarquía. Las llamadas nuevas se agregan al cliente/hook tipado existente. Los handlers de `herd` continúan disponibles solo cuando `VITE_MOCKS=true`; para la verificación integrada se quita su registro del worker o se ejecuta con mocks deshabilitados.

Alternativa considerada: rutas de nivel superior o una barra de tabs propia dentro de cada pantalla. Se descarta porque duplicaría navegación que ya controla `AppShell`.

### 7. La verificación sigue los límites de cada proyecto Nx

Los algoritmos de clasificación y de ingesta tendrán tests Vitest en sus paquetes. Los servicios y controllers Nest tendrán tests Jest con repositorios/puertos falsos para autorización, errores, persistencia e invalidación. El frontend tendrá tests Vitest/Testing Library para los estados y recorridos críticos. La verificación final se ejecutará mediante targets Nx de test, lint, typecheck y build sobre los cuatro proyectos afectados.

La prueba con el Excel real y `AI_MODE=live` se mantiene manual porque el archivo y las credenciales no están versionados.

## Risks / Trade-offs

- [La detección heurística puede elegir una fila textual que no sea el encabezado] → exigir evidencia numérica posterior, cubrir títulos/notas en tests y devolver un error corregible en vez de persistir.
- [El LLM puede dar baja confianza o una propuesta inválida] → validar con Zod, permitir edición humana y bloquear la confirmación de columnas dudosas no revisadas.
- [Completar `source` fuera del adaptador reparte una responsabilidad entre capas] → centralizar el enriquecimiento en un único servicio de confirmación y cubrirlo con un test específico.
- [El reemplazo del rodeo y la invalidación no comparten una transacción Prisma] → operaciones idempotentes y confirmación reintentable; aceptar el riesgo acotado para no romper los puertos del MVP.
- [Los empates de CI pueden caer a lados distintos de un corte] → desempate estable y documentado; no ampliar cupos por empate para conservar porcentajes y ausencia de solapamiento.
- [Las reglas clásicas reconstruidas pueden dar 138 o 139 animales] → calcular siempre desde datos y mostrar el conteo devuelto, sin hardcodearlo; validar el rango acordado.
- [Los nuevos componentes pueden colisionar con `mvp-d-match` en la barra del módulo] → mantener `AppShell` como único dueño de las tabs y exponer solo el botón reutilizable desde `features/herd-import`.
- [SheetJS aumenta superficie de dependencia y procesamiento de archivos no confiables] → aceptar solo `.xls/.xlsx`, limitar el trabajo a la primera hoja y no ejecutar macros ni contenido externo.

## Migration Plan

1. Agregar SheetJS a `@org/ai` mediante el workspace npm y publicar el adaptador sin cambiar contratos.
2. Reemplazar el stub de clasificación y validar los fixtures antes de conectar persistencia.
3. Incorporar servicios/controllers Nest y registrar el provider real; aplicar ninguna migración nueva, porque las tablas y el campo `goal` ya existen.
4. Montar las features del frontend conservando inicialmente los handlers MSW para desarrollo aislado.
5. Ejecutar la suite Nx y la verificación integrada con mocks deshabilitados; luego realizar la prueba manual con el Excel real.

El rollback consiste en revertir el registro de los tres módulos, restaurar `FakeHerdIngestion` y volver las dos tabs a placeholder. Los datos de `Female`, `Classification` y `HerdImport` usan el esquema existente, por lo que no requieren rollback de base de datos.
