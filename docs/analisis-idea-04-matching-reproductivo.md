# Análisis conceptual: Idea 04, Matching reproductivo inteligente

> Fuentes: pitch de la Idea 04 ("Tinder de ganado") + documento de mercado `Gestion de genotipados.docx` + muestra de genotipado de 16 terneras.

---

## TL;DR

1. **Los dos documentos resuelven problemas DISTINTOS.** El pitch es *apareamiento* (qué toro para esta vaca). El doc de mercado es *clasificación* (qué tipo de semen merece esta hembra). No compiten: se encadenan. Primero va el tier, después el match.
2. **La "compatibilidad" en genética no es química, es aritmética.** Lo que se espera de la cría es el promedio de los valores genéticos de los padres. El % de compatibilidad tiene que salir de un cálculo determinístico, **nunca de la IA**.
3. **Las reglas del doc tienen bugs** que el rodeo real (293 animales) deja a la vista: tiers que se pisan, reglas contradictorias (RFI) y cortes duros que mandan a carne al **47% del rodeo** (la intención era 30%) y a casi la mitad de las A2/A2.
4. **La IA aporta de verdad en 4 lugares:** explicar en criollo, traducir el objetivo del productor a pesos, ingerir datos desordenados (Excel de genotipado, catálogos PDF de toros) y responder preguntas sobre el rodeo.
5. **La demo ganadora:** subís el Excel, ves el rodeo clasificado, elegís una ternera y un objetivo, y "swipeás" toros con % y una explicación. Es memorable y además está bien fundamentada técnicamente.

---

## 1. Qué propone cada documento

| Dimensión | Idea 04 (pitch) | Doc de mercado |
|---|---|---|
| Pregunta que responde | ¿Con **qué toro** sirvo a esta vaca? | ¿Qué **tipo de semen** merece esta hembra? |
| Unidad de análisis | Par vaca × toro | Hembra individual |
| Salida | Ranking de toros + % + explicación | Tier 1/2/3/4 → sexado / convencional / carne / descarte |
| Datos | Raza, edad, historial, genética | Genómica (CI, MILK, FAT, PRO, PL, SCS, FS, RFI, caseínas) |
| Rol de IA | Central (score + explicación) | **Ninguno**: son reglas fijas |
| Rubro | Mezcla carne y leche ("peso", "rusticidad") | 100% tambo |

**Conclusión:** el doc de mercado baja la idea a tierra en un nicho concreto (tambo, genómica de terneras) y con un comprador claro (el tambero que ya genotipa sus terneras). Pero le saca justamente lo que la hacía memorable: el match y la IA. La propuesta fuerte **une las dos cosas**.

El puente ya está en el propio doc. En Tier 2 dice *"usar toros con SCS muy bajo si la ternera tiene SCS límite"*. Eso es **apareamiento correctivo**, o sea, matching. El doc lo menciona y no lo desarrolla.

---

## 2. Entender los datos (antes de tocar una línea de código)

| Columna | Qué es | Mejor si… |
|---|---|---|
| VISUALID | ID visual del animal (caravana) | — |
| Fecha Nacimiento | Entre 2023 y 2025: terneras, vaquillonas y vacas jóvenes | — |
| Padre | Código NAAB del toro (`029` = central, `HO` = Holstein) | — |
| CI | Índice general compuesto (el doc no aclara la fórmula) | ↑ |
| MILK / FAT / PRO | Habilidad de transmisión predicha (PTA) en leche, grasa y proteína (probablemente en libras) | ↑ |
| PL | Vida productiva (longevidad) | ↑ |
| SCS | Score de células somáticas (propensión a mastitis) | **↓** |
| FS | Probablemente *Feed Saved* (alimento ahorrado) | ↑ |
| RFI | Consumo residual de alimento | **↓** |
| BETAC | Beta-caseína: A2/A2 = leche "A2" (nicho premium) | A2/A2 |
| KAPPAC | Kappa-caseína: BB = mejor rendimiento quesero | BB |

Tres observaciones que el doc no hace:

- **FS se ignora por completo** y además está correlacionado con RFI: los dos miden eficiencia de conversión. Hay que elegir uno o combinarlos a propósito.
- **No hay rasgos de fertilidad** (DPR, HCR, CCR) ni de facilidad de parto. El objetivo "fertilidad" del pitch **no se puede atender con estos datos**.
- **Hay medios hermanos por todos lados:** hay 28 toros para 293 animales, y uno solo tiene 41 hijas (14% del rodeo). Por eso el control de consanguinidad es crítico a la hora de elegir toro.

---

