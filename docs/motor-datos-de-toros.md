# El motor por dentro: qué datos del toro entran al match

> Responde tres preguntas: **qué datos del toro usamos**, **cómo los usa el motor** y **de dónde salen**. Es el complemento de [modelo-de-dominio.md](modelo-de-dominio.md) (reglas) y [fuentes-datos-toros.md](fuentes-datos-toros.md) (fuentes y licencias).

---

## 1. La idea en una línea

**El genotipado de la vaca solo no alcanza.** El match es un par: la vaca aporta su mitad, el toro aporta la otra, y el motor evalúa **la cría esperada** contra el objetivo del tambo, después de descartar los toros que no puede usar.

```
vaca (genotipado)  +  toro (ficha)  →  cría esperada  →  score contra el objetivo
                   ↑
        filtros duros: parentesco, parto, tipo de semen
```

---

## 2. La ficha del toro

| Campo | Para qué lo usa el motor | ¿Obligatorio? | Si falta |
|---|---|---|---|
| `naab` | Identidad única global; upsert del catálogo | **Sí** | El toro no entra |
| `name`, `company` | Mostrar en la tarjeta. **No influyen en el score** (RN-34) | Sí | — |
| `breed` | Separa lecheros de carne; define el catálogo por tier | **Sí** | El toro no entra |
| `scale` | Tiene que ser `CDCB`, la misma del rodeo | **Sí** | El toro no entra (RN-01) |
| `traits.milk/fat/pro` | Cría esperada de producción y sólidos | Sí en lecheros | No compite en objetivos de producción |
| `traits.pl` | Longevidad de la cría | Sí en lecheros | Idem |
| `traits.scs` | Mastitis. **Es el que corrige** a una vaca con alerta (RN-09) | Sí en lecheros | No puede usarse como toro correctivo |
| `traits.fs` / `traits.rfi` | Eficiencia alimenticia | Deseable | No compite en el objetivo de eficiencia |
| `traits.ci` | Índice general, para el objetivo balanceado | Deseable | Se usa la suma ponderada de los rasgos |
| `betaCasein` | Probabilidad de cría A2/A2 (Mendel, RN-04) | Deseable | `caseinOdds` en `null`, y se avisa en la tarjeta |
| `kappaCasein` | Probabilidad de cría BB para quesería | Deseable | Idem |
| `calvingEase` | **Filtro duro** en vaquillonas (RN-06) | **Sí en vaquillonas** | El toro queda excluido, con motivo |
| `sireNaab` | **Filtro duro** de consanguinidad: detecta medios hermanos (RN-05) | **Sí** | El toro entra, pero la tarjeta avisa que no se pudo controlar el parentesco |
| `semenTypes` | Qué tier puede usarlo: sexado, convencional o carne (RN-13) | **Sí** | El toro no entra |
| `pricePerDose` | Componente de precio del score y total del plan | Deseable | Se ignora en el costo y se avisa |
| `source` | Trazabilidad: de qué catálogo o consulta salió | **Sí** | No se acepta el toro |

**Regla de oro sobre los faltantes:** un dato ausente **nunca se inventa ni se completa con un promedio**. O el toro queda fuera, o compite sin ese rasgo y la tarjeta lo dice.

### Mínimo viable por tipo de toro

| Tipo | Campos mínimos |
|---|---|
| **Lechero** | `naab`, `breed`, `company`, `scale`, `traits` (milk, fat, pro, pl, scs), `semenTypes`, `sireNaab`, `calvingEase` |
| **Carne** | `naab`, `breed`, `company`, `calvingEase`, `semenTypes: ['BEEF']`, `pricePerDose` |

Un toro de carne **no tiene valores lecheros y no los necesita**: se ordena por facilidad de parto, raza y precio (RN-16).

---

## 3. Cómo se usa cada dato

### Paso 1 · Filtros duros (antes de puntuar)

| Filtro | Qué compara | Regla |
|---|---|---|
| Tipo de semen | `semenTypes` contra el tier de la hembra | RN-13 |
| Parentesco | `bull.sireNaab` contra `female.sireNaab` y `bull.naab` contra el padre de ella | RN-05 |
| Facilidad de parto | `calvingEase` contra el umbral del establecimiento, solo en vaquillonas | RN-06 |

Lo que no pasa un filtro **no se puntúa**: va a la pestaña de excluidos con el motivo escrito.

### Paso 2 · Cría esperada

Para cada rasgo: `cría = (vaca + toro) / 2`. Se invierte el signo en SCS y RFI, donde menos es mejor.

### Paso 3 · Score

```
score = Σ peso(objetivo) × cría normalizada
      + bonus × probabilidad del genotipo de caseína deseado
```

Los rasgos marcados como **correctivos** en la hembra pesan el doble. Ahí es donde un toro con SCS bajo "rescata" a una vaca con riesgo de mastitis.

