# AgroMatch / Torinder · Referencia editorial v1

**Mockups interactivos para explorar una dirección visual. No es la implementación final del producto.**

Abrí **[editorial-v1.html](editorial-v1.html)** con doble clic. Esta es la primera exploración; la propuesta espacial posterior está en [index.html](index.html). Incluye estilos, JavaScript, ilustraciones SVG y datos simulados; funciona sin instalación, servidor ni conexión.

Para ver directamente el núcleo: pulsá **Cargar escenario** en el pie y entrá en **Motor genético → Matching genético → Proyectar cría**. “Repetir escena” vuelve a mostrar la animación. “Guion · 3 min” explica el recorrido manual completo.

## Qué se exploró

| Mockup | Concepto visual | Movimiento e interacción |
|---|---|---|
| Mercado | **El campo responde.** Una necesidad cotidiana sobre una cartografía de parcelas. | La frase se vuelve una ficha editable; después de confirmar se dibujan conexiones hacia proveedores. Solicitud confirmable y contacto ficticio. |
| Carga del rodeo | **Del Excel al rodeo vivo.** La planilla adquiere una lectura por animal. | Confirmación del mapeo y transformación de filas en 293 marcas durante 1,8 segundos. |
| Tablero | **Un rodeo, 293 decisiones.** Un tapiz conserva el contexto del conjunto. | Reordenamiento de 900 ms con identidades estables. Grupos, búsqueda, ficha de Aurora y alternativa de tabla. |
| Torinder | **Encuentro genético.** Una pequeña exhibición científica dentro de una herramienta de trabajo. | Madre y toro, conexiones de rasgos, revelación de cría conceptual y comparación. Secuencia de hasta 2,6 segundos, activada por el usuario. |
| Plan | **Del encuentro al trabajo de mañana.** Una hoja operativa marfil. | Confirmación independiente, reemplazo de asignaciones y descarga real de CSV UTF-8. |
| Chat | **Respuestas que señalan sus datos.** Evidencia a un gesto de distancia. | Consulta de Carne → fuente → los 88 animales. Consulta A2 con genotipos explícitos y faltantes. |
| Asesor | **Diez establecimientos, una mirada.** Filas comparables, sin un puntaje global. | Orden por A2, cobertura o plan pendiente, conservando nodos y animando el cambio de posición durante 500 ms. |

Se eligió **una sola alternativa de matching**, “Encuentro genético”, como recomienda el documento de prompts. Mesa de luz, Constelación y Próxima generación quedan como direcciones posibles para una siguiente ronda, sin mezclarlas en el recorrido integrado.

## Dirección de arte

Papel mineral `#F3F1E9`, superficies blancas, tinta `#182822`, verde profundo `#203D30`, lima `#D5EF7D` y arcilla `#BA765C`. Shell claro, espacio amplio y una escena dominante. La serif editorial acompaña títulos; el resto usa tipografía de sistema para funcionar offline.

Los bovinos son ilustraciones SVG originales con contornos Bézier, manchas, extremidades y perfiles diferenciados. Las figuras se trasladan sin deformarse. La cría es una metáfora visual: no predice sexo, pelaje ni aspecto.

El movimiento explica selección, transformación o confirmación. Se respeta `prefers-reduced-motion`; los resultados derivan del estado y siguen disponibles si se interrumpe la animación. No hay avance de pantalla por temporizador.

## Lectura del repo y decisiones de alcance

Se revisaron `MASTER-HANDOFF.md`, la narración de `baseline.md`, los tres ADR, la spec `frontend-shell`, `designs/tokens.css`, las referencias HTML y el estado de `apps/frontend`.

| Hallazgo | Tratamiento en esta exploración |
|---|---|
| AgroMatch aporta alcance; Torinder concentra profundidad y retención. | Mercado conduce al Motor al confirmar la intención de mejorar sólidos. |
| El sidebar tiene cinco módulos; el Motor contiene tabs y chat. | Se conserva esa estructura y los paths después de `#`. Plan vive en Negociación y tratos. |
| El handoff fija maquinaria, veterinaria y genética; el archivo visual también menciona transporte. | Se respetan las tres categorías del handoff. Veterinaria muestra una intención de ejemplo y aclara que no tiene proveedores simulados en este prototipo. |
| El handoff dice “código cero”, pero esta rama ya contiene scaffold, componentes y `/ui-kit`. | Se considera ese estado una descripción desactualizada. Esta entrega agrega únicamente artefactos en `designs/visual-lab`; el frontend y su UI kit permanecen en su lugar. |
| El archivo de prompts dice no tener disponibles las referencias HTML. En el repo sí existen. | Se revisaron las referencias y se conserva su arquitectura de navegación. La nueva paleta es una propuesta independiente de los tokens oficiales. |
| La sección final del handoff describe una etapa de specs. | El pedido actual autoriza mockups conceptuales; no se ejecutaron tareas OpenSpec ni se implementaron capacidades productivas. |
| `baseline.md` cambia “semana que viene” por “esta semana” en su ejemplo. | Se conserva **próxima semana**, como pide el archivo visual. El escenario no define fechas exactas. |
| El handoff menciona aproximadamente 47% a carne; el prompt visual define 145/293 = 49,5%. | Se usan 145 → 88 únicamente como **comparación simulada**, sin atribuirle eficacia validada ni mezclarla con el análisis del rodeo real. |
| La spec ejemplifica tres tambos del asesor y el prompt propone diez. | Los diez establecimientos están explícitamente identificados como ampliación de demo. No se modifica el contrato real. |

