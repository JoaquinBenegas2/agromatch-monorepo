## 1. Preparar la ingesta de Excel

- [x] 1.1 Instalar `xlsx` como dependencia de workspace de `@org/ai` con npm y verificar que `npm exec nx run @org/ai:build` resuelva SheetJS sin errores.
- [x] 1.2 Definir en `@org/ai` los errores internos y utilidades de lectura de la primera hoja, preservando strings y fechas de Excel, y verificar con Vitest que `C136` nunca se convierta a número.
- [x] 1.3 Implementar la detección de encabezado por seis textos más evidencia numérica posterior y verificar con un `.xlsx` sintético los casos de títulos previos, tabla válida y `HEADER_ROW_NOT_FOUND`.

## 2. Implementar `HerdIngestion`

- [x] 2.1 Implementar `HerdIngestion.proposeMapping` con encabezados, hasta cinco filas, enmascarado de valores identificadores y `MappingProposalSchema`, y verificar con un `LlmClient` fake el prompt, el mapping castellano y el descarte de campos inexistentes.
- [x] 2.2 Implementar la validación de `ColumnMapping` para exigir `visualId`/`birthDate` y rechazar destinos duplicados, y verificar que ambos casos produzcan información traducible a `MAPPING_INCOMPLETE`.
- [x] 2.3 Implementar `applyMapping` para normalizar ids, fechas, padre, caseínas y los ocho rasgos, calcular `category`, generar perfiles CDCB y conservar filas sin genotipado, y verificar los casos de categoría, `profile: null` y aviso RN-24.
- [x] 2.4 Implementar rechazo de filas vacías, notas, faltantes parciales y valores fuera de los rangos acordados, y verificar en Vitest los motivos, el SCS 7,4 y que ningún faltante sea imputado.
- [x] 2.5 Exportar `HerdIngestion` desde `@org/ai` y ejecutar `npm exec nx run @org/ai:test` para verificar el flujo completo con un Excel sintético.

## 3. Implementar la clasificación del rodeo

- [x] 3.1 Reemplazar el stub por el orden estable, percentiles y cupos no superpuestos de `classifyHerd`, excluyendo hembras sin perfil, y verificar con `herd-farm-a` y `herd-farm-b` los porcentajes y percentiles propios de cada tambo.
- [x] 3.2 Implementar zona gris y riesgos de SCS/PL con acumulación sin duplicados de `corrective`, `tags` y motivos, y verificar los escenarios de 3031, élite en zona gris, doble riesgo y umbrales configurables.
- [x] 3.3 Implementar protección A2/BB, etiquetas informativas y precedencia completa hasta `CULL_ALERT`, y verificar `A2_MILK`, las dos alertas, `NO_SIRE`, `semenType` y al menos un motivo determinístico por clasificación.
- [x] 3.4 Implementar `classifyHerdClassic` con los umbrales reconstruidos y sin persistencia ni reglas modernas, y verificar sobre `herd-farm-a` 138–139 `BEEF` y aproximadamente 37 `ELITE`.
- [x] 3.5 Organizar y exportar el módulo de clasificación sin cambiar sus firmas públicas, y verificar `npm exec nx run @org/genetics-core:test` y `npm exec nx run @org/genetics-core:build`.

## 4. Implementar importación y reemplazo en el backend

- [x] 4.1 Ajustar `PrismaFemaleRepo.upsertMany` para que el conjunto confirmado reemplace el rodeo efectivo del tambo sin duplicados ni hembras obsoletas, y verificar con tests de repositorio una reimportación idéntica y otra con ids removidos.
- [x] 4.2 Crear `herd-import` module/controller/service para `POST /farms/:farmId/herd-imports`, validar multipart `.xls/.xlsx`, proponer el mapping y guardar bytes, nombre y propuesta, y verificar 200, `FILE_NOT_SPREADSHEET` y `HEADER_ROW_NOT_FOUND` con Jest.
- [x] 4.3 Implementar `POST /farms/:farmId/herd-imports/:importId/confirm`, verificando existencia y pertenencia del import, y comprobar con Jest `HERD_IMPORT_NOT_FOUND`, `MAPPING_INCOMPLETE` y rechazo de un import de otro tambo.
- [x] 4.4 Enriquecer en el servicio de confirmación cada `profile.source` con el `filename` guardado sin modificar `HerdIngestionPort.applyMapping`, y verificar que ni el marcador interno ni un nombre genérico se persistan o salgan en la respuesta.
- [x] 4.5 Persistir el reemplazo e invalidar una clasificación previa mediante `replaceForFarm(farmId, previous.goal, [])`, y verificar que repetir la confirmación sea idempotente y que el resumen posterior responda `HERD_NOT_CLASSIFIED`.
- [x] 4.6 Registrar `HerdIngestion` en `AI_PROVIDERS` para modo live conservando `FakeHerdIngestion` en modo fake, y verificar con tests de providers que ambos modos resuelvan el puerto sin construir prematuramente el cliente live.

## 5. Implementar clasificación y consultas en el backend

