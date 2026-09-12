# SAVRA / El campo en movimiento

Versión conceptual 03 del laboratorio visual de AgroMatch. Abrir [savra.html](savra.html) directamente en un navegador con WebGL. Funciona offline, sin dependencias, instalaciones ni backend.

La propuesta transforma toda la superficie de la aplicación: identidad, navegación, composición, voz, fondos, estados, formularios, consultas y documentos. El paisaje tridimensional ocupa la pantalla y continúa detrás de las decisiones. Las versiones [Futuros / 02](index.html) y [Editorial / 01](editorial-v1.html) siguen disponibles.

## Identidad propuesta

**SAVRA** tiene un sonido orgánico y una firma verbal: **El campo en movimiento**. El símbolo original son dos corrientes curvas que se encuentran y construyen una S. Su respiración animada extiende la idea de circulación de la marca.

| Elemento | Decisión |
|---|---|
| Tinta / `#091521` | Una atmósfera nocturna continua |
| Citron / `#dcfa70` | Acciones, oportunidades y puntos de encuentro |
| Coral / `#ff8d72` | Señales, acentos y destinos del paisaje |
| Menta / `#87d6c1` | Contexto y circulación de luz |
| Semilla / `#edf0cf` | Lectura, títulos y documentos |
| Tipografía | Sans de sistema de gran escala y serif cursiva para palabras expresivas; funciona sin descargas |
| Voz | Directa, cercana y activa: «Decí qué necesitás», «Explorá el encuentro», «Lo que elegiste» |

El nombre es una exploración creativa, sin investigación de disponibilidad comercial. La nueva marca no se aplica a producción.

## Un movimiento para cada parte

| Superficie | Movimiento e interacción |
|---|---|
| Atmósfera | Luz que deriva, gradientes sensibles al puntero, contornos en circulación, grano y semillas suspendidas |
| Marca y títulos | Símbolo que respira, palabras que emergen con profundidad y acentos con color en circulación |
| Navegación | Módulos suspendidos, respuesta al hover y barrido luminoso entre recorridos |
| Conexiones | Territorio low poly, maquinaria en movimiento, cámara con deriva y rutas hacia los proveedores |
| Confirmación | Una superficie translúcida se despliega; los resultados aparecen en secuencia |
| Cruza | Encuentro entre vaca y toro, recorrido de conexiones y construcción de una cría por facetas; secuencia manipulable y despiece interactivo |
| Rodeo vivo | 293 volúmenes conservan su identidad al desplazarse entre destinos por trayectorias elevadas |
| El origen | Planilla tridimensional, columnas asociables y transformación hacia el paisaje del rodeo |
| Mi plan | Hojas suspendidas y un documento con las asignaciones guardadas |
| Perspectiva | Diez establecimientos tridimensionales que se reordenan al cambiar el criterio |
| Conversación y estados | Consulta lateral, entradas de contenido, espera orbital y recuperación con la misma identidad |

Las entradas tipográficas terminan para dejar leer; la atmósfera continúa. El control superior **Ⅱ** detiene el movimiento. Se respeta `prefers-reduced-motion`. El canvas admite arrastre, flechas del teclado e Inicio para restablecer la perspectiva. Los datos del rodeo también tienen listado y tabla.

## Mapa del producto

| AgroMatch | SAVRA |
|---|---|
| Mi establecimiento | Mi lugar |
| Mercado y oportunidades | Conexiones |
| Motor genético / Torinder | Cruza |
| Matching genético | Encuentros |
| Tablero del rodeo | Rodeo vivo |
| Carga del rodeo | El origen |
| Panel del asesor | Perspectiva |
| Negociación y tratos | Mi plan y conversaciones |
| Mis ofertas | Mis ofertas |

Se conservan las cinco entradas principales y las rutas de los flujos. Mi lugar, conversaciones y Mis ofertas muestran la nueva identidad como espacios pendientes, de acuerdo con el alcance del mockup anterior.

## Recorrido de revisión

1. En Conexiones, enviar la necesidad de ejemplo, confirmar los campos y explorar los tres proveedores. La solicitud y su contacto son ficticios.
2. Entrar en Cruza → El origen. Desplegar el ejemplo, asociar columnas y dar vida a las 293 identidades.
3. En Rodeo vivo, comparar con el criterio habitual. Filtrar, seleccionar una caravana y abrir una consulta con evidencia.
4. En Encuentros, cambiar de objetivo o toro y explorar el encuentro. Recorrer la secuencia, cambiar de cámara y desarmar las facetas.
5. Guardar el encuentro. Mi plan refleja la asignación y permite descargar un CSV real con las selecciones ficticias.
6. Desde la cuenta superior, cambiar a `asesor-1`. Perspectiva permite comparar y reordenar diez establecimientos.
7. **Estudio** permite cargar el ejemplo, explorar estados de vacío, carga y error o reiniciar la demo. **La marca** abre la dirección de identidad.

## Contexto y límites

Se mantiene el análisis del MASTER-HANDOFF documentado en [EDITORIAL-V1.md](EDITORIAL-V1.md): valores genéticos ilustrativos, fuentes y faltantes visibles, escenarios locales por usuario y establecimiento, acceso de asesor y separación entre ranking y probabilidad.

La cría 3D no predice sexo, aspecto, pelaje ni reproducción. A2 de la descendencia y consanguinidad muestran «No estimable». Los sólidos de Aurora son un fixture visual. El ejemplo de carga no procesa archivos externos. No hay solicitudes reales ni IA conectada. La persistencia de esta versión usa su propio espacio local `savra-immersive-v3:`.

## Fuentes y verificación

- `src/savra.css`: identidad, composición adaptable y animaciones del sistema visual.
- `src/savra-app.js`: nueva interfaz, escenas persistentes y conexiones con los estados de demostración.
- `src/world-engine.js`: geometría y motor WebGL original compartido con Futuros. El generador aplica ajustes de cámara y atmósfera exclusivamente al artefacto SAVRA.
- `editorial-v1.html`: datos y lógica local reutilizados por el generador; su interfaz se sustituye por la nueva composición.
- Reconstrucción: `node designs/visual-lab/build-savra.cjs`.
- [Capturas de revisión](capturas-savra/) en 1440×900, 1280×720 y 390×844.
- [Verificación en Chrome](capturas-savra/verificacion.json): recorridos, validación de columnas, persistencia de escena, consultas, plan, permisos de la vista de asesor, movimiento reducido y adaptación de ancho. Sin excepciones de JavaScript en los recorridos comprobados.

Este material sirve para decidir una dirección visual. No sustituye el desarrollo final ni modifica las aplicaciones del monorepo.