Los ADR no se implementan como algoritmos aquí. Se respeta su sentido: ranking relativo, faltantes explícitos, sin fórmulas inventadas, y el vertical integrado en la experiencia general.

## Datos y límites del mockup

- `DEMO`, al comienzo del script inline, agrupa los fixtures. Los 293 animales del HTML son **sintéticos**, no una copia de `fixtures/herd-farm-a.json`.
- Propuesta: 120 sexado, 85 convencional y 88 carne. Criterio habitual: 80, 68 y 145. Conserva 80 sexado, 68 convencional y 88 carne; las otras 57 identidades pasan de carne a sexado (40) o convencional (17).
- Aurora #084 tiene sólidos observados de ejemplo de 6,8%. Las proyecciones de 7,2%, 7,0% y 7,1% son valores escritos en los fixtures, **sin cálculo genético**. Otros animales sin dato no reciben esa proyección.
- Solo seis animales tienen genotipo explícito en el subconjunto consultable. El chat identifica los otros 287 como no evaluables. Los porcentajes del asesor son un **fixture agregado separado**, identificado como resumen ilustrativo; no provienen de esos seis registros.
- No se estima consanguinidad ni probabilidad A2 de la descendencia. La exclusión por padre compartido es un ejemplo explícito para Aurora y Faro.
- Los planes y el estado de carga se guardan en `localStorage`, aislados por usuario y establecimiento. El reset afecta solamente el escenario activo. El resumen agregado del asesor no se recalcula a partir del plan local.
- Sin backend, IA, parser Excel, carga de archivos, autenticación real, pagos ni envío de mensajes. El selector de roles sirve para revisar la presentación, no constituye seguridad de producción.
- El formulario de Mercado reconoce ejemplos acotados. Una ficha fuera del escenario de arada de 40 ha en Río Cuarto para próxima semana muestra que no tiene fixture, en vez de reutilizar proveedores que no corresponden.
- Setup conversacional, Mis matches / mensajes y Mis ofertas permanecen **Pendiente · hoja de ruta**.

## Recorrido de revisión

1. **Mercado:** interpretar → revisar ficha → confirmar y buscar → ver exclusiones → solicitar servicio → confirmar contacto ficticio.
2. **Genética:** elegir el ejemplo “más sólidos” → confirmar intención → analizar rodeo.
3. **Carga:** usar archivo de ejemplo → confirmar columnas → explorar rodeo.
4. **Tablero:** comparar criterio habitual → volver a propuesta → elegir Aurora #084.
5. **Torinder:** elegir objetivo y toro → proyectar → ver fundamento → agregar al plan.
6. **Plan:** revisar → exportar CSV. Volver a Matching para comprobar la confirmación al reemplazar un toro para la misma vaca.
7. **Chat:** desde el Motor, consultar Carne → abrir la fuente; consultar A2 → expandir evidencia.
8. **Asesor:** cambiar a `asesor-1` desde el pie del sidebar → ordenar establecimientos → seleccionar y abrir otro rodeo.

Los controles discretos del pie permiten revisar estados **vacío, cargando, error y sin resultados**, cargar el escenario o reiniciarlo.

## Verificación

Se revisó en Chrome con el HTML abierto mediante `file://`, a **1440 × 900**, **1280 × 720** y **390 × 844**. Torinder muestra el botón de decisión y sus comparaciones dentro de 1280 × 720. Las tablas extensas pueden desplazarse; en móvil la navegación usa desplazamiento horizontal dentro de su contenedor.

El recorrido automatizado de navegador comprobó **51 condiciones**: confirmaciones, mapeo, conteos, identidad de nodos, filtros, proyección, reemplazo sin duplicados, CSV descargado y contenido UTF-8, fuente del chat, roles, cambio de tambo, aislamiento de usuario, placeholders, estados de demo, movimiento reducido, funcionamiento offline, activación con Enter, cierre de diálogo con Escape y ausencia de errores JavaScript no capturados.

Las diez capturas en `capturas/` documentan la composición. Para apreciar las animaciones, abrí el HTML.

- [Mercado](capturas/01-mercado.png) y [proveedores](capturas/02-proveedores.png).
- [Importación](capturas/03-importacion.png) y [tablero](capturas/04-tablero.png).
- [Torinder inicial](capturas/05-torinder-inicial.png), [proyección](capturas/06-torinder-proyeccion.png) y [composición a 1280 × 720](capturas/07-torinder-1280x720.png).
- [Plan](capturas/08-plan.png), [chat](capturas/09-chat.png) y [asesor](capturas/10-asesor.png).

La inspección inicial abrió una pestaña en Orca, pero su automatización respondió `runtime_unavailable`; se completó la revisión con Chrome headless. La consulta de Nx informó que no estaban instalados sus módulos en este checkout. Este artefacto autónomo no requiere Nx ni cambios de dependencias.
