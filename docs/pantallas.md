# Mapa de pantallas

> **Qué resuelve:** que las pantallas se vean como un solo producto aunque las construya un dev distinto por cada flujo. El **lenguaje visual** (tipografía, color, controles, radios) sale de `/designs` (`tokens.css` + `AgroMatch Design System.dc.html`) y ya está traducido a Tailwind en `apps/frontend/src/styles.css`. **La librería de componentes en `apps/frontend/src/components/ui` es la implementación real de ese lenguaje — este documento dice qué pantalla usa qué componente, con qué props, y en qué estados.**
>
> Nada de esto es un boceto a mano alzada: cada componente nombrado abajo existe, tiene su archivo y está tipado. Si una pantalla necesita algo que no está en la lista, se agrega a `components/ui` (un archivo por componente, mismo patrón que los demás) antes de improvisarlo dentro de la pantalla.

---

## La regla que alinea todo

**D1 no arma solo el router: arma el *shell* y los 9 componentes compartidos.** Es lo primero que se construye — antes de que nadie, en ningún flujo, toque su propia pantalla. Con el reparto por flujo end-to-end (ver `docs/plan-de-trabajo.md §2`), **los cuatro devs terminan dibujando una pantalla propia** (B → "¿Qué necesitás?", C → carga y tablero del rodeo, D → swipe y plan, y al final quien vaya más holgado → panel del asesor y chat). Si cada uno inventa su propio botón, su propia tarjeta y su propio estado vacío, terminamos con cuatro productos que además no van a coincidir con `/designs`.

**Orden:** shell + 9 componentes (`D1`, primeras 2 horas) → pantallas de cada flujo.

---

## 1. El shell

Implementado con `Shell` + `Sidebar` de `components/ui/sidebar.tsx` y `Topbar` de `components/ui/topbar.tsx` (referencia visual: `/designs/01-sidebar-scaffolding.html`). Para el MVP la navegación se reduce a los destinos reales de `docs/plan-de-trabajo.md`, agrupados en un solo `SidebarNavGroup`:

```tsx
<Shell>
  <Sidebar>
    <SidebarBrand mark="A" name="AgroMatch" subtitle={selectorDeUsuario} />
    <SidebarNav>
      <SidebarNavGroup label="Necesidad">
        <SidebarNavItem icon={<Sparkles />} active>¿Qué necesitás?</SidebarNavItem>
      </SidebarNavGroup>
      <SidebarNavGroup label="Rodeo">
        <SidebarNavItem icon={<Upload />}>Carga del rodeo</SidebarNavItem>
        <SidebarNavItem icon={<LayoutGrid />}>Tablero</SidebarNavItem>
        <SidebarNavItem icon={<Heart />}>Swipe</SidebarNavItem>
        <SidebarNavItem icon={<ClipboardList />}>Plan de servicios</SidebarNavItem>
      </SidebarNavGroup>
      {/* Panel del asesor: solo si x-user-id === asesor */}
      <SidebarNavGroup label="Asesor">
        <SidebarNavItem icon={<ChartNoAxesCombined />}>Panel del asesor</SidebarNavItem>
      </SidebarNavGroup>
    </SidebarNav>
    <SidebarFooter>
      <SidebarAccount avatar={<Avatar size="sm"><AvatarFallback>TA</AvatarFallback></Avatar>} name="Tambo A" meta="tambero" />
    </SidebarFooter>
  </Sidebar>
  <ShellMain>
    <Topbar>{/* breadcrumb + selector de usuario */}</Topbar>
    <ShellContent>{/* PageHeader + contenido de la pantalla */}</ShellContent>
  </ShellMain>
</Shell>
```