## 3. Análisis crítico de las reglas del documento

### 3.1 Simulación sobre la muestra real (16 terneras)

Apliqué las reglas tal como están escritas en el texto. Precedencia: si se dispara cualquier condición de Tier 3, va a Tier 3. Si cumple todo lo de Tier 1, va a Tier 1. Si no, Tier 2.

| ID | CI | MILK | FAT | PRO | PL | SCS | RFI | Beta | Kappa | Tier | Motivo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 3027 | 619 | -55 | 33 | 12 | 3.24 | 2.88 | 8.5 | A1/A2 | BB | **1** + Quesero | Cumple todo |
| 3036 | 576 | -33 | 29 | 19 | 3.39 | 2.87 | 42.3 | A2/A2 | BB | **1** + Núcleo A2 | Cumple todo ⚠️ ver 3.2 |
| 3019 | 519 | 163 | 36 | 17 | 1.25 | 2.89 | 86.1 | A1/A2 | AB | **1** | RFI malísimo, pero "indiferente" |
| 3025 | 507 | 342 | 9 | 10 | 2.12 | 2.87 | -9.3 | A1/A2 | AA | **1** | Cumple todo |
| 3032 | 504 | -433 | 29 | 5 | 1.80 | 2.88 | -20.0 | A2/A2 | BB | **1** + Núcleo A2 | Cumple todo |
| 2965 | **617** | -949 | 86 | **0** | 2.14 | 2.96 | 61.7 | A1/A2 | AE | 2 | PRO = 0 no es "> 0". **La de 2º mejor CI queda afuera** |
| 3033 | 496 | 245 | 32 | 23 | 1.27 | 3.05 | -7.6 | A1/A2 | BE | 2 | SCS 3.05 no es < 3.00 |
| 3030 | 510 | -144 | -2 | 9 | 1.88 | 2.93 | -18.4 | A2/A2 | BB | 2 | FAT -2 |
| 3034 | 480 | -245 | -22 | 5 | 2.51 | 2.88 | -65.6 | A1/A2 | AB | 2 | CI = 480 (no > 480) |
| 3021 | 440 | 699 | 1 | 21 | 1.50 | 2.89 | 4.8 | A1/A2 | AB | 2 | CI medio |
| 3024 | 451 | 251 | 15 | 14 | 0.68 | 3.07 | 56.4 | A1/A2 | AB | 2 | CI medio |
| 3020 | 420 | -218 | 11 | 2 | 0.66 | 3.12 | -41.0 | A1/A2 | BB | 2 | CI medio |
| 3031 | 457 | 558 | 31 | 24 | 0.59 | **3.19** | -1.3 | A1/A2 | BB | **3 → carne** | Solo por SCS |
| 3038 | 399 | 185 | 12 | 18 | 0.46 | **3.16** | 42.2 | **A2/A2** | AB | **3 → carne** | Solo por SCS (0.01 arriba del corte) |
| 3026 | 383 | -181 | 3 | 9 | 0.26 | **3.17** | 5.8 | **A2/A2** | AB | **3 → carne** | Solo por SCS |
| 3037 | **310** | -635 | -27 | -5 | 0.82 | 2.99 | **-131.8** | **A2/A2** | **BB** | **3 → carne** | CI bajo + sólidos negativos |

**Resultado:** 5 en Tier 1, 7 en Tier 2, 4 en Tier 3 y ninguna en Tier 4.

### 3.1b Rodeo completo (293 animales)

El Excel real tiene 293 animales nacidos entre 2023 y 2025 (60, 104 y 129 por año), hijos de 28 toros. Al pie trae además un bloque de notas del productor: qué medir y qué acción tomar en cada caso. Con las mismas reglas:

| Tier | Animales | % | Intención del doc |
|---|---|---|---|
| 1 · Sexado | 37 | 13% | 25% |
| 2 · Convencional | 117 | 40% | ~45% |
| 3 · Carne | 139 | **47%** | 30% |
| 3 · Carne, sumando la regla de RFI de la tabla | 190 | **65%** | — |
| 4 · Descarte | 2 | <1% | — |

