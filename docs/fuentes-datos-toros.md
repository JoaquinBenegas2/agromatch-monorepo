# Fuentes de datos de toros

> Relevamiento web, septiembre de 2026. ⚠️ = no verificado.

---

## 1. La restricción que manda: la escala

Promediar los valores de la madre y del toro **solo tiene sentido si están en la misma escala**. Cada país evalúa con su propia base: EE. UU. (CDCB), Canadá (Lactanet) y Argentina (ACHA, evaluación local). Mezclar escalas sin la conversión oficial de Interbull invalida el cálculo.

**¿En qué escala está el Excel de las terneras?**
- MILK, FAT y PRO en libras, PL en meses, y Feed Saved + RFI + caseínas en el mismo reporte. Todo es coherente con la **escala de EE. UU. (CDCB)**.
- Proveedor más probable: **Neogen Igenity** ⚠️. Es el único encontrado que reporta Feed Saved, RFI y caseínas juntos, y su guía de resultados se titula "CDCB Evaluation".
- En el rodeo real (293 animales) hay 28 padres con dos prefijos NAAB: `029HO` (266 animales) y `094HO` (25). El prefijo numérico identifica a la central y `HO` a Holstein. ⚠️ Hay que confirmar a qué central corresponde cada prefijo.
- **El propio productor lo pide:** en las notas del Excel, entre los "datos a incorporar a futuro", figura *"Mejorar información de los toros (NAAB)"*.
- ⚠️ **Qué es el CI sigue sin confirmarse.**

**Regla del producto:** los datos de toros **deben estar en escala CDCB**. La evaluación local de ACHA y la de Lactanet quedan afuera salvo que haya conversión oficial.

---

## 2. Fuentes evaluadas

| Fuente | Qué tiene | ¿Escala CDCB? | Acceso | Uso comercial |
|---|---|---|---|---|
| **CDCB** (EE. UU.) | Todos los toros evaluados en EE. UU. (más los extranjeros vía Interbull): MILK, FAT, PRO, PL, SCS, Feed Saved, facilidad de parto, fertilidad, consanguinidad | ✅ | Consulta web gratis + FTP público (3 publicaciones por año) | ⚠️ Requiere **acuerdo de licencia** para uso comercial o redistribución |
| **Catálogos de las centrales** (ABS, Genex, Semex/CIAVT en AR) | Toros que realmente se venden en Argentina, con valores genéticos y a veces caseínas | ✅ para toros de EE. UU. | PDF descargable, sin API | ⚠️ Términos poco claros |
| Holstein Association USA | Buscador de pedigrí y valores genéticos | ✅ | Web | ⚠️ |
| Lactanet (Canadá) | Toros canadienses | ❌ Escala propia | Web | ❌ Solo uso personal |
| Interbull | Conversión entre países | Convierte | Solo miembros de ICAR | ❌ Cerrado |
| ACHA (Argentina) | Evaluación local | ❌ Escala propia | Web (⚠️ sin confirmar si está actualizada) | ⚠️ |

**No existe un agregador neutral multi-central con uso comercial abierto.** Eso confirma el hueco de mercado, y a la vez es el problema a resolver.

---

## 3. Estrategia recomendada

### Hackathon: catálogo curado a mano
- **~20–30 toros reales** en un JSON semilla, sacados de los catálogos PDF de ABS, Genex y Semex Argentina y cruzados con las consultas públicas de CDCB.
- Incluir **los padres que figuran en el Excel** (`029HO21010`, `029HO20294`, etc.) para mostrar el control de consanguinidad con datos reales.
- Cada toro con su fuente citada. Es una demo, no redistribución comercial.
- Mostrar en la demo **la IA extrayendo un catálogo PDF real**: pasa a ser parte del pitch, no solo trabajo previo.

### Producto real: tres canales que se complementan

| Canal | Qué aporta | Por qué funciona |
|---|---|---|
| **1. Licencia CDCB** | Base legal con todos los toros evaluados en EE. UU., en la escala correcta | CDCB tiene un proceso formal para pedir datos: es el camino oficial |
| **2. Centrales cargan su catálogo** | Toros disponibles en Argentina, con precio y stock | **Incentivo alineado:** si los tambos usan la plataforma, a la central le conviene estar. Pagan por tener el catálogo actualizado, nunca por el ranking. |
| **3. Tambos y asesores suben catálogos** | Arranque en frío mientras no hay acuerdos | La IA normaliza el PDF o Excel. Es información que el usuario ya recibió. |

**El huevo o la gallina:** las centrales van a entrar cuando haya tambos, y los tambos cuando haya catálogo. Los canales 1 y 3 resuelven el arranque; el canal 2 escala.

---

## 4. Riesgos abiertos

1. ⚠️ Confirmar el **proveedor del genotipado** y **qué es el CI**. Se puede averiguar mirando los metadatos del Excel original o preguntándole al tambero.
2. ⚠️ Usar comercialmente datos de CDCB **sin licencia** es riesgoso. Para la demo alcanza; para el producto hace falta el acuerdo.
3. ⚠️ Toros sin evaluación CDCB (por ejemplo, genética local) no se pueden comparar hasta resolver la conversión de escalas.
4. ⚠️ Las caseínas no aparecen en todos los catálogos, así que puede haber toros sin dato A2 o BB.
