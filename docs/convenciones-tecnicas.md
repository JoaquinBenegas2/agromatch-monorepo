# Convenciones técnicas

> **Para qué existe:** que cuatro devs escriban código compatible sin preguntarse nada. Si dudás, mirá acá en vez de preguntar. Si algo no está, decidilo y agregalo.
>
> Decidido en la ronda de definiciones, septiembre de 2026. **Se confirma al inicio de T0 y no se vuelve a discutir durante la hackathon.**

---

## Resumen

| # | Tema | Decisión |
|---|---|---|
| 1 | Tests | **Solo los núcleos**, con Vitest |
| 2 | Validación | **Zod**, compartido en `shared-types` |
| 3 | Datos en el front | **React Query** |
| 4 | Componentes | **shadcn/ui** + Tailwind |
| 5 | Errores de la API | **Formato único** con filtro global |
| 6 | Modo de la IA | **Siempre real**, también en la demo |
| 7 | Estructura del front | **Por feature** |
| 8 | Estructura del backend | Controlador delgado → servicio → puerto |
| 9 | Persistencia | ✅ **PostgreSQL + Prisma** (Docker Compose), con todo detrás de interfaces |
| 10 | Idioma | Código en inglés, UI y errores en español |
| 11 | Configuración | `.env` en la raíz, claves nunca en el repo |
| 12 | Contrato de la API | `shared-types` con zod. Sin Swagger |

---

## 1. Tests: solo los núcleos

**Vitest** en `matching-core` y `genetics-core`. Ahí está la credibilidad del producto y ahí los tests son baratos, porque son funciones puras.

**La API y el front no llevan tests.** Consecuencia directa, que hay que asumir con los ojos abiertos:

- Los **criterios de aceptación** de las tareas de backend y frontend pasan a ser **verificación manual**.
- **Cada PR de esas áreas dice en su descripción cómo se verificó** ("subí el Excel real y clasificó 293"), con captura si aplica.
- La red de seguridad es el **recorrido completo de la demo**, que se corre entero en **I1** y en **I2**.

## 2. Validación: zod compartido

Los esquemas viven en `packages/shared-types` y sirven para **tres cosas a la vez**:

1. Los tipos de TypeScript (`z.infer`), que son la única fuente.
2. La validación de lo que entra a la API.
3. Las **salidas estructuradas de Claude**: lo que el LLM devuelve se valida contra el mismo esquema (RN-18).

**Regla:** si un tipo viaja entre dos paquetes, su esquema zod vive en `shared-types`. Nadie redefine el mismo tipo dos veces.

## 3. Datos en el front: React Query

Toda llamada a la API pasa por React Query. Nada de estado global, salvo el usuario simulado.

- Una clave de query por recurso: `['needs', needId, 'matches']`.
- La explicación de la IA se cachea por candidato: **no se vuelve a pedir al volver atrás en el swipe**.

## 4. Componentes: shadcn/ui + el design system del equipo

Tailwind ya viene en el scaffold. Los componentes se copian al repo y se tocan.

- **No se instala otra librería de componentes.**
- Lo compartido vive en `apps/frontend/src/shared/ui`.
- ⚠️ **Hay un design system del equipo en el repo** (`AgroMatch Design System.dc.html`): colores, tipografía y estilo salen de ahí. shadcn se **configura con esos tokens**, no se usa con el tema por defecto.

## 5. Errores: formato único

Un filtro global en NestJS devuelve **siempre** la misma forma:

```json
{ "code": "HERD_NOT_CLASSIFIED", "message": "Clasificá el rodeo antes de buscar toros", "details": {} }
```

- `code` en mayúsculas con guiones bajos, estable, para que el front lo pueda usar.
- `message` **en español**: se le muestra al usuario.
- El front **muestra el motivo real**, nunca un "algo salió mal".

## 6. Modo de la IA: siempre real, también en la demo

`AI_MODE=live` desde el primer día **y en la presentación**. Nada pregrabado: lo que ve el jurado es lo que el producto hace.

