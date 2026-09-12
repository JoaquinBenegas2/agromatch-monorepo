# Conceptos de dominio y modelo de negocio: el vertical genético

> Documento de onboarding para el equipo. El objetivo es que todos entendamos el negocio **antes** de escribir código.
>
> ⚠️ **Alcance:** este documento explica **el vertical genético (Torinder)**. El producto completo es un marketplace con motor de matcheo para todas las necesidades del agro; eso está en [modelo-de-dominio.md](modelo-de-dominio.md) y en [validacion-mercado.md](validacion-mercado.md).

---

## 1. El dominio en un minuto

- **Una vaca da leche solo después de parir.** Para que el tambo produzca, cada vaca tiene que quedar preñada más o menos una vez por año. La reproducción es el motor del negocio.
- **Casi todo se hace por inseminación artificial.** Ojo con la sigla: en el campo "IA" es *inseminación*, no *inteligencia*. El tambero compra **pajuelas** de semen a una **central** (empresa genética) que publica un catálogo de toros con sus valores genéticos.
- **Cada servicio es una decisión con efecto diferido.** La hija nace a los ~9 meses, pare por primera vez a los ~2 años y después ordeña varios años. Un error hoy se paga dentro de 3 años, y es permanente porque la genética se acumula generación tras generación.

---

## 2. Qué es un genotipado

A la ternera recién nacida se le saca una muestra de pelo. Un laboratorio lee su ADN y devuelve una **predicción de lo que va a transmitir**: leche, grasa, proteína, longevidad, mastitis, eficiencia.

Antes eso se sabía recién cuando la vaca ordeñaba, años después. Ahora se sabe **al nacer**. Y eso vale plata, porque criar una ternera hasta que produce es caro.

### Glosario de columnas del Excel

| Columna | Qué es | Mejor si… |
|---|---|---|
| VISUALID | ID del animal (caravana) | — |
| Fecha Nacimiento | Fecha de nacimiento | — |
| Padre | Código del toro padre | — |
| CI | **Índice General compuesto**, propio (definido en `insumos/Gestion de genotipados.docx`, no es Calving Interval). Correlaciona fuerte con PL, FAT, PRO y SCS — ver [ADR-0001](adr/0001-clasificacion-tiers-y-alertas-de-salud.md) | ↑ |
| MILK / FAT / PRO | Leche / grasa / proteína que transmite | ↑ |
| PL | Vida productiva (longevidad) | ↑ |
| SCS | Células somáticas (propensión a mastitis) | **↓** |
| FS | Probablemente *Feed Saved* (alimento ahorrado) | ↑ |
| RFI | Consumo residual de alimento (eficiencia) | **↓** |
| BETAC | Beta-caseína: A2/A2 = "leche A2", nicho premium | A2/A2 |
| KAPPAC | Kappa-caseína: BB = mejor rendimiento quesero | BB |

---

## 3. Las 3 decisiones de semen

| Semen | Qué sale | Cuándo conviene |
|---|---|---|
| **Sexado** | ~90% hembras | En las mejores vacas, porque queremos muchas hijas de ellas. Es más caro. |
| **Convencional** | 50% machos / 50% hembras | En las del medio: reposición estándar a menor costo. |
| **Carne** (Angus, Hereford…) | Un ternero cruza para vender | En las genéticamente inferiores. Un ternero macho Holando casi no vale nada; uno cruza con carne sí. |

El tambo necesita cierta cantidad de **vaquillonas de reemplazo** por año. Las que sobran son costo. De ahí sale la lógica: hijas solo de las mejores y carne en el resto.

---

## 4. Modelo mental técnico

- **Cada animal es un vector de rasgos:** `[MILK, FAT, PRO, PL, SCS, RFI, ...]`.
- **La cría esperada es el promedio de los dos vectores.** Los valores genéticos se suman, no hay química oculta:
  ```
  cría(rasgo) = (vaca(rasgo) + toro(rasgo)) / 2
  ```
- **Un objetivo es un vector de pesos**: sólidos, volumen, salud, eficiencia, leche A2.
- **El matching es un problema de optimización con restricciones duras:**
  - Maximizar `pesos · (vaca + toro) / 2`.
  - Descartar toros emparentados con la vaca (consanguinidad).
  - Descartar toros con partos difíciles si es vaquillona.
