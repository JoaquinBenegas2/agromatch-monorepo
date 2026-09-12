# ADR-0001: Clasificación por tiers — cupos, alertas de salud y el doble conteo del CI

> Resuelve las decisiones abiertas **D1** (qué es el CI) y **D2** (validar el algoritmo de clasificación) de [modelo-de-dominio.md](../modelo-de-dominio.md). Afecta RN-07 a RN-12.

## Estado

**Aceptada**, con una modificación a RN-09 (sección 4). Vale para el MVP de la hackathon. Queda una validación de campo pendiente que puede hacer cambiar el peso relativo de CI (sección 6).

## Contexto

`docs/analisis-idea-04-matching-reproductivo.md` (sección 3) corrió las reglas de clasificación originales sobre el rodeo real (293 animales) y encontró bugs de especificación: tiers que se pisaban (sumaban 125%), RFI contradictorio, cortes duros sin margen (3.15 vs 3.16 en SCS decidía todo) y 47% del rodeo yendo a carne cuando la intención era 30%.

El modelo de dominio ya corrigió la mayoría de esos bugs con RN-07 a RN-12: percentiles en vez de umbrales fijos (RN-07), cupos por reposición sin superposición (RN-08), protección por objetivo para A2/BB (RN-10), alerta de descarte separada de la clasificación normal (RN-11) y precedencia explícita (RN-12). Quedaban dos preguntas sin cerrar: **D1** (qué es el CI) y **D2** (si el algoritmo de clasificación resultante es válido).

**D1 ya se resolvió** (ver Engram `torinder/ci-index-definition-resolved` y el glosario actualizado en [conceptos-dominio-y-negocio.md](../conceptos-dominio-y-negocio.md)): CI **no es Calving Interval**. Es un **"Índice General"** compuesto propio, definido en `insumos/Gestion de genotipados.docx`, que se usa para armar los cupos de RN-08. Sobre el rodeo real, CI correlaciona **0.84 con PL, 0.58 con FAT, 0.54 con PRO y −0.47 con SCS**.

Esa correlación deja un problema abierto en RN-09: **las alertas de salud bajan de tier por SCS > 3,18 o PL < 0 de forma binaria, pero CI ya pondera esos mismos rasgos.** Es el "doble castigo" que señaló el análisis original. Además, el corte sigue siendo dpuro: en el rodeo real hay **29 animales con SCS entre 3,13 y 3,18**, pegados al umbral.

## Decisión

### 1. El doble conteo no es un bug — es una técnica de selección válida, y se mantiene

En mejoramiento genético animal es práctica estándar combinar un **índice de selección** (un promedio ponderado, como CI) con **niveles de descarte independientes** para rasgos que representan un riesgo catastrófico y no solo "un punto más o menos" (mastitis crónica, vida productiva negativa). Un CI alto puede esconder un SCS malo si el resto de los rasgos compensa; el gate de salud existe justamente para que eso no pase. **RN-09 se mantiene como filtro aparte de CI**, a propósito.

### 2. Lo que sí se corrige: el corte binario sin margen

Se reemplaza el corte único por una **zona gris** alrededor del umbral. Un animal en la zona gris **nunca pierde el tier por ese solo motivo**, pero entra al matching (F3) con corrección forzada en ese rasgo — el mismo mecanismo de `corrective` que ya existe en RN-09 para las bajas de tier.

| Rasgo | Zona segura | Zona gris (→ `corrective: true`, no baja de tier) | Riesgo (→ baja de tier, como hoy) |
|---|---|---|---|
| SCS | < 3,10 | 3,10 – 3,18 | > 3,18 |
| PL | > 0,20 | 0,00 – 0,20 | < 0,00 |

Los bordes de la zona gris son un punto de partida razonable (cubren los 29 animales pegados al viejo umbral) y quedan como parámetro configurable, igual que `sexedPct`/`beefPct` en RN-08.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Sacar el gate de salud y confiar solo en CI | Pierde el filtro contra riesgos catastróficos — es exactamente el escenario que RN-09 existe para evitar |
| Descontar de CI la porción explicada por PL/SCS antes de aplicar el gate | Matemáticamente más prolijo, pero no se puede descomponer un índice cuya fórmula exacta no está confirmada (proveedor del genotipado aún sin confirmar del todo, ver `fuentes-datos-toros.md`) — no entra en el tiempo de la hackathon |
| Dejar el corte duro tal cual está | Es lo que hay hoy: 29 animales deciden su categoría por 0,01 de diferencia en SCS, que es ruido de la genómica de ternera, no señal real |

## RN-09 actualizada

> **RN-09 · Las alertas de salud NUNCA mandan a carne, y respetan una zona gris.**
> SCS > 3,18 o PL < 0: una `ELITE` baja a `COMMERCIAL`; una `COMMERCIAL` queda con **apareamiento correctivo** (el rasgo entra en `corrective` y pesa el doble en el score).
> SCS entre 3,10 y 3,18, o PL entre 0,00 y 0,20 (**zona gris**): el tier **no cambia**, pero el rasgo entra igual en `corrective` para el matching.
> Los umbrales de la zona gris son parámetros del establecimiento, con los valores de arriba como default.

## Consecuencias

- Menos animales cambian de categoría por ruido de medición.
- El filtro de salud sigue funcionando como red de seguridad real contra riesgos catastróficos, sin duplicar el castigo de forma binaria.
- Más animales entran a matching con `corrective: true` — hay que verificar en la implementación que el bono de corrección no termine dominando el ranking cuando se acumulan varios rasgos correctivos a la vez (no estaba cubierto por los tests existentes; agregar caso de prueba).
- `genetics-core` necesita los dos parámetros nuevos de zona gris (`scsGrayZone`, `plGrayZone`) además de `sexedPct`/`beefPct` de RN-08.

## Pendiente de validar en campo

La pregunta que sigue abierta no es "qué es CI" (ya resuelta) sino: **¿un veterinario o contratista de inseminación confía en un índice general para clasificar, o prefiere mirar SCS/PL siempre por separado?** La respuesta no cambia esta decisión de arquitectura, pero sí el peso relativo que conviene darle a CI frente a los rasgos individuales en el cupo de RN-08 — quedaría para una revisión de esta ADR una vez hecha esa charla.

## Referencias

- [analisis-idea-04-matching-reproductivo.md](../analisis-idea-04-matching-reproductivo.md), sección 3
- [modelo-de-dominio.md](../modelo-de-dominio.md), RN-07 a RN-12, sección 12 (decisiones abiertas)
- Engram: `torinder/ci-index-definition-resolved`, `torinder/notion-motor-survey-adr-prep`
- Independent culling levels + index selection: teoría clásica de selección animal (Hazel & Lush, 1942)
