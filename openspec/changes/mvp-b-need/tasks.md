## 1. Intake con IA — M4

- [x] 1.0 M4 Corregir `NeedSchema`, `UpdateNeedBodySchema` y persistencia Prisma para admitir `where`/`window` ausentes en `DRAFT`; verificar que el fixture ambiguo valida sin valores centinela y que build/typecheck de dependientes sigue en verde.
- [x] 1.1 M4 Implementar `NeedIntakePort` en `packages/ai/src/need-intake.ts` con salida Zod parcial, prompt few-shot y proyección a `Need`; verificar determinísticamente que el caso de arada devuelve `MACHINERY`, `arada`, `40 HA`, geo de Río Cuarto y ventana de siete días; la corrida live queda en 5.1.
- [x] 1.2 M4 Garantizar que el adaptador preserve `rawText`, fuerce `DRAFT`, emita confianza por campo y derive `missingFields` sin inventar lugar o fecha; verificar determinísticamente los escenarios genético y veterinario ambiguo de REQ-B-01; la corrida live queda en 5.1.
- [x] 1.3 M4 Registrar el adaptador real como `NEED_INTAKE_PORT` conservando la propagación de `LlmSchemaMismatchError`; verificar build/typecheck de los proyectos afectados y que el error se traduzca a 502 `LLM_SCHEMA_MISMATCH` con el filtro global.

## 2. API de necesidades y matching — M5

- [x] 2.1 M5 Implementar el módulo `needs` con `POST /needs`, `PATCH /needs/:id` y `GET /needs`, transiciones `DRAFT` → `OPEN`, actualización sin confirmar y aislamiento por `farmIds`; verificar por curl los escenarios crear/confirmar, `NEED_INCOMPLETE`, `FARM_FORBIDDEN` y exclusión de necesidades sintéticas.
- [x] 2.2 M5 Implementar el módulo `providers` con filtro por categoría y proyección pública sin `contact`; verificar por curl que ningún elemento de `GET /providers` contiene la clave `contact`.
- [x] 2.3 M5 Implementar el módulo `matching` para validar pertenencia/estado, cargar repositorios, llamar exclusivamente a `matchNeed(need, caps, provs, listVerticals())` y persistir `MATCHED`; verificar por curl que un borrador devuelve `NEED_NOT_CONFIRMED` y una necesidad abierta devuelve un `MatchBoard` cuyo primer rankeado tiene compatibilidad 100.
- [x] 2.4 M5 Implementar creación de solicitudes en `requests` con estado `SENT` y contacto, validando proveedor, necesidad, estado y pertenencia; verificar por curl que el contacto aparece recién en `POST /needs/:id/requests`.
- [x] 2.5 M5 Implementar reviews 1..5 y actualización incremental de reputación; verificar el escenario de primera valoración (`avg: 4`, `jobs: 1`) y el error `VALIDATION_ERROR` fuera de rango.
- [x] 2.6 M5 Registrar los cuatro módulos en backend y completar la verificación manual integrada de todos los escenarios M5, además del build/typecheck/lint Nx de los proyectos afectados.

## 3. Home marketplace y proveedores — M6 + M7

- [ ] 3.1 M7 Reemplazar `packages/shared-types/fixtures/providers.json` por al menos 25 proveedores públicos de maquinaria/veterinaria y uno genético por central, todos `verified: false`, con `source` y dos zonas; verificar con el test Nx de `shared-types` y el escenario de cobertura de REQ-B-12.
- [ ] 3.2 M6 Implementar hooks React Query y handlers MSW de `features/market` para intake, confirmación, matching y solicitud usando los fixtures compartidos; verificar el recorrido completo sin backend y que el contacto no exista antes de pedir fecha.
- [ ] 3.3 M6 Implementar el estado cero de `/mercado` según la referencia visual, con saludo real, caja, micrófono deshabilitado y los tres chips del MVP; verificar que entrar no haga `POST /needs` y que el sidebar marque Mercado y oportunidades.
- [ ] 3.4 M6 Implementar la ficha interpretada con cuatro filas editables, avisos para confianza baja/campos faltantes, edición de consulta y confirmación; verificar los escenarios de campo dudoso, corrección y reemplazo de resultados de REQ-B-07.
- [ ] 3.5 M6 Implementar resultados con resumen, ordenamientos locales, `OfferCard`, `#N de M`, `VerificationBadge`, etiqueta Semilla, `AiExplanation`, excluidos y solicitud; verificar que ordenar por precio no haga una request ni altere los ranks y que pedir fecha revele contacto.
- [ ] 3.6 M6 Implementar la derivación de `GENETICS` a `/motor-genetico/matching` sin ejecutar matching genérico, más estados vacío, cargando, error real y sin proveedores; verificar todos los escenarios REQ-B-10/11, build/typecheck/lint Nx y capturas de los tres estados para la PR.

## 4. Anexo: panel del asesor — B6 + D6

- [x] 4.1 B6 Implementar `GET /advisor/overview` calculando `FarmSummary[]` solo para `farmIds` del usuario, con tiers en cero si faltan clasificaciones y guardas `ADVISOR`/`ADMIN`; verificar que `asesor-1` recibe tres tambos con `farm-a.total: 293` y `a2a2Share` ≈ 0,50, y que `tambero-a` recibe `ROLE_FORBIDDEN`.
- [x] 4.2 D6 Implementar `features/advisor` y sus handlers MSW con tarjetas, distribución por tier, A2/A2, BB y comparación de `avgTraits` usando componentes existentes; verificar los cuatro estados y tres tambos en `/motor-genetico/asesor` con mocks.
- [x] 4.3 D6 Reemplazar el placeholder de la ruta preservando la visibilidad de la tab solo para `ADVISOR`/`ADMIN`; verificar que un FARMER no renderiza la tab/pantalla y completar build/typecheck/lint Nx más captura para la PR.

## 5. Validación integral

- [ ] 5.1 Ejecutar con `AI_MODE=live` los tres escenarios M4 y recorrer contra API real y frontend los criterios M5, M6+M7 y B6+D6; verificar que todas las pruebas Nx, migraciones, capturas y contratos publicados quedan en verde.
