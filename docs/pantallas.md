# Mapa de pantallas

> **Qué resuelve:** que las 8 pantallas se vean como un solo producto aunque las construyan dos personas. El **design system** (`AgroMatch Design System.dc.html`) define el lenguaje visual —tipografía, color, controles, badges, tarjeta de oferta, barra de tolerancia—; **este documento define qué pantallas hay, qué muestra cada una y en qué estados**.

---

## La regla que alinea todo

**D1 no arma solo el router: arma el *shell* y los componentes compartidos.** Recién cuando eso está, se construyen las pantallas encima. Si cada pantalla inventa su propio botón, su propia tarjeta y su propio estado vacío, terminamos con cuatro productos.

**Orden:** shell + componentes compartidos (D1) → pantallas (M6, D2, D3, D4, D5, D6, D8).

---

## 1. El shell

Lo mismo en todas las pantallas:

```
┌──────────────────────────────────────────────────────────┐
│ AgroMatch        [Necesidades] [Rodeo] [Plan] [Asesor]    │
│                                    Usuario: ▼ Tambo A     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    contenido                             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **Selector de usuario** (tambero / asesor): setea `x-user-id`. Es lo que permite mostrar el panel del asesor en la demo.
- La navegación **muestra solo lo que el usuario puede ver**: el panel del asesor no aparece para un tambero.
- El **chat** vive como panel lateral, no como pantalla aparte.

## 2. Componentes compartidos (los arma D1)

| Componente | Dónde se usa | Qué tiene que resolver |
|---|---|---|
| `BadgeEstado` | Proveedores, hembras, toros | Verificado / no verificado, tier, etiquetas (`A2_NUCLEUS`, `MASTITIS_RISK`) |
| `TarjetaOferta` | Resultados de necesidad **y** swipe de toros | Es la misma tarjeta base: título, badges, compatibilidad, desglose, acción |
| `BarraComparativa` | Cría vs madre, desglose del `fit` | Valor, referencia y dirección (en SCS y RFI, menos es mejor) |
| `ChipsFiltro` | Tablero, resultados | Filtrar por tier, etiqueta o categoría |
| `TablaDatos` | Rodeo, plan, mapeo del Excel | Orden, filtro y fila expandible con los motivos |
| `ExplicacionIA` | Swipe, resultados | Texto + indicador **AI / FALLBACK** visible |
| `EstadoVacio` | Todas | Texto + acción sugerida |
| `Cargando` | Todas | Skeleton, no un spinner suelto |
| `MensajeError` | Todas | Muestra el `message` del backend, nunca "algo salió mal" |

**Los cuatro estados son obligatorios en cada pantalla:** vacío, cargando, error y sin resultados. Si una pantalla no los tiene, no está terminada.

---

## 3. Las pantallas

### 3.1 · ¿Qué necesitás? (M6) — la puerta de entrada

```
┌──────────────────────────────────────────────────────────┐
│  ¿Qué necesitás?                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ necesito quien me are 40 ha en Río Cuarto la...    │  │
│  └────────────────────────────────────────────────────┘  │
│  Ejemplos:  [arar 40 ha]  [veterinario]  [más sólidos]   │
├──────────────────────────────────────────────────────────┤
│  Entendí esto:                            [Editar]       │
│  Maquinaria · Arada · 40 ha · Río Cuarto · esta semana   │
│  ⚠ la fecha la deduje del texto                          │
│                                    [Buscar proveedores]  │
├──────────────────────────────────────────────────────────┤
│  8 proveedores  |  4 excluidos                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Contratista X        #1 de 8   ● no verificado     │  │
│  │ 32 km · disponible esta semana · desde $X/ha       │  │
│  │ cercanía ████░ disponibilidad █████ capacidad ███░ │  │
│  │ "Está a 32 km y tiene la ventana libre..."   [IA]  │  │
│  │                                     [Solicitar]    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- La **necesidad interpretada es editable antes de buscar** (RN-30). Los campos con baja confianza se marcan.
- Si la categoría es `GENETICS`, el botón lleva **al swipe**, no a una lista de proveedores.
- La pestaña **excluidos** muestra el motivo: cobertura, capacidad, disponibilidad, certificación.

