# AgroMatch · Futuros

**Nueva versión 03: [SAVRA — El campo en movimiento](savra.html).** Rebranding conceptual completo, interfaz inmersiva y paisaje 3D a pantalla completa. [Dirección de marca, movimiento y recorrido](SAVRA.md). Las versiones anteriores se conservan para comparar.

**Mockups espaciales y animados para explorar el producto. No constituyen su desarrollo final.**

Abrí **[index.html](index.html)** con doble clic. El HTML contiene sus estilos, geometría y JavaScript: funciona offline, sin instalar paquetes ni iniciar el backend. Requiere WebGL para las escenas 3D; ofrece una vista de respaldo si no está disponible.

Para ir al núcleo: **Cargar escenario → Motor genético → Proyectar cría**.

## Dirección visual

Una maqueta low poly del agro: parcelas suspendidas, animales con volumen, construcciones, árboles y maquinaria. Verde profundo, papel vegetal, lima y arcilla. Las escenas se pueden orbitar con el mouse o con las flechas del teclado al enfocar el canvas.

La propuesta es una nueva ronda a partir del pedido de mayor animación y profundidad. [editorial-v1.html](editorial-v1.html) conserva la primera versión. Su análisis del repo y los límites de los fixtures están en [EDITORIAL-V1.md](EDITORIAL-V1.md).

| Pantalla | Exploración espacial y movimiento |
|---|---|
| Mercado | Parcelas, árboles, construcciones y tractor. Confirmar la necesidad activa conexiones tridimensionales con puntos que recorren las rutas. |
| Importación | Una planilla modelada en perspectiva, con filas suspendidas. Tras confirmar el mapeo, las identidades se desplazan hacia tres parcelas. |
| Tablero | 293 volúmenes seleccionables. El cambio de criterio traslada las mismas identidades entre parcelas mediante arcos elevados; existe una alternativa de tabla. |
| Torinder | Vaca y toro low poly sobre dos islas. La cámara cambia de perspectiva, aparecen conexiones y la cría conceptual se ensambla por facetas. |
| Plan | Las asignaciones se representan como hojas tridimensionales junto al documento operativo y la descarga real de CSV. |
| Chat | La respuesta sobre Carne atenúa los otros grupos de la escena y lleva a los 88 animales que la respaldan. |
| Asesor | Diez maquetas de establecimientos y una comparación en dos columnas. El ordenamiento mueve también las maquetas. |

## Controles de Torinder

- **Proyectar cría / Repetir escena:** secuencia conceptual de 5,6 segundos. El plan se modifica por separado mediante confirmación explícita.
- **Barra de secuencia:** recorre manualmente origen, conexión y futuro.
- **Cambiar cámara:** alterna entre orbital, cenital y frontal con transición.
- **Pausa:** detiene la secuencia y el movimiento ambiental de Torinder.
- **Facetas:** desarma y reúne el volumen de la cría.
- **Arrastrar / doble clic:** orbitar / restablecer el ángulo manual.
- **Flechas / Home:** equivalentes de teclado sobre un canvas enfocado.

Con `prefers-reduced-motion`, la proyección aparece directamente en su estado final. La secuencia no navega automáticamente a otra pantalla.

## Alcance y datos

Se conservan los cinco módulos, las tabs del Motor, los roles simulados y los placeholders de la spec. Los datos y planes siguen aislados por usuario y establecimiento en `localStorage`.

Todos los animales, centrales, contactos, precios y resultados del HTML son ficticios. Los 293 animales son sintéticos; no se importó el rodeo real del repositorio. El cambio 145 → 88 animales destinados a carne es un escenario narrativo, no eficacia validada. Los genotipos faltantes y la consanguinidad no se completan mediante estimaciones inventadas.

Las escenas expresan ideas: el tamaño y la altura de objetos no son mediciones genéticas. La cría no predice sexo, aspecto, pelaje ni resultado reproductivo. Los resúmenes del asesor son fixtures agregados separados del subconjunto de genotipos del chat.

Sin parser Excel, IA conectada, API ni envío de solicitudes reales. El prototipo reconoce consultas de ejemplo. Se mantienen la confirmación de la necesidad y el aviso cuando una ficha no tiene escenario disponible.

## Archivos y reproducción

- `index.html`: entrega autónoma de Futuros, lista para abrir.
- `src/world-engine.js`: motor WebGL, shaders, geometría procedural y escenas.
- `src/spatial.css`: composición y dirección visual.
- `src/spatial-app.js`: interacción espacial sobre el estado del prototipo.
- `build-spatial.cjs`: incorpora esos recursos en un único HTML.
- `editorial-v1.html`: base autónoma de la primera exploración y referencia del estado de demo.
- `capturas-futuros/`: capturas de la propuesta 3D. `capturas/` conserva la referencia editorial anterior.

Para regenerar el HTML después de editar las fuentes:

```sh
node designs/visual-lab/build-spatial.cjs
```

Es una operación local sobre el artefacto visual; no modifica `apps/frontend`, contratos ni dependencias del monorepo.

## Revisión

Se revisó en Chrome mediante `file://`, con escenas WebGL, a 1440 × 900, 1280 × 720 y ancho móvil de 390 px. Pasaron **31 comprobaciones de navegador**, incluyendo confirmación de necesidad, clasificación de 293 identidades, cámaras, pausa, recorrido manual, facetas, guardado del plan, CSV, fuente del chat, permisos de asesor, funcionamiento offline y ausencia de excepciones JavaScript. La decisión de Torinder entra en 1280 × 720.

Capturas: [Mercado](capturas-futuros/01-mercado.png), [Torinder inicial](capturas-futuros/02-torinder-origen.png), [proyección](capturas-futuros/03-torinder-futuro.png), [1280 × 720](capturas-futuros/04-torinder-1280x720.png), [plan](capturas-futuros/05-plan.png), [tablero](capturas-futuros/06-tablero.png), [importación](capturas-futuros/07-importacion.png) y [asesor](capturas-futuros/08-asesor.png).

El rendimiento en dispositivos de gama baja y otros navegadores requiere una ronda específica antes de llevar esta dirección al producto.
