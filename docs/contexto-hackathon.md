# Contexto de la hackathon: qué buscamos y cómo evaluar ideas

> Documento marco. Sirve para generar y comparar ideas **nuevas** con el mismo criterio que usamos para analizar Torinder (`torinder/`).

---

## 1. Objetivo

**Ganar la hackathon en el track AGRO** con una **solución de mercado convertida en producto**, no con una demo técnica.

No alcanza con que funcione. El jurado tiene que salir convencido de tres cosas:
1. **El problema es real** y alguien lo sufre hoy.
2. **La solución funciona** en vivo, con datos creíbles.
3. **Hay un negocio:** alguien paga, hay un mercado y no es algo que ya exista gratis.

---

## 2. Restricciones del equipo

| Restricción | Valor |
|---|---|
| Equipo | 4 desarrolladores, cada uno trabajando con agentes de IA |
| Tiempo de desarrollo | ~20 horas efectivas (evento de ~24 h) |
| Stack | Node: NestJS (back) + React (front), monorepo |
| Tracks del evento | AI · WEB3 · AGRO — **la elección de track es por idea**, no fija para todo el equipo. Torinder compite en AGRO. Checksum compite en AI (posible sub-categoría "AI Automation", nombre oficial sin confirmar). |
| Región | Argentina, con foco probable en Córdoba |
| Fuera de alcance | STYN (ERP propio de gestión de tambos): no se usa ni se menciona |

⚠️ **A completar:** reglas oficiales, **criterios del jurado y su peso**, fecha, premios, sponsors (APIs o datos que conviene usar) y si la IA es obligatoria.

---

## 3. Qué es una idea ganadora: los 10 filtros

Salen de lo que aprendimos analizando Torinder. Una idea tiene que pasar **todos**. Si falla uno, se corrige o se descarta.

| # | Filtro | Pregunta de control | Cómo se valida |
|---|---|---|---|
| 1 | **Dolor real** | ¿Quién sufre esto HOY y cómo lo resuelve ahora? | Hablar con un usuario real; conseguir un documento, una planilla o un testimonio |
| 2 | **Datos reales** | ¿Hay datos para la demo? ¿Son reales o simulados con honestidad? | Tener el dataset antes de la hackathon |
| 3 | **La IA es central y honesta** | Si le sacás la IA, ¿el producto pierde valor? ¿La IA inventa números en decisiones que cuestan plata? | Motor determinístico para calcular + IA para lenguaje, carga de datos, agentes y explicación |
| 4 | **No reinventa la rueda** | ¿Qué existe hoy? ¿Qué hacemos distinto? | Relevar competidores y escribir el diferencial en una línea |
| 5 | **No es simplón** | ¿Es más que un formulario + chatbot? | Tiene optimización, agentes que actúan, impacto en plata o efectos de red |
| 6 | **Negocio** | ¿Quién paga? ¿Por qué canal llega? ¿Contra qué compite, incluida la alternativa gratis? | Hipótesis explícita de quién paga y cómo |
| 7 | **Mercado** | ¿Cuántos clientes potenciales hay? ¿Se puede escalar (región, otros rubros)? | Un número con fuente |
| 8 | **Demo memorable** | ¿Se entiende en 30 segundos? ¿Tiene un momento "wow" en 3 minutos? | Guion de demo escrito antes de codear |
| 9 | **Factible en 20 h** | ¿El núcleo funciona a mitad del evento? | Alcance recortado + contratos definidos en la primera hora |
| 10 | **Alcance honesto** | ¿Qué funciona hoy y qué es hoja de ruta? | Separarlo explícitamente en el pitch |

---

## 4. Anti-patrones ("gato por liebre")

- **"La IA calcula X"** cuando en realidad X sale de una fórmula. Un jurado técnico lo detecta.
- **Chatbot pegado encima** de un CRUD, como única IA del producto.
- **Prometer cobertura total** ("todos los toros", "todos los campos") con una demo de 20 registros.
- **Datos inventados presentados como reales.**
- **Competir contra algo gratis** sin explicar por qué pagarían.
- **Idea sin usuario:** nadie la pidió y nadie la validó.
- **Demo en vivo sin ensayar en el lugar:** si depende de internet o de una API externa, se prueba la conexión del evento y se ensaya ahí, no en casa.