- **Selector de usuario** (tambero / asesor): un `Select` (`components/ui/select.tsx`) en el `Topbar` o en `SidebarAccount`, que setea `x-user-id`. Es lo que permite mostrar el panel del asesor en la demo.
- La navegación **muestra solo lo que el usuario puede ver**: `SidebarNavGroup` "Asesor" no se renderiza para un tambero.
- El **chat vive como panel lateral** (un `Card` angosto con `ChatThread` + `ChatComposer` de `components/ui/chat.tsx` dockeado a la derecha del `ShellContent`), no como pantalla de la navegación.

---

## 2. Los 9 componentes compartidos (los arma D1)

Cada uno es un archivo en `apps/frontend/src/components/ui/`, se importa como `@/components/ui/<archivo>`.

| Componente | Archivo | Dónde se usa | Qué resuelve |
|---|---|---|---|
| **BadgeEstado** | `verification-badge.tsx` (+ `badge.tsx` para tiers/etiquetas) | Proveedores, hembras, toros | `VerificationBadge status="verified\|pending\|unverified"`; tiers y etiquetas (`A2_NUCLEUS`, `MASTITIS_RISK`) con `Badge variant="ok\|warn\|danger\|neutral"` |
| **TarjetaOferta** | `offer-card.tsx` | Resultados de "¿Qué necesitás?" **y** swipe de toros | Misma tarjeta base: `image`, `title`, `subtitle`, `badges`, `rank` (`#1 de 12`, nunca probabilidad), `stats`, `price`, `explanation`, `primaryAction` |
| **BarraComparativa** | `comparison-bar.tsx` | Desglose del *fit* en el swipe (cría vs. madre) | `ComparisonBar from={} to={} direction="higher-is-better\|lower-is-better"` — en SCS y RFI, menos es mejor |
| **ChipsFiltro** | `filter-chips.tsx` | Tablero del rodeo, resultados de necesidad | `FilterChips` multi-selección por tier, etiqueta o categoría, con contador |
| **TablaDatos** | `table.tsx` + patrón de fila expandible | Rodeo, plan, mapeo del Excel | `Table/TableHeader/TableRow/TableCell` de base; la fila expandible con los motivos se arma en la pantalla con `useState` (ver Tablero del rodeo) |
| **ExplicacionIA** | `ai-explanation.tsx` | Swipe, resultados de necesidad | `AiExplanation text={} source="AI"\|"FALLBACK"` — el indicador es obligatorio y siempre visible |
| **EstadoVacio** | `empty-state.tsx` | Todas | `EmptyState title=... description=... action=...` |
| **Cargando** | `skeleton.tsx` | Todas | Skeletons compuestos por pantalla; nunca un spinner suelto |
| **MensajeError** | `error-message.tsx` | Todas | `ErrorMessage message={backend.message}` — nunca "algo salió mal" |

Además de estos 9, ya están construidos y disponibles para cualquier pantalla: `button`, `card`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `tabs`, `tooltip`, `dialog`, `dropdown-menu`, `popover`, `separator`, `progress`, `slider`, `accordion`, `alert`, `breadcrumb`, `sonner` (toasts), `avatar`, `field`, `page-header`, `stat-card`, `score-badge`, `tolerance-bar`, `stepper`, `chat`. Referencia viva de todos: correr `npm run dev` y entrar a `/ui-kit`.

**Los cuatro estados son obligatorios en cada pantalla:** vacío (`EmptyState`), cargando (`Skeleton`), error (`ErrorMessage`) y sin resultados. Si una pantalla no los tiene, no está terminada.

---

## 3. Las pantallas

### 3.1 · ¿Qué necesitás? (M6) — Dev B, la puerta de entrada