- [x] 5.1 Crear `classification` module/controller/service para clasificar y reemplazar por tambo guardando el objetivo, y verificar que una segunda llamada sustituya a la primera y que un rodeo sin perfiles devuelva 409 `HERD_EMPTY`.
- [x] 5.2 Construir `GET /farms/:farmId/classifications/summary` con contadores completos de tiers/tags, `withoutProfile` y `classicRulesBeefCount`, y verificar sumas, 138–139 clásicas y 409 `HERD_NOT_CLASSIFIED`.
- [x] 5.3 Crear `herd` module/controller/service para combinar todas las hembras con su clasificación o `null`, y verificar que las hembras sin perfil y un tambo todavía no clasificado aparezcan correctamente.
- [x] 5.4 Aplicar `ZodValidationPipe`, `FarmAccessGuard` y los errores `DomainError` acordados en los cinco endpoints, y verificar con Jest 400/403/404/409/422 y el formato uniforme `{ code, message, details }`.
- [x] 5.5 Registrar los tres módulos en `AppModule` y verificar con un test e2e de Nest el recorrido subir → confirmar → clasificar → resumen/listado usando `x-user-id`.

## 6. Crear la capa de datos del frontend

- [x] 6.1 Agregar funciones y hooks tipados para upload, confirmación, hembras, clasificación y resumen reutilizando los esquemas y query keys existentes, y verificar con Vitest validación de respuestas e invalidación tras mutaciones.
- [x] 6.2 Ajustar los handlers MSW de `herd` para representar propuesta, confirmación, reclasificación, estados vacíos y errores del flujo, y verificar que solo se activen con `VITE_MOCKS=true`.

## 7. Construir la pantalla de carga del rodeo

- [x] 7.1 Crear `features/herd-import` con el estado `idle/proposing/review/confirming/result/error`, zona drag-and-drop y validación de archivo, y verificar visualmente y con Testing Library los cuatro estados obligatorios.
- [x] 7.2 Implementar la tabla editable de mapeo, badges de confianza y registro de columnas menores a 0,8 revisadas, y verificar que `Confirmar` permanezca deshabilitado hasta revisar todas las dudosas.
- [x] 7.3 Implementar la confirmación y el resultado con `rowsOk`, rechazos y warnings, mostrando errores mediante `ErrorMessage`, y verificar el recorrido 293 filas/2 avisos con los fixtures y el mensaje real de `HEADER_ROW_NOT_FOUND`.
- [x] 7.4 Crear y exportar `UploadHerdButton`, conectar cierre del resultado con `/motor-genetico/tablero` y verificar navegación desde el botón compartido y desde la propia pantalla.

## 8. Construir el tablero del rodeo

- [x] 8.1 Crear `features/herd` con carga de hembras/resumen, cuatro tarjetas de tier, selector de objetivo y acción `Clasificar`, y verificar que `BALANCED` muestre cerca de 30% `BEEF` y dos `CULL_ALERT` con los fixtures.
- [x] 8.2 Implementar los estados sin rodeo y sin clasificación, diferenciando 409 `HERD_NOT_CLASSIFIED` de otros errores, y verificar las acciones `Subir Excel` y `Clasificar` con Testing Library.
- [x] 8.3 Implementar chips por tier/tag, tabla, expansión de `reasons` y navegación de fila a `/motor-genetico/matching/:femaleId`, y verificar el filtro `MASTITIS_RISK` y la hembra 3031.
- [x] 8.4 Mostrar la comparación "Con las reglas clásicas, N (P%) iban a carne" calculada desde el resumen junto a la tarjeta `BEEF`, y verificar N 138–139 y 47% sin valores hardcodeados.
- [x] 8.5 Montar ambas features desde `ModulePage`, actualizar el estado de sus tabs sin cambiar rutas ni duplicar `ModuleTabBar`, y verificar los route smoke tests, sidebar activo y restricciones de rol existentes.

## 9. Verificar el cambio completo

- [x] 9.1 Ejecutar mediante Nx los tests de `@org/ai`, `@org/genetics-core`, `@org/backend` y `@org/frontend`, y corregir hasta que los cuatro targets `test` finalicen correctamente.
- [x] 9.2 Ejecutar mediante Nx `lint`, `typecheck` y `build` para los cuatro proyectos afectados, y verificar que todos los targets terminen sin errores ni contratos modificados accidentalmente.
- [ ] 9.3 Con mocks deshabilitados, verificar manualmente por API el recorrido de `farm-a`, incluyendo aislamiento 403, reimportación, invalidación, reclasificación y `total + withoutProfile === 293`, y registrar los resultados en el PR.
- [ ] 9.4 Con `VITE_MOCKS=true` y luego contra la API real, verificar manualmente ambas tabs, los accesos desde `Subir Excel`/estado vacío, filtros, motivos y salida al matching, y adjuntar capturas al PR.
- [ ] 9.5 Con el Excel real y `AI_MODE=live`, verificar manualmente las 13 columnas con confianza, `rowsOk = 293`, notas rechazadas y dos avisos sin padre; si el archivo no está disponible, documentar la limitación y ejecutar el equivalente sintético generado desde el fixture.