---

## 5. Matriz para comparar ideas

Puntuar de 1 a 5 cada criterio. **Torinder queda como referencia.**

| Criterio | Peso | Torinder |
|---|---|---|
| Dolor real con evidencia | 20% | 4 |
| Rol de la IA (central y honesto) | 15% | 4 |
| Diferencial frente a lo existente | 15% | 4 |
| Demo memorable | 15% | 4 |
| Factibilidad en 20 h | 15% | 4 |
| Modelo de negocio | 10% | 3 |
| Tamaño de mercado | 10% | 2 |
| **Total ponderado** | 100% | **3.75** |

> Los pesos son una hipótesis. **Ajustarlos cuando conozcamos los criterios reales del jurado.**

---

## 6. Dónde buscar ideas en AGRO

Recorrer la cadena de valor y buscar **decisiones caras que hoy se toman a ojo o las toma alguien con conflicto de interés**:

| Eslabón | Ejemplos de decisiones |
|---|---|
| Agricultura | Cuándo sembrar, qué híbrido, fertilización, fitosanitarios, cosecha |
| Ganadería de carne | Recría, engorde, cuándo vender, sanidad |
| Tambo | Genética (Torinder), alimentación, reproducción, calidad de leche |
| Clima y riesgo | Heladas, sequía, granizo, seguros |
| Comercialización | Cuándo y a quién vender, contratos, logística |
| Finanzas | Crédito, insumos, costos, arrendamientos |
| Sustentabilidad | Huella de carbono, trazabilidad, certificaciones |

**Señales de una buena idea:**
- Hay una **planilla hecha a mano** tratando de resolverlo.
- El que recomienda **vende el producto** que recomienda.
- Existen **datos** que nadie convierte en decisiones.
- La decisión **cuesta plata** y su efecto se ve tarde.

---

## 7. Ideas en carpeta

| Idea | Track | Estado |
|---|---|---|
| **Torinder:** matching reproductivo para tambos | AGRO + IA | ✅ Analizada (`torinder/`) |
| **Checksum:** capa de verificación semántica antes de ejecutar una acción (pago/mail/adjunto) | AI (automation) | ✅ Analizada (`checksum_hackathon_idea.md`) — score 3.58/5 |
| Campo Alerta: mapa de lotes con alertas climáticas | AGRO + IA | Sin analizar (del documento "Top 5 ideas") |
| ¿Siembro o espero?: ventana de siembra con score de riesgo | AGRO + IA | Sin analizar |
| Crop Insurance: seguro paramétrico con smart contract | WEB3 + AGRO | Sin analizar |
| **Time Router:** smart routing de intenciones y oportunidades | AI Automation | ✅ Analizada (`time router/`) — Product thesis 4/5, Hackathon 3.5/5, Business 3.5/5 |
| AI Crisis Commander: agentes para emergencias climáticas | AI | Fuera del track AGRO |
| Tokeniza: tokenización de activos | WEB3 | Fuera del track AGRO |

---

## 8. Plantilla para una idea nueva

```md
# <Nombre>
- Una línea: <qué hace, para quién>
- Dolor: <quién lo sufre y cómo lo resuelve hoy> — evidencia: <fuente>
- Datos para la demo: <cuáles, reales o simulados, dónde se consiguen>
- Rol de la IA: <qué hace la IA> / <qué calcula el motor determinístico>
- Competencia: <qué existe> → diferencial: <una línea>
- Negocio: <quién paga, cómo, contra qué alternativa>
- Mercado: <número + fuente>
- Momento wow de la demo: <la escena de 30 segundos>
- Núcleo en 20 h: <qué entra> / hoja de ruta: <qué no>
- Riesgos: <los 2 o 3 que la pueden matar>
- Puntaje de la matriz: <x.xx>
```