### Paso 4 · Compatibilidad

Reescalado de 0 a 100 entre los candidatos de esa vaca, mostrado como ranking. **Nunca como probabilidad.**

---

## 4. De dónde salen los datos

### Para la hackathon (tareas A6 y M7)

1. **Catálogos públicos** de ABS, Genex y Semex Argentina: nombre, raza, valores genéticos, caseínas cuando están y precio de referencia.
2. **Consultas públicas de CDCB** para completar lo que al catálogo le falte, sobre todo `calvingEase` y `sireNaab`.
3. Curado a mano: 20 a 30 toros, cada uno con su `source` citada.

El catálogo semilla tiene que incluir sí o sí:
- los **padres que aparecen en el Excel** del rodeo,
- al menos **2 hijos de `029HO19531`**, para que se vea el filtro de consanguinidad en la demo,
- toros **A2/A2** y **BB**,
- **4 de carne** con facilidad de parto.

### En producción (tres canales)

| Canal | Qué aporta |
|---|---|
| Licencia de datos con **CDCB** | Base legal con todos los toros evaluados en EE. UU., en la escala correcta |
| **Las centrales cargan su catálogo** | Disponibilidad real en Argentina, con precio y stock |
| **Tambos y asesores suben catálogos** | Arranque en frío: la IA normaliza el PDF que ya recibieron |

### Cómo entra un catálogo al sistema (flujo F5)

```
PDF o Excel de la central
   → la IA extrae los toros y los mapea a la ficha (RN-19)
   → validación: escala, campos mínimos, rangos
   → un humano confirma
   → upsert por código NAAB (RN-22)
```

---

## 5. Reglas de calidad

1. **Escala CDCB o nada.** Mezclar bases de distintos países invalida el promedio (RN-01).
2. **Fecha de evaluación.** CDCB publica 3 veces al año. Un toro con evaluación vieja se muestra con la fecha a la vista.
3. **Confiabilidad.** Si el catálogo la trae, se guarda y se muestra. Un toro joven y un toro probado no valen lo mismo, aunque tengan el mismo número.
4. **Sin relleno.** Nunca se completa un faltante con un promedio ni con una estimación.
5. **Trazabilidad.** Todo toro guarda de dónde salió cada dato.

---

## 6. Lo que todavía NO usamos (hoja de ruta, y por qué importa)

| Dato | Para qué sirve | Por qué no está en el MVP |
|---|---|---|
| **Haplotipos y defectos genéticos** | Evitar cruzas que producen abortos o terneros inviables. **Los programas de apareamiento serios lo filtran siempre** | No viene en los catálogos que tenemos a mano. ⚠️ **Es lo primero que hay que sumar después de la hackathon**, y hay que decirlo en el pitch si preguntan |
| **Abuelo materno (MGS)** | Consanguinidad real, no aproximada | El Excel del rodeo no lo trae |
| **Fertilidad del toro** | Probabilidad de preñez | No está en los datos disponibles |
| **Tipo y conformación** (ubre, patas) | Criterio habitual del tambero al elegir toro | No aporta al objetivo del MVP y sumaría ruido |
| **Stock y logística de la dosis** | Que el toro recomendado se consiga de verdad | Lo aportan las centrales cuando se suman |

**Cómo se dice esto honestamente:** el motor está armado para que sumar un rasgo sea agregar un campo a la ficha y un peso al objetivo. Los haplotipos entran como **un filtro duro más**, al lado de la consanguinidad, sin tocar el resto.

---

## 7. Ejemplos de ficha

**Toro lechero**

```json
{
  "naab": "029HO20544",
  "name": "EJEMPLO DE CATALOGO",
  "company": "ABS",
  "breed": "HO",
  "sireNaab": "029HO19531",
  "calvingEase": 2.1,
  "semenTypes": ["SEXED", "CONVENTIONAL"],
  "pricePerDose": 38,
  "profile": {
    "traits": { "ci": 612, "milk": 840, "fat": 61, "pro": 34, "pl": 4.1, "scs": 2.74, "fs": 180, "rfi": -40 },
    "betaCasein": "A2/A2",
    "kappaCasein": "BB",
    "scale": "CDCB",
    "source": "Catalogo ABS Argentina 2026 + consulta CDCB"
  }
}
```

**Toro de carne**

```json
{
  "naab": "014AN00777",
  "name": "EJEMPLO ANGUS",
  "company": "Genex",
  "breed": "AN",
  "sireNaab": null,
  "calvingEase": 1.4,
  "semenTypes": ["BEEF"],
  "pricePerDose": 12,
  "profile": null
}
```

> Los dos son **ejemplos de formato**, no datos reales. El catálogo real lo carga A6, con la fuente de cada toro.
