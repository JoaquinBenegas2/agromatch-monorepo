# Torinder: integración funcional

Rama: `feature/savra-genetics`, actualizada sobre `develop` en `11d411b`
(incluye PR #36, mensajería final de proveedores, y las mejoras posteriores de Mercado).

## Alcance

- Marca AgroMatch, sidebar claro y navegación compartida.
- Matching titulado **Torinder**, con marca vectorial de toro y llama.
- Escenas 3D contenidas en el layout: rodeo, importación y encuentro.
- Cada volumen del rodeo representa una identidad recibida de la API. Los
  destinos reproductivos y las alertas de salud son grupos distintos.
- Objetivos, candidatos, exclusiones y rasgos provienen de los motores reales.
  Las probabilidades de caseína se convierten de 0–1 a porcentajes.
- Guardar revalida el encuentro y obtiene precio, semen y compatibilidad del
  servidor. Importar reemplaza el rodeo y reinicia clasificación y plan.
- **Guardar encuentro → Conversar con el proveedor → Enviar consulta y abrir
  chat** conecta al módulo final `/negociacion/matches/:id` de develop.
  El chat conserva la vaca, el toro y el objetivo de la consulta inicial.
  El proveedor vinculado puede responder desde su cuenta; otros proveedores
  y establecimientos no tienen acceso.
- No hay un segundo chat ni tablas de conversación alternativas. El perfil
  en memoria usa los mismos servicios de negociación y contratos que Prisma.

## Ejecutar sin PostgreSQL ni Docker

En el `.env` de la raíz:

```dotenv
REPOSITORY_MODE=memory
PORT=3335
VITE_MOCKS=false
AI_MODE=live
ANTHROPIC_API_KEY=<clave local>
```

No subir claves. La clave permite interpretar Excel y pedir explicaciones;
los cálculos de clasificación y matching no dependen de IA.
`AI_MODE=fake` sirve para pruebas del adaptador de IA, pero no para validar
la lectura real de una planilla.

En dos terminales PowerShell, desde la raíz de este checkout:

```powershell
npm exec -- nx run @org/backend:serve
```

```powershell
$env:API_PROXY_TARGET='http://localhost:3335'
npm exec -- nx run @org/frontend:serve --port=4205
```

Abrir http://localhost:4205/motor-genetico/tablero. Elegir Tambero A, clasificar,
explorar una vaca, guardar un encuentro y contactar al proveedor. En la cuenta
del sidebar se puede seleccionar al proveedor correspondiente y responder.

La memoria conserva datos mientras corre ese proceso del backend. Reiniciar
o recompilar el servidor reinicia los fixtures, planes y conversaciones.
Prisma sigue siendo el perfil predeterminado; para usarlo se aplican las
migraciones existentes de develop y su seed.

## Verificación

- Nx: compilación, lint, tipos y pruebas de frontend y backend.
- Pruebas con repositorios en memoria y motores reales: selección obligatoria,
  una conversación reutilizable por encuentro, respuesta del proveedor,
  aislamiento de cuentas y rechazo de conversaciones cerradas.
- Importación de Excel con IA real: 12 filas aceptadas, identidades persistidas
  consistentes, clasificación y plan reiniciados.
- API: clasificación de 293 animales, elegibilidad, guardado/relectura,
  eliminación, plan automático de 241 encuentros, CSV y explicación real.
- Navegador: escena y cría 3D, navegación compartida, logo Torinder, móvil y
  flujo completo de guardar, abrir el chat final y recibir la respuesta del proveedor.

Las verificaciones de persistencia de esta entrega se ejecutan en memoria.
No se ha ejecutado PostgreSQL en este entorno.