```
┌──────────────────────────────────────────────────────────┐
│  ¿Qué necesitás?                                         │  ← PageHeader
│  ┌────────────────────────────────────────────────────┐  │
│  │ necesito quien me are 40 ha en Río Cuarto la...    │  │  ← Textarea
│  └────────────────────────────────────────────────────┘  │
│  Ejemplos:  [arar 40 ha]  [veterinario]  [más sólidos]   │  ← FilterChips (multiple=false)
├──────────────────────────────────────────────────────────┤
│  Entendí esto:                            [Editar]       │  ← Card + Button variant="ghost"
│  Maquinaria · Arada · 40 ha · Río Cuarto · esta semana   │
│  ⚠ la fecha la deduje del texto                          │  ← Alert variant="warning"
│                                    [Buscar proveedores]  │  ← Button
├──────────────────────────────────────────────────────────┤
│  8 proveedores  |  4 excluidos                           │  ← Tabs
│  ┌────────────────────────────────────────────────────┐  │
│  │ Contratista X        #1 de 8   ● no verificado     │  │  ← OfferCard + VerificationBadge
│  │ 32 km · disponible esta semana · desde $X/ha       │  │
│  │ "Está a 32 km y tiene la ventana libre..."   [IA]  │  │  ← AiExplanation
│  │                                     [Solicitar]    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- La **necesidad interpretada es editable antes de buscar** (RN-30). Los campos con baja confianza se marcan (`Badge variant="warn"` sobre el campo, o `Alert variant="warning"`).
- Si la categoría es `GENETICS`, el botón "Buscar proveedores" lleva **al swipe**, no a una lista de `OfferCard` de proveedores.
- La pestaña "excluidos" (`TabsTrigger`) muestra el motivo con `TableDatos` o una lista de `OfferCard` deshabilitadas: cobertura, capacidad, disponibilidad, certificación.

### 3.2 · Carga del rodeo (C2 + D2) — Dev C

Tres pasos en la misma pantalla: **soltar el archivo → confirmar el mapeo → ver el resultado.**

- Dropzone simple (`Card` con borde punteado, mismo tratamiento visual que `EmptyState`).
- Tabla de mapeo (`Table`): columna del Excel, campo destino (`Select`), **confianza en color** — `Badge variant="warn"` por debajo de 0,8 — y editable.
- Resultado: filas ok, filas rechazadas con el motivo (`ErrorMessage` inline por fila o columna de motivo en la tabla), avisos de los 2 animales sin padre (`Alert variant="warning"`).

### 3.3 · Tablero del rodeo (C2 + B2/B3 + D3) — Dev C, el momento del pitch

```
┌──────────────────────────────────────────────────────────┐
│  Rodeo · 293 animales            Objetivo: [Sólidos ▼]   │  ← PageHeader + Select
│  ┌────────┐ ┌────────────┐ ┌────────┐ ┌────────┐         │
│  │ ÉLITE  │ │ COMERCIAL  │ │ CARNE  │ │ ALERTA │         │  ← StatCard × 4
│  │  73    │ │    132     │ │   86   │ │   2    │         │
│  │  25%   │ │    45%     │ │  30%   │ │  <1%   │         │
│  └────────┘ └────────────┘ └────────┘ └────────┘         │
│  ⚠ Con las reglas clásicas, 138 (47%) iban a carne       │  ← Alert variant="warning"
├──────────────────────────────────────────────────────────┤
│  [Todos][Élite][Comercial][Carne] [A2/A2][BB][Mastitis]  │  ← FilterChips
│  Tabla con motivos desplegables → clic lleva al swipe    │  ← Table + fila expandible
└──────────────────────────────────────────────────────────┘
```

- La comparación **47% contra 30%** es el argumento visual del producto (`Alert` o un texto destacado con `ComparisonBar` si se quiere visualizar la barra clásico-vs-Torinder). Tiene que estar, y tiene que entenderse sin explicación.
- Fila expandible con los motivos: se arma con `TableRow` + un `TableRow` adicional condicional (`useState<Set<id>>`) que muestra el detalle — no hace falta un componente nuevo, es el patrón de `TablaDatos`.
- Clic en una hembra de la tabla navega al swipe con esa hembra seleccionada.

### 3.4 · Swipe (D4) — Dev D, la pantalla estrella

```
┌───────────────┬──────────────────────────────────────────┐
│ Hembra 3031   │  Toro EJEMPLO 029HO20544    #1 de 12     │  ← OfferCard (rank)
│ COMERCIAL     │  ABS · Holando · sexado · $38            │
│ ⚠ mastitis    │  ┌────────────────────────────────────┐  │
│ corrige: SCS  │  │ Cría esperada vs la madre          │  │
│               │  │ SCS  3,19 → 2,95  ████████░ mejora │  │  ← ComparisonBar
│ Objetivo:     │  │ PRO    24 → 29    ██████░░ mejora  │  │  ← ComparisonBar
│ [Sólidos ▼]   │  │ A2/A2 50%  ·  BB 50%               │  │
│ o escribilo   │  └────────────────────────────────────┘  │
│               │  ✓ parentesco ok   ✓ parto ok            │  ← Badge variant="ok"
│               │  "Corrige la mastitis de tu ternera..."  │  ← AiExplanation
│               │                              [IA]        │
│               │      [✕ Pasar]        [♥ Elegir]         │  ← OfferCard actions
├───────────────┴──────────────────────────────────────────┤
│  Candidatos (12)   |   Excluidos (3)                     │  ← Tabs
└──────────────────────────────────────────────────────────┘
```

- **"#1 de 12", nunca "92% de probabilidad"** (`OfferCard.rank`, RN-15).
- El objetivo se cambia con `Select` + `Input` de texto libre **sin salir de la pantalla**, y el ranking se recalcula.
- Los excluidos (`TabsContent`) muestran el motivo real ("hijo del mismo padre: 12,5% de consanguinidad") con `EmptyState` si la lista de candidatos queda vacía.
- Like o descarte: `Button` primario/secundario dentro de `OfferCard`, más binding de teclado (flechas o `J`/`K`) en la pantalla.

### 3.5 · Plan de servicios (D5) — Dev D

`Table` con el plan, `StatCard`s arriba con los totales (dosis por tipo, costo, cría esperada promedio), `Button` "Plan automático" y exportar CSV.

### 3.6 · Panel del asesor (B6 + D6) — al final, quien vaya más holgado

Una `Card` por tambo (`StatCard` para la distribución por tier, % A2/A2 y BB) y un gráfico comparativo. **Solo visible para el usuario asesor** (el `SidebarNavGroup` "Asesor" no se renderiza para un tambero).

### 3.7 · Chat (C6 + B7 + D8) — al final, quien vaya más holgado

Panel lateral con `ChatThread` + `ChatBubble` + `ChatComposer` (`components/ui/chat.tsx`): pregunta, respuesta y qué herramientas usó. Si contestó sin herramienta, se marca con `AiExplanation source="FALLBACK"`.

---

## 4. Reglas visuales que vienen del negocio

No son estéticas: si se rompen, el producto deja de ser honesto. Cada una tiene su componente que la hace estructuralmente difícil de romper:

1. **Compatibilidad como ranking** ("#1 de 12"), nunca como probabilidad → `OfferCard.rank`, nunca un `%` suelto.
2. **No verificado se ve no verificado**, con badge, siempre → `VerificationBadge`, no un booleano oculto.
3. **Los motivos de exclusión se muestran**, no se ocultan → `TablaDatos`/`Tabs` "Excluidos", nunca se filtran en silencio.
4. **La explicación de la IA lleva su indicador** AI o FALLBACK, siempre visible → `AiExplanation`, el prop `source` es obligatorio.
5. **Los errores muestran el mensaje real del backend** → `ErrorMessage`, nunca un catch-all genérico.
6. **Todo dato semilla o de demo dice que lo es** → `Badge variant="neutral"` con la etiqueta "Semilla" donde corresponda.

---

## 5. Qué NO se diseña

Login, registro, alta de proveedor, pantalla de configuración, perfil, notificaciones y pantallas de administración. **No entran al MVP**: si alguien las empieza, está gastando horas que faltan en el swipe. (Las mockups de `/designs` para esas pantallas quedan como referencia de estilo visual — tipografía, tarjetas, tablas — no como pantallas a construir.)