- **La caseína A2 y la BB son genes simples**, con probabilidades exactas de Mendel:

  | Vaca | Toro | Cría A2/A2 |
  |---|---|---|
  | A2/A2 | A2/A2 | 100% |
  | A1/A2 | A2/A2 | 50% |
  | A1/A2 | A1/A2 | 25% |

**Es un recomendador con reglas de dominio, no un modelo de machine learning.** La IA generativa va arriba, como capa de interfaz: explica los resultados, interpreta el objetivo del productor y normaliza datos desprolijos. **Nunca calcula el porcentaje de compatibilidad.**

---

## 5. Modelo de negocio

### El dolor
El tambero recibe un Excel lleno de números que no sabe leer. Hoy lo interpreta un asesor, o la propia central que le vende el semen.

### La propuesta de valor
Convertir ese Excel en **decisiones concretas y explicadas**: qué semen usar en cada ternera, qué toro elegir y cuáles no conviene criar.

### Es una plataforma multi-tambo (decisión)
No es una herramienta para un solo tambo. Hay cosas que solo existen cuando hay muchos tambos adentro:

| Pieza | Por qué necesita muchos tambos |
|---|---|
| **Catálogo neutral compartido** | Cada catálogo de una central que se carga queda disponible para todos. El catálogo multimarca crece con el uso. |
| **Multi-tambo** | Cada tambo ve su rodeo. El asesor ve todos sus clientes en un panel. |
| **Comparativas anónimas** | "Tu rodeo está en el 30% superior de la cuenca en sólidos." |
| **Datos reales de preñez por toro** | Si los tambos registran qué toro usaron y si hubo preñez, la plataforma sabe qué toros funcionan en condiciones argentinas. Ninguna central publica eso de forma neutral. **Es la ventaja que no se copia fácil.** |

### Quién paga (a validar)

| Actor | Rol | Cómo paga |
|---|---|---|
| Tambero | Usuario, alimenta la red | Gratis o barato |
| Asesor / veterinario | Usuario multi-tambo | Suscripción: le ahorra horas con muchos clientes |
| Laboratorio de genotipado | Canal | Integra la plataforma y entrega el resultado interpretado |
| Centrales de semen | Proveedores del catálogo | Pueden pagar por mantener su catálogo actualizado, **nunca** por ranking |

### El diferencial
Las centrales ya ofrecen programas de apareamiento gratis, pero recomiendan **sus propios toros**. Un tambero entrevistado lo confirmó: "solo recomiendan sus pajuelas". Un planificador **neutral**, que compara el catálogo de todas, es el argumento fuerte.

⚠️ **Línea roja:** ninguna central paga por aparecer más arriba en las recomendaciones. Si eso pasa, la neutralidad se termina.

### Pitch del vertical en tres líneas
- **Dolor:** un Excel genético que nadie entiende.
- **Solución:** un match explicado en lenguaje simple.
- **Monetización:** por cabeza, o a través del laboratorio de genotipado.

---

## 6. Cómo encaja en el producto completo

El producto es un **marketplace con motor de matcheo para las necesidades del agro**. La genética es el primer vertical.

| Capa | Qué resuelve | Quién paga |
|---|---|---|
| **Núcleo** | Cualquier necesidad: maquinaria, veterinaria, insumos, software, asesoría, financiamiento | El proveedor, por solicitud concretada o por suscripción. El productor **no paga** por buscar. |
| **Vertical genético** | Qué hacer con cada hembra y con qué toro | Suscripción del tambo o del asesor, o el laboratorio de genotipado como canal |

**Las tres reglas de negocio que no se negocian:**
1. **Neutralidad:** el ranking no se compra. Si hay patrocinio, va fuera del ranking y etiquetado.
2. **Retención antes que comisión:** en los marketplaces de servicios la desintermediación se lleva hasta el 80% de los ingresos. Lo que retiene es el uso mensual del vertical, no cobrar rápido el primer contacto.
3. **Arranque en frío honesto:** un proveedor cargado desde un directorio público se muestra como no verificado. Nunca se lo presenta como cliente de la plataforma.