- El modo `fake` existe solo para los **tests de los núcleos** y para trabajar sin clave. **Nunca se usa para mostrar.**
- Se usa **caché de prompts de Anthropic** (`cache_control`) en la parte fija del prompt: la respuesta se sigue generando en vivo, solo baja el costo y la latencia.
- **Consecuencia que hay que asumir:** la demo depende de la conexión del evento. Se prueba la conexión **en el lugar** antes de presentar y se ensaya ahí.

## 7. Frontend: por feature

```
apps/frontend/src/
├── features/
│   ├── needs/        # ¿Qué necesitás? + resultados
│   ├── herd-import/  # carga del rodeo
│   ├── herd/         # tablero por tier
│   ├── swipe/        # tarjetas de toros
│   ├── plan/         # plan de servicios
│   ├── advisor/      # panel del asesor
│   └── chat/         # chat sobre el rodeo
└── shared/           # ui, cliente de la API, hooks comunes
```

Cada feature tiene sus componentes, sus hooks y sus llamadas adentro. **Dos personas trabajando no se pisan, porque cada una vive en su carpeta.**

## 8. Backend: controlador delgado

```
controlador (valida con zod, no piensa)
   → servicio (orquesta: busca datos, llama al núcleo, pide la explicación)
      → puerto (repositorio, LLM, ingesta)
```

- **El controlador nunca importa el núcleo.** Llama al servicio.
- El núcleo **no conoce** Nest, ni la base de datos, ni el LLM.
- Un módulo por contexto: `needs`, `providers`, `matching`, `requests`, `herd`, `classification`, `planning`, `ai`.

## 9. Persistencia: PostgreSQL + Prisma ✅ (D9 resuelta)

El equipo configuró **PostgreSQL con Docker Compose** y Prisma. Se levanta con `npm run db:up` y se migra con `npm run db:migrate`.

**Las reglas que hacen que eso no contamine el motor:**

- Todo acceso a datos pasa por una **interfaz de repositorio** definida en el módulo.
- **Nadie importa Prisma fuera de la implementación del repositorio.** Ni el núcleo, ni los servicios, ni los controladores.
- Los **fixtures siguen siendo la fuente de la verdad de la demo**: hay un seed que carga el rodeo real (293 animales), los proveedores y los toros. **El seed se puede correr de nuevo en cualquier momento** para volver al estado inicial.
- Los tests de los núcleos **no tocan la base**: son funciones puras contra los fixtures.

⚠️ **Lo que hay que cuidar:** que la demo no dependa de un estado de base que se ensució probando. Antes de cada ensayo, `db:migrate reset` + seed.

## 10. Idioma

- **Código, identificadores, nombres de archivo y commits: inglés**, salvo el mensaje del commit, que va en español.
- **UI, mensajes de error y documentación: español.**
- Los nombres del dominio son los del lenguaje ubicuo: `Female`, `Bull`, `Need`, `Capability`. No se traducen ni se inventan sinónimos.

## 11. Configuración

- `.env` en la raíz: `ANTHROPIC_API_KEY`, `AI_MODE`, `DATABASE_URL`.
- Puertos del scaffold: backend **3333** con prefijo `/api`, frontend **4200**.
- **Ninguna clave entra al repo.** Hay un `.env.example` con los nombres y sin los valores.

## 12. Contrato de la API

- **Sin Swagger.** El contrato son los esquemas zod de `shared-types`, que el front importa directo.
- El cliente de la API vive en `apps/frontend/src/shared/api` y está tipado con esos esquemas.
- Un endpoint nuevo se agrega **primero** al contrato y después se implementa.

## 13. Git

- Ramas `feature/<ID>-<nombre>` desde `develop`, por ejemplo `feature/B2-classification`.
- Conventional commits con scope: `feat(backend): agregar endpoint de matches`.
- PR chico, revisado por otro dev en menos de 10 minutos.

## 14. Decisiones con tradeoff

Si una decisión tiene alternativas razonables y consecuencias, va a un **ADR** numerado en `docs/adr/`, como el ADR-0001. Si es una convención sin debate, va acá.
