---
name: torinder-notion-sync
description: Sincroniza cada tarea del MVP de Torinder con la base "Tareas Torinder" de Notion y publica los contratos que otras tareas consumen. Trigger - SIEMPRE que se arranque, avance, bloquee o termine una tarea de Torinder (IDs T0, A1-A6, B1-B7, C1-C6, D1-D7, I1, I2, DEMO), que la rama sea feat/<ID>-*, o que se toque packages/contracts o una firma pública que otra tarea consume.
---

# Torinder: sincronización con Notion

**Regla:** el estado real del trabajo vive en Notion. Si no está en Notion, para el resto del equipo no pasó. Esta skill es **obligatoria** en cada tarea, de principio a fin.

## Configuración

| Dato | Valor |
|---|---|
| Workspace | Dario Cuevas's Space |
| Base | Tareas Torinder |
| Data source | `collection://c51a6976-fe7d-4ee2-a7d6-8c915d101e51` |
| Plan | Página "6. Plan de trabajo" (debajo de Torinder) |

**Herramientas:** las del MCP de Notion conectado a este workspace: `notion-fetch`, `notion-query-data-sources`, `notion-update-page`, `notion-create-comment`. El prefijo cambia según cómo lo conectó cada dev.

**Si falta el MCP:** pedile al dev que corra `claude mcp add --transport http notion-space https://mcp.notion.com/mcp` y se autentique con su cuenta del workspace. **No se trabaja en una tarea sin Notion conectado.**

## Propiedades de la base

| Propiedad | Uso |
|---|---|
| `ID` | T0, A1… (se consulta como `"userDefined:ID"` en SQL) |
| `Estado` | `Pendiente` → `En curso` → `En revisión` → `Hecha`. Además, `Bloqueada`. |
| `Responsable` | Quién la tomó |
| `Rama / PR` | URL del PR (o de la rama mientras no hay PR) |
| `Produce (contrato)` | Qué entrega esta tarea a otras |
| `Contrato publicado` | Se tilda al publicar el contrato real |
| `Depende de` / `Bloquea a` | Relaciones entre tareas |

⚠️ **Las propiedades se cambian SOLO con `notion-update-page` y `command: "update_properties"`.** Si se mandan junto con un comando de contenido, se ignoran sin error. **Después de cada cambio, confirmalo consultando la base.**

---

## 1. ARRANQUE (antes de escribir la primera línea)

1. **Identificar la tarea.** Sale de la rama (`feat/B2-classification` → `B2`) o del pedido del dev. Si hay dudas, **preguntá** y no adivines.
2. **Buscar la fila:**
   ```sql
   SELECT url, "Tarea", "Estado", "Responsable", "Produce (contrato)", "Depende de"
   FROM "collection://c51a6976-fe7d-4ee2-a7d6-8c915d101e51" WHERE "userDefined:ID" = ?
   ```
3. **Leer la página completa** con `notion-fetch`. Ahí están los archivos, las interfaces y los **criterios de aceptación**, que son los primeros tests.
4. **Revisar las dependencias** (`Depende de`):
   - `T0` sin `Hecha` → **FRENAR**. Es la única dependencia dura.
   - Cualquier otra sin `Hecha` → seguir **usando el sustituto** (stub, fake o MSW) y avisarle al dev cuál estás usando.
5. **Tomar la tarea** con `update_properties`: `Estado = "En curso"`, `Responsable` (si está vacío) y `Rama / PR`.
6. **Confirmar** con la consulta del paso 2.
7. **Comentar en la página:** `▶️ Arranqué · rama feat/<ID>-… · sustitutos en uso: …`

## 2. DURANTE

- **Cada criterio de aceptación que pasa en verde** → tildarlo en la página con `update_content`, cambiando `- [ ] …` por `- [x] …`.
- **Bloqueo de más de 20 minutos:**
  - `Estado = "Bloqueada"`.
  - Comentario con la causa, qué se necesita y de quién, mencionando la tarea que bloquea con `<mention-page>`.
  - Al destrabarse → `Estado = "En curso"` y un comentario de una línea.
- **Cambio en `packages/contracts` o en una firma pública:**
  - **Aditivo** (campo opcional, tipo nuevo, endpoint nuevo): se permite. Agregá una entrada en la sección `## Cambios de contrato` de la página, con un diff corto, y comentá en **cada** tarea de `Bloquea a`.
  - **Incompatible** (renombrar, borrar o cambiar un tipo): **FRENAR.** No lo hagas. Avisale al dev que tiene que acordarlo con los 4.

## 3. CIERRE

Solo cuando **todos** los criterios de aceptación están tildados y los tests pasan en verde.

1. **¿Hay que publicar un contrato?** Sí, si `Produce (contrato)` no está vacío **o** si `Bloquea a` tiene alguna tarea. En ese caso:
   1. Insertá al final de la página (`insert_content`) una sección con esta forma:
      ````md
      ## Contrato entregado
      **Importar desde:** `@torinder/genetics-core` (o el paquete o endpoint que corresponda)
      **PR:** <url>
      ```ts
      // firmas EXACTAS tal como quedaron en el código
      ```
      **Ejemplo real** (entrada → salida):
      ```json
      { ... }
      ```
      **Cómo sacar el sustituto:** <qué stub, fake o mock hay que borrar o apagar>
      **Limitaciones conocidas:** <o "ninguna">
      ````
   2. `Contrato publicado = "__YES__"` con `update_properties`.
   3. **Avisar a cada tarea de `Bloquea a`** con un comentario en su página:
      `🔔 <ID> entregó <qué>. Contrato: <mention-page url="…"/>. Ya podés sacar el sustituto.`
2. **Pasar a revisión:** `Estado = "En revisión"`, con la URL del PR en `Rama / PR`.
3. **Después del merge a `main`:** `Estado = "Hecha"`.
4. **Confirmar** cada cambio con la consulta de la base y **reportarle al dev** qué quedó en Notion.

## Nunca

- ❌ Marcar `Hecha` sin el PR mergeado y sin los criterios tildados.
- ❌ Tomar una tarea que tiene otro `Responsable` sin preguntar.
- ❌ Borrar contenido de la página de otra tarea. Solo se comenta.
- ❌ Publicar un contrato con firmas que no coinciden con el código. Copialas del código, no de memoria.
- ❌ Pasar por alto un fallo de Notion: si una actualización falla, reintentá una vez y, si vuelve a fallar, avisale al dev.