Hallazgos:
- **Los umbrales de CI sí coinciden con los percentiles del rodeo completo** (P75 = 481, P30 = 355). Esto corrige el punto 1 de 3.2: el desfase venía de mirar solo 16 animales. La lección es otra: los percentiles se calculan sobre el rodeo entero, y con cargas chicas los umbrales fijos se desvían.
- **Las condiciones con "cualquiera de" inflan el Tier 3:** 47% va a carne en lugar de 30%. 54 animales caen por un solo disparador, y 15 solo por SCS.
- **Las condiciones con "todas" achican el Tier 1:** de las 74 con CI en el top 25%, solo 37 llegan a Tier 1. De las que quedan afuera, 20 no pasan el corte de SCS < 3.00 y 15 tienen PRO ≤ 0 (algunas fallan en los dos). Además, 5 del top 25% terminan en carne.
- **A2/A2:** son 146 animales (50% del rodeo) y 70 van a carne. **A2/A2 + BB:** son 51 y 21 van a carne. Y la nota del propio productor dice que A2/A2, BB y sólidos "generan poder de negociación con la industria".
- **Doble castigo confirmado:** el CI tiene correlación 0.84 con PL, 0.58 con FAT, 0.54 con PRO, −0.47 con SCS y apenas 0.14 con MILK. El índice ya pondera longevidad y salud, así que cortar además por PL y SCS cuenta dos veces lo mismo.
- **FS y RFI se superponen:** su correlación es −0.56.
- **Hay 29 animales con SCS entre 3.13 y 3.18**, pegados al corte de 3.15.
- **El archivo mezcla datos con notas**, tiene filas vacías y 2 animales sin padre. La carga tiene que tolerar eso.

### 3.2 Problemas encontrados

1. **Percentiles y umbrales absolutos (corregido con el rodeo completo).** En la muestra de 16, CI > 480 abarcaba el 50%. En los 293 animales abarca el 25,3%, así que el umbral del doc está bien calibrado para ESTE rodeo. El riesgo real es otro: un umbral fijo no sirve para otros tambos ni para cargas parciales. En una plataforma multi-tambo hay que usar el percentil del rodeo de cada tambo.
2. **Los tiers se pisan y dejan huecos.** Top 25% + P25–P70 + Bottom 30% suma 125%. El rango P25–P30 cae en dos tiers y el P70–P75 no cae en ninguno. Faltan una precedencia explícita y cobertura total.
3. **Contradicción con RFI.** El texto dice RFI "indiferente" en Tier 1. La tabla resumen marca RFI > +40 como criterio de Tier 3. Si se aplica la tabla, **3036 (CI 576, A2/A2, BB, la mejor candidata a "Núcleo A2") se va a carne.** También se irían 3019, 3038, 2965 y 3024. Es un bug de especificación, no de implementación.
4. **Cortes duros sobre valores con incertidumbre.** Una genómica de ternera tiene confiabilidad bastante menor a 100%. Separar 3.15 de 3.16 en SCS es ruido estadístico, y sin embargo 3038 va a carne por 0.01. Hacen falta **bandas de tolerancia** o un score continuo.
5. **Doble castigo.** Un índice como CI ya pondera SCS, PL y sólidos. Aplicar además cortes individuales sobre esos mismos rasgos cuenta dos veces lo mismo. Pasa con 3031, que tiene un CI razonable, MILK +558 y PRO +24, y termina en carne por un solo rasgo.
6. **El tag A2/BB llega tarde.** Es un "extra" de Tier 1, pero 3 de las 6 terneras A2/A2 van a carne. Si el tambo vende leche A2 o hace quesería, eso es **destruir un activo**. Para ese productor el tag tiene que ser un **objetivo**, no un adorno.
7. **El umbral de "igualdad" está mal definido.** PRO = 0 deja afuera de Tier 1 a la ternera con más grasa del rodeo (+86). "Positivo" y "no negativo" son reglas distintas, y hay que decidir cuál vale.
8. **Inconsistencias internas del doc.** El texto habla de "cuatro categorías" y el diagrama muestra tres. El diagrama pone RFI dentro del ranking, pero las reglas lo tratan como indiferente.
9. **Falta la restricción económica principal: ¿cuántas reposiciones necesita el tambo?** La cantidad de hembras que van a sexado o a carne no la definen umbrales genéticos fijos. La define **la tasa de reposición que el rodeo necesita**. Si el tambo necesita 30% de reposición y el sistema manda 25% a carne, puede quedarse corto de vaquillonas. Los tiers deberían calcularse **de arriba hacia abajo**: "necesito N reemplazos, entonces las N mejores van a lechero".
10. **Riesgo de parto en Tier 3.** Recomendar semen de carne (Limousin incluido) en **vaquillonas** sin mirar la facilidad de parto del toro es un riesgo real de distocia. Esa restricción tiene que estar en el sistema.

---

## 4. El problema conceptual de fondo: ¿qué es "compatibilidad"?

Acá está el corazón del asunto, y conviene entenderlo bien antes de construir nada.

