# ADR-0003: Fuente y licencia de datos de toros en producción

> No bloquea el MVP de la hackathon (A6/M7 siguen usando el catálogo curado a mano de 20-30 toros). Es la decisión para el pitch, la hoja de ruta y el primer release real. Ver [fuentes-datos-toros.md](../fuentes-datos-toros.md) y [motor-datos-de-toros.md](../motor-datos-de-toros.md).

## Estado

**Aceptada**, como plan de producto/hoja de ruta.

## Contexto

`fuentes-datos-toros.md` ya identificó tres canales que se complementan (licencia CDCB, centrales cargan su catálogo, tambos/asesores suben catálogos) y el problema del huevo y la gallina: las centrales entran cuando hay tambos, los tambos cuando hay catálogo. Quedaban tres preguntas sin cerrar:

1. **¿En qué orden se arranca de verdad?** El documento dice "los canales 1 y 3 resuelven el arranque", pero no dice si se persigue la licencia de CDCB *antes* de lanzar o en paralelo — y una licencia comercial con un organismo de EE. UU. puede demorar meses.
2. **¿Qué pasa cuando un tambo sube su propio catálogo (canal 3)?** El flujo F5 dice "un humano confirma" antes del upsert, pero no dice si ese catálogo entra directo al **catálogo neutral compartido** (visible para todos los tambos de la plataforma) o si queda acotado al establecimiento que lo subió. Esto importa porque la neutralidad y la calidad del catálogo compartido son el diferencial del producto — un PDF mal cargado por un tambo no debería contaminar lo que ve otro tambo.
3. **¿Qué hacemos con los toros que no tienen escala CDCB** (por ejemplo, evaluación exclusivamente ACHA)? La regla del producto ya dice "escala CDCB o nada" (RN-01), pero eso implica dejar afuera genética 100% local. Nadie lo había dicho en voz alta como decisión de producto.

## Decisión

1. **Los canales 1 (licencia CDCB) y 3 (autoservicio de tambos/asesores) arrancan en paralelo desde el día uno post-hackathon**, porque ninguno depende de que un tercero (una central) diga que sí. El canal 2 (centrales cargan su catálogo) es un objetivo comercial que se persigue en paralelo, pero **el lanzamiento del producto no espera a ninguna central** — si tardan en sumarse, el catálogo igual crece por canal 1 y 3.
2. **Un catálogo subido por un tambo o asesor (canal 3) entra primero como privado a ese establecimiento.** Es usable de inmediato para el matching de ese tambo. Recién se promueve al catálogo neutral compartido después de una revisión humana — la misma idea que ya tenía el flujo F5, ahora explícita como un scope de visibilidad (`private` → `global`), no solo una validación de formato.
3. **Prioridad de fuente cuando el mismo NAAB aparece en más de un canal:** catálogo de una central verificada > consulta directa a CDCB > catálogo subido por un tambo/asesor. Al hacer el upsert por NAAB (RN-22), gana la fuente de mayor prioridad; las demás quedan guardadas para trazabilidad pero no pisan el valor mostrado.
4. **Los toros sin escala CDCB quedan explícitamente fuera del catálogo, en el MVP y en el v1.** No se inventa una conversión casera. Es una brecha conocida que se dice así en el pitch, no se esconde — igual que ya se hace con los haplotipos en `motor-datos-de-toros.md`.
5. **Si la licencia de CDCB se demora o se rechaza, el producto igual opera** con los canales 2 y 3 solos. El canal 1 suma cobertura y prolijidad legal, pero nunca es condición para que la plataforma funcione.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Esperar la licencia de CDCB antes de lanzar | Deja el producto rehén de un trámite externo sin control de tiempos |
| Todo catálogo subido entra directo al catálogo global, sin scope privado | Rompe la promesa de neutralidad/calidad si un tambo carga mal un PDF — un solo catálogo desprolijo contamina lo que ven todos |
| Aceptar toros de cualquier escala con una conversión aproximada propia | Interbull prohíbe explícitamente presentar evaluaciones re-expresadas sin el proceso MACE oficial (ver investigación previa, Engram); inventar una conversión casera rompe el espíritu de "nunca inventamos números" que ya rige para la IA (RN-17/18) |

## Consecuencias

- Falta agregar a la ficha del toro un campo de alcance: `visibility: 'private' | 'global'` y `ownerFarmId?` cuando es privado. No estaba en los contratos de `motor-datos-de-toros.md` — se suma cuando se construya el canal 3 real (post-hackathon, no bloquea T0 ni A6/M7).
- Falta una regla de prioridad de fuente en el upsert por NAAB para cuando haya más de un canal activo. No aplica al MVP, que usa un solo catálogo curado a mano.
- El pitch puede responder con una posición firme a "¿qué pasa si una central no quiere subir su catálogo?" y "¿qué pasa con la genética 100% argentina?" — que son preguntas típicas de jurado en un producto de datos.

## Referencias

- [fuentes-datos-toros.md](../fuentes-datos-toros.md), secciones 2 y 3
- [motor-datos-de-toros.md](../motor-datos-de-toros.md), sección 4 (flujo F5) y sección 5 (reglas de calidad)
- Engram: `torinder/notion-motor-survey-adr-prep` (investigación previa de licencias CDCB/Lactanet/Interbull/ACHA)
