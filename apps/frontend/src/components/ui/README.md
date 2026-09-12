# Librería de componentes AgroMatch

Funciona al estilo shadcn/ui: el código vive acá, en el repo, un archivo por
componente (no es un paquete npm). Se importa directo por ruta:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
```

El alias `@/*` apunta a `apps/frontend/src/*` (ver `tsconfig.app.json` y
`vite.config.mts`). Toda variante visual sale de los tokens de diseño en
`apps/frontend/src/styles.css` (`--background`, `--primary`, `--border`,
`--muted`, etc.), que son la traducción 1:1 de `/designs/tokens.css`. Para
cambiar un color o radio, se edita ahí — nunca hardcodeado en un componente.

Referencia viva de todo lo disponible: corré el front (`npm run dev`) y
entrá a `/ui-kit`.

## Qué hay

**Primitivas (shadcn + Radix UI):** `button`, `badge`, `version-tag`, `card`,
`avatar`, `input`, `textarea`, `label`, `field` (label + control + error/hint),
`select`, `checkbox`, `radio-group`, `switch`, `tabs`, `tooltip`, `dialog`,
`dropdown-menu`, `popover`, `separator`, `table`, `progress`, `slider`,
`accordion`, `alert`, `skeleton`, `breadcrumb`, `sonner` (toasts, usar
`import { toast } from 'sonner'`).

**Composites del dominio AgroMatch (para las 22 pantallas):**

- `sidebar` — `Shell`, `Sidebar`, `SidebarBrand`, `SidebarNav`,
  `SidebarNavGroup`, `SidebarNavItem` (soporta `asChild` para envolver un
  `<NavLink>` de react-router-dom), `SidebarFooter`, `SidebarAccount`,
  `ShellMain`, `ShellContent`.
- `topbar` — franja superior con breadcrumb + acciones.
- `page-header` — título + descripción + acciones de una pantalla.
- `score-badge` — pastilla de score (hi/mid/lo). El número y el tier
  siempre se reciben como props: nunca se calculan acá (RN-17/RN-18, el
  motor produce los números, no la UI ni la IA).
- `tolerance-bar` — barra de tolerancia con marca de límite, para
  parámetros del rodeo / simulador F1.
- `stat-card` — tarjeta de KPI para paneles resumen.
- `verification-badge` — estado de verificación (`verified` / `pending` /
  `unverified`). Un proveedor no verificado siempre se muestra como tal.
- `empty-state` — estado vacío con ícono, texto y acción opcional.
- `chat` — `ChatThread`, `ChatBubble`, `ChatComposer` para el chat
  transaccional.
- `stepper` — wizard horizontal para onboarding / resumen de trato.

## Convenciones

- Cada componente exporta desde su propio archivo, sin barrel `index.ts`
  (así se importa solo lo que se usa).
- Todos usan `cn()` de `@/lib/utils` para mezclar clases sin colisiones
  (`clsx` + `tailwind-merge`).
- Los que envuelven Radix exponen las mismas props que la primitiva de
  Radix — se pueden seguir sus docs sin sorpresas.
- `asChild` (vía `@radix-ui/react-slot`) está disponible en `Button`,
  `SidebarNavItem`, `BreadcrumbLink`, `Dialog/DropdownMenu/Popover*Trigger`
  y `DialogClose` para componer con `<Link>` de react-router u otros
  elementos sin duplicar el wrapper.