### 3.2 · Carga del rodeo (D2)

Tres pasos en la misma pantalla: **soltar el archivo → confirmar el mapeo → ver el resultado**.

- Tabla de mapeo: columna del Excel, campo destino, **confianza en color** (amarillo por debajo de 0,8) y editable.
- Resultado: filas ok, filas rechazadas con el motivo, avisos (los 2 sin padre).

### 3.3 · Tablero del rodeo (D3) — el momento del pitch

```
┌──────────────────────────────────────────────────────────┐
│  Rodeo · 293 animales            Objetivo: [Sólidos ▼]   │
│  ┌────────┐ ┌────────────┐ ┌────────┐ ┌────────┐         │
│  │ ÉLITE  │ │ COMERCIAL  │ │ CARNE  │ │ ALERTA │         │
│  │  73    │ │    132     │ │   86   │ │   2    │         │
│  │  25%   │ │    45%     │ │  30%   │ │  <1%   │         │
│  └────────┘ └────────────┘ └────────┘ └────────┘         │
│  ⚠ Con las reglas clásicas, 138 (47%) iban a carne       │
├──────────────────────────────────────────────────────────┤
│  [Todos][Élite][Comercial][Carne] [A2/A2][BB][Mastitis]  │
│  Tabla con motivos desplegables → clic lleva al swipe    │
└──────────────────────────────────────────────────────────┘
```

La comparación **47% contra 30%** es el argumento visual del producto. Tiene que estar, y tiene que entenderse sin explicación.

### 3.4 · Swipe (D4) — la pantalla estrella

```
┌───────────────┬──────────────────────────────────────────┐
│ Hembra 3031   │  Toro EJEMPLO 029HO20544    #1 de 12     │
│ COMERCIAL     │  ABS · Holando · sexado · $38            │
│ ⚠ mastitis    │  ┌────────────────────────────────────┐  │
│ corrige: SCS  │  │ Cría esperada vs la madre          │  │
│               │  │ SCS  3,19 → 2,95  ████████░ mejora │  │
│ Objetivo:     │  │ PRO    24 → 29    ██████░░ mejora  │  │
│ [Sólidos ▼]   │  │ A2/A2 50%  ·  BB 50%               │  │
│ o escribilo   │  └────────────────────────────────────┘  │
│               │  ✓ parentesco ok   ✓ parto ok            │
│               │  "Corrige la mastitis de tu ternera..."  │
│               │                              [IA]        │
│               │      [✕ Pasar]        [♥ Elegir]         │
├───────────────┴──────────────────────────────────────────┤
│  Candidatos (12)   |   Excluidos (3)                     │
└──────────────────────────────────────────────────────────┘
```

- **"#1 de 12", nunca "92% de probabilidad"** (RN-15).
- Los filtros pasados se ven, y los excluidos muestran el motivo real ("hijo del mismo padre: 12,5% de consanguinidad").
- El objetivo se cambia **sin salir de la pantalla**, y el ranking se recalcula.

### 3.5 · Plan de servicios (D5)

Tabla del plan, totales arriba (dosis por tipo, costo, cría esperada promedio), botón **Plan automático** y exportar CSV.

### 3.6 · Panel del asesor (D6)

Una tarjeta por tambo con la distribución por tier, % A2/A2 y BB, y un gráfico comparativo. **Solo visible para el usuario asesor.**

### 3.7 · Chat (D8)

Panel lateral: pregunta, respuesta y **qué herramientas usó**. Si contestó sin herramienta, se marca como no verificado.

---

## 4. Reglas visuales que vienen del negocio

No son estéticas: si se rompen, el producto deja de ser honesto.

1. **Compatibilidad como ranking** ("#1 de 12"), nunca como probabilidad.
2. **No verificado se ve no verificado**, con badge, siempre.
3. **Los motivos de exclusión se muestran**, no se ocultan.
4. **La explicación de la IA lleva su indicador** AI o FALLBACK.
5. **Todo dato semilla o de demo dice que lo es.**

---

## 5. Qué NO se diseña

Login, registro, alta de proveedor, pantalla de configuración, perfil, notificaciones y pantallas de administración. **No entran al MVP**: si alguien las empieza, está gastando horas que faltan en el swipe.