En un Tinder la compatibilidad es subjetiva. **En genética es aritmética.** Los valores genéticos (PTA) son aditivos, así que lo que se espera de la cría es:

```
PTA_cría(rasgo) = (PTA_vaca(rasgo) + PTA_toro(rasgo)) / 2
```

Entonces **no existe un toro "compatible" en abstracto**. Existe un toro que, promediado con ESTA vaca, genera la mejor cría **para el objetivo elegido**. De ahí salen tres componentes reales de compatibilidad:

### 4.1 Complementariedad (corrección)
El toro compensa las debilidades de la vaca en el objetivo elegido.
- Ejemplo: 3031 tiene SCS 3.19. Con un toro de SCS 2.70, la cría esperada queda en ~2.95, dentro de rango. **El matching "rescata" a una ternera que las reglas mandaban a carne.** Esa escena sola vale para el pitch.

### 4.2 Genes mayores (Mendel puro, 100% determinístico)
| Vaca | Toro | Cría A2/A2 |
|---|---|---|
| A2/A2 | A2/A2 | 100% |
| A1/A2 | A2/A2 | 50% |
| A1/A2 | A1/A2 | 25% |

Kappa-caseína funciona igual (por ejemplo, AB × BB da 50% BB). **Estas probabilidades sí son exactas**, y en la demo quedan muy visuales.

### 4.3 Restricciones (filtros, no score)
- **Consanguinidad esperada:** con 8 medias hermanas por el mismo padre, un toro emparentado con `029HO21010` queda descartado. La práctica habitual es no pasar de ~6.25%.
- **Facilidad de parto:** es obligatoria en vaquillonas.
- **Disponibilidad y precio de la dosis.**

### 4.4 Fórmula propuesta

```
Para cada toro t disponible y la vaca v:
  1. Filtrar: consanguinidad(v,t) > umbral → fuera; vaquillona y parto difícil → fuera
  2. cría_i = (v_i + t_i) / 2              para cada rasgo i
  3. z_i    = normalizar(cría_i)            (invertir signo en SCS y RFI)
  4. score  = Σ w_i(objetivo) · z_i  +  bonus · P(genotipo de caseína deseado)
  5. compatibilidad % = score reescalado 0–100 entre los toros candidatos
```

> ⚠️ El % es un **ranking relativo**, no una "probabilidad de éxito". En el pitch hay que decirlo así. Un productor que lea "92% de compatibilidad" y después vea una cría mediocre va a dejar de confiar en la herramienta.

### 4.5 Objetivos adaptados al tambo
El pitch mezcla objetivos de carne ("peso", "rusticidad"). Para un tambo, los objetivos tienen sentido si se mapean a pesos sobre los rasgos que realmente tenemos:

| Objetivo | Pesos principales |
|---|---|
| Sólidos / quesería | FAT, PRO, KAPPAC BB |
| Leche A2 | BETAC A2/A2 (filtro o bonus fuerte), después CI |
| Volumen | MILK |
| Longevidad y salud | PL, SCS |
| Eficiencia | RFI / FS |
| Balanceado | CI |

---

## 5. El rol correcto de la IA

La tentación es pedirle al LLM que "calcule la compatibilidad". **ERROR.** Un LLM que inventa números en una decisión reproductiva que después cuesta plata es exactamente lo que no queremos. La IA dirige la conversación y el motor hace las cuentas.

| ✅ La IA SÍ | ❌ La IA NO |
|---|---|
| Explica en lenguaje simple por qué conviene cada cruce, **a partir de los números que calculó el motor** | Calcula el % o inventa valores genéticos |
| Traduce "quiero más sólidos para vender a la quesera" a pesos del objetivo | Decide umbrales de descarte por su cuenta |
| Normaliza Excel de genotipado con columnas distintas según el laboratorio | Pisa las restricciones (consanguinidad, parto) |
| Extrae datos de toros de catálogos PDF de las centrales | |
| Responde "¿qué terneras me sirven para un núcleo A2?" consultando los datos | |
| Marca incoherencias ("este toro no tiene dato de SCS") | |

**Patrón:** motor determinístico → JSON con números y motivos → LLM que redacta. El LLM recibe los hechos y solo los pone en palabras. Así es auditable, testeable y no alucina.

---

## 6. Arquitectura propuesta (unificando las dos ideas)

