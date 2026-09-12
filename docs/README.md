# Torinder: matching reproductivo inteligente para tambos

> Track AGRO. **Estado: concepto validado a nivel inicial.** Todavía no hay código.

## Qué es (una línea)
**Conectamos y resolvemos las necesidades del agro.** Cualquier necesidad entra en lenguaje natural ("necesito quien me are 40 ha", "necesito veterinario para el rodeo", "quiero mejorar los sólidos de mi tambo"); un motor determinístico calcula quién la resuelve mejor y la IA explica por qué.

**Dos capas:**
- **Núcleo:** necesidad × capacidad. Filtros duros (cobertura, disponibilidad, capacidad, certificaciones) + score + explicación.
- **Verticales:** donde la necesidad tiene un cálculo real detrás. El primero es **Torinder**, el matching genético para tambos, que además es el que retiene al usuario mes a mes.

> ⚠️ **Cambio de alcance (sep-2026):** antes el producto era solo el matching genético. Ahora eso es un vertical. Los documentos ya están actualizados; **las tareas de Notion todavía reflejan el alcance anterior y hay que ampliarlas.**

## Documentos

| Archivo | Contenido |
|---|---|
| [conceptos-dominio-y-negocio.md](conceptos-dominio-y-negocio.md) | **Empezar por acá.** Dominio del tambo, genética explicada para devs y modelo de negocio |
| [plan-de-trabajo.md](plan-de-trabajo.md) | **Plan del MVP para 4 devs.** Contratos de T0, tareas A1–D7 con criterios de aceptación, dependencias, hitos I1/I2 y reglas de trabajo |
| [skills/torinder-notion-sync/SKILL.md](skills/torinder-notion-sync/SKILL.md) | Skill **obligatoria** para los agentes: sincroniza cada tarea con la base "Tareas Torinder" de Notion y publica contratos. En T0 se copia a `.claude/skills/` del monorepo |
| [modelo-de-dominio.md](modelo-de-dominio.md) | **Base para las tareas y la arquitectura.** Lenguaje ubicuo, entidades, reglas de negocio (RN-xx), flujos (Fx), módulos del monorepo, alcance del MVP y decisiones abiertas |
| [analisis-idea-04-matching-reproductivo.md](analisis-idea-04-matching-reproductivo.md) | Análisis de la idea y del documento de mercado, simulación de las reglas sobre el rodeo real, fórmula de compatibilidad y arquitectura |
| [validacion-mercado.md](validacion-mercado.md) | Competidores, mercado argentino, diferencial y evidencia del dolor |
| [fuentes-datos-toros.md](fuentes-datos-toros.md) | De dónde salen los datos de toros, la restricción de escala y la estrategia |
| `insumos/` | Documento de mercado original (`.docx`) y Excel real de 293 animales (`.xlsx`) |

## Decisiones tomadas
- Es una **plataforma multi-tambo**, no una herramienta para un solo tambo.
- **STYN queda fuera** del alcance de la hackathon.
- **El % de compatibilidad lo calcula un motor determinístico**: promedio de los valores de los padres, probabilidades de Mendel, y filtros de consanguinidad y facilidad de parto. **La IA explica, interpreta objetivos y normaliza datos. Nunca inventa números.**
- **Neutralidad:** ninguna central paga por aparecer más arriba en las recomendaciones.
- **Escala:** los datos de toros tienen que estar en escala CDCB (EE. UU.), la misma del Excel.
- **Stack:** Node, NestJS + React, monorepo.

## Veredicto hasta acá

| Plano | Veredicto |
|---|---|
| Para ganar la hackathon | **Fuerte:** problema real, datos reales de un tambo, rol de la IA claro y bien planteado, demo memorable |
| Como negocio | **Prometedor, con dos patas sin validar:** cuántos tambos genotipan y quién paga frente a los programas gratis de las centrales |

**No es humo, siempre que el pitch sea honesto:**
- La IA no "encuentra el match": hace accesible un análisis que hoy requiere un genetista.
- "Todos los toros del mercado" es hoja de ruta, no algo que ya funcione.

## Evidencia a favor
- Un tambero confirmó que las centrales son parciales y solo recomiendan sus pajuelas.
- El Excel real incluye una tabla hecha a mano por el productor ("¿Qué medir con esto? → Acciones") y el pedido explícito de *"mejorar información de los toros (NAAB)"*.
- No existe una herramienta neutral ni una que explique genética en lenguaje simple.

## Pendientes
1. **¿Cuántos tambos genotipan en Argentina?** Es el riesgo de mercado más grande.
2. **Estimar el valor genético sin genotipado**, a partir del padre y del padre de la madre. Abre el producto a todo tambo que insemina.
3. ¿Quién paga? La hipótesis es el asesor multi-tambo.
4. Definición del **CI** y **proveedor del genotipado**. La hipótesis es Neogen Igenity, en escala CDCB.
5. A qué central corresponden los prefijos NAAB `029` y `094`.
6. Corregir las reglas de clasificación: hoy mandan el 47% del rodeo a carne cuando la intención era 30%.
7. Página de producto (one-pager) para el equipo y el jurado.