```
 [Excel genotipado]      [Catálogo de toros (PDF/Excel)]
        │   (IA: normaliza columnas)       │  (IA: extrae PTAs)
        ▼                                  ▼
 ┌──────────────────────── Modelo común de rasgos ────────────────────────┐
 │  Animal { id, nacimiento, padre, CI, MILK, FAT, PRO, PL, SCS, FS, RFI,  │
 │           betaC, kappaC, sexo, categoría }                              │
 └────────────────────────────────────────────────────────────────────────┘
        │
        ▼
 [1. Clasificador de hembras]  ← tasa de reposición del tambo + reglas corregidas
        │   Tier 1 sexado / Tier 2 convencional / Tier 3 carne / Tier 4 alerta
        ▼
 [2. Motor de matching]  ← objetivo (pesos) + filtros (consanguinidad, parto)
        │   Tier 1-2 → toros lecheros   |   Tier 3 → toros de carne (facilidad de parto)
        ▼
 [3. Explicador IA]  ← recibe JSON de hechos, redacta en criollo
        ▼
 [UI: tarjetas "swipe" + plan de servicios exportable]
```

Por qué conviene en capas:
- **Clasificador y matching son dominio puro**: funciones sin dependencias, 100% testeables con la tabla de la sección 3.1 como fixture.
- **La IA es un adaptador** (hexagonal): si mañana cambia el proveedor del LLM, el dominio no se entera.
- **La ingesta es otro adaptador**: cada laboratorio o central trae su formato.

---

## 7. Alcance para la hackathon

### MVP (lo que entra)
1. Upload del Excel de genotipado, con normalización asistida por IA si las columnas vienen distintas.
2. Dashboard del rodeo por tier, con reglas **corregidas** (precedencia clara, percentiles reales, bandas de tolerancia).
3. Selección de ternera + objetivo (preset o texto libre interpretado por la IA).
4. Catálogo de ~20 toros **ficticios pero realistas** (lecheros y de carne, con caseínas, parto y parentesco).
5. Tarjetas tipo Tinder: foto/ícono, % de compatibilidad, cría esperada vs madre, probabilidad A2/BB y explicación de la IA.
6. "Match" → se agrega al plan de servicios (exportable).

### Fuera de alcance
Consanguinidad genómica real (en la demo alcanza con el pedigrí del padre), integración con centrales, economía detallada ($/dosis vs valor de la cría) y rasgos de fertilidad.

### Guion de demo (3 minutos)
1. "Este es un Excel real de genotipado. Así lo recibe hoy el productor." → lo subimos.
2. El rodeo aparece clasificado. "Estas 4 irían a carne según las reglas clásicas."
3. Se abre **3031** (va a carne por SCS). Objetivo: sólidos. Swipe → toro con SCS bajo → "Match 91%". La IA explica: *"Este toro corrige la propensión a mastitis de tu ternera y conserva su buena proteína. Además, 50% de probabilidad de cría BB para quesería."*
4. Remate: "La genética ya estaba en el Excel. Lo que faltaba era alguien que la leyera por vos."

---

## 8. Riesgos y preguntas abiertas

| # | Riesgo / pregunta | Por qué importa |
|---|---|---|
| 1 | **¿Qué es exactamente CI?** ¿Índice del laboratorio, de la central, propio? | Sin eso no se puede ponderar ni explicar |
| 2 | ¿Las PTAs de toros y vacas están en la **misma base y escala** (misma evaluación y país)? | Promediar valores de escalas distintas da cualquier cosa |
| 3 | ¿Qué confiabilidad tiene cada valor? | Define el ancho de las bandas de tolerancia |
| 4 | ¿De dónde salen los datos de toros en producción? | Licencias, actualización y acuerdos con las centrales |
| 5 | **Conflicto de interés**: si una central patrocina, ¿el ranking sigue siendo neutral? | La neutralidad es EL diferencial frente a los programas de apareamiento propios de cada central |
| 6 | Responsabilidad sobre la recomendación | Presentarlo como *soporte de decisión*, con el productor o el veterinario decidiendo |
| 7 | Tasa de reposición del tambo | Hoy no está en el modelo y es la variable económica principal |

---

## 9. Veredicto

**La idea es buena, y es buena por dos razones que se refuerzan.** El doc de mercado le da un comprador real y datos reales. El pitch le da la experiencia memorable y el rol de la IA. El error sería implementar el doc tal cual: son reglas fijas con bugs de especificación, sin IA, que descartan animales valiosos.

La versión fuerte es:
1. **Clasificación corregida**, guiada por la reposición que necesita el tambo.
2. **Matching determinístico** (promedio de padres + Mendel + restricciones).
3. **IA como intérprete**: entrada desordenada → datos limpios, y números → explicación clara.

Primero se entiende la genética y después se programa. La IA no reemplaza al genetista: le traduce el Excel al productor.
