# flow-herd — Excel → rodeo clasificado

**Dueño:** Dev C.
**Prioridad:** P0 (C2, B2, B3, D2, D3 son todas P0). Hito **I1** (hora 9).
**Tareas del plan:** C2 · B2 · B3 · D2 · D3. (C1 está en `mvp-0-foundation/llm-client`; C3 y D7 quedan fuera del MVP.)
**Fuente visual (manda sobre `pantallas.md §1` donde difieren):** `designs/01-sidebar-scaffolding.html` y la barra de tabs del módulo en `AgroMatch Motor Genetico.dc.html` (PR #11), con el mapa de navegación de `mvp-0-foundation/specs/frontend-shell`. El contenido de las dos pantallas sigue `pantallas.md §3.2` y `§3.3`: todavía no tienen mockup propio (la tab "Tablero del rodeo" figura "pendiente" en el mockup).

## Purpose

Convierte el Excel de genotipado del productor en hembras con perfil genómico, con mapeo de columnas propuesto por la IA y confirmado por un humano, y clasifica el rodeo entero en `ELITE`, `COMMERCIAL`, `BEEF` o `CULL_ALERT` con reglas determinísticas, percentiles del propio tambo y zona gris, mostrando siempre los motivos y la comparación contra las reglas clásicas.

## Alcance

**Entra**
- F1 (carga del rodeo): `HerdIngestionPort` real, los dos endpoints de `herd-imports` y la tab **Carga del rodeo** del módulo Motor genético (`/motor-genetico/importar`, `features/herd-import/`), accesible también desde el botón "Subir Excel" de la barra del módulo y desde el estado vacío del Tablero.
- F2 (clasificación): `classifyHerd` con RN-07 a RN-12 y ADR-0001, `classifyHerdClassic` para la comparación, los tres endpoints de `classification`/`herd` y la tab **Tablero del rodeo** del módulo Motor genético (`/motor-genetico/tablero`, `features/herd/`).
- El botón **"Subir Excel"** de la barra del módulo Motor genético (el mismo que renderiza D4 en `mvp-d-match`): un `Button variant="secondary"` compartido que navega a `/motor-genetico/importar`. Lo arma C, D lo reutiliza.
- Persistencia de las hembras importadas y de la última clasificación por tambo (con el objetivo que la produjo).
- Tests Vitest de `classifyHerd` con `herd-farm-a`.

**Queda afuera**
- **C3 y D7**, extracción de catálogos PDF y su pantalla: fuera del MVP por decisión del equipo (`plan-de-trabajo.md` §9). El contrato `CatalogIngestionPort` queda en `shared-contracts` sin implementar.
- El matching hembra × toro y la explicación (`mvp-a-core`, `mvp-d-match`).
- El chat sobre el rodeo (anexo de `mvp-a-core`) y el panel del asesor (anexo de `mvp-b-need`): consumen lo que se produce acá. La tab **"Panel del asesor"** convive en la misma barra de tabs del módulo (solo para `ADVISOR`/`ADMIN`), pero es trabajo del anexo de `mvp-b-need`, no de C.
- La tab **"Matching genético"** de la misma barra: es D4 (`mvp-d-match`).
- La barra de tabs del módulo y el shell: los provee `mvp-0-foundation/frontend-shell`; C solo llena sus dos tabs.
- Haplotipos y defectos genéticos (hoja de ruta, `motor-datos-de-toros.md` §6).
- Cualquier rasgo que no esté en `TraitKey`: fertilidad, tipo, conformación.

## Contratos

### Consume (de `mvp-0-foundation` / `shared-contracts`, firmas exactas)

```ts
export type Scale = 'CDCB';
export type TraitKey = 'ci' | 'milk' | 'fat' | 'pro' | 'pl' | 'scs' | 'fs' | 'rfi';
export type TraitVector = Record<TraitKey, number>;

export interface GenomicProfile {
  traits: TraitVector;
  betaCasein: BetaCasein | null;
  kappaCasein: KappaCasein | null;
  scale: Scale;
  source: string;
}

export type FemaleCategory = 'CALF' | 'HEIFER' | 'COW';
export interface Female {
  id: string;
  farmId: string;
  visualId: string;               // TEXTO: hay caravanas como "C136"
  birthDate: string;              // ISO yyyy-mm-dd
  sireNaab: string | null;
  category: FemaleCategory;
  profile: GenomicProfile | null; // null = sin genotipado (RN-24)
}

export interface TierQuotas { sexedPct: number; beefPct: number } // default 25 / 30
export interface GrayZone { from: number; to: number }             // ADR-0001, inclusivo
export interface Farm {
  id: string;
  name: string;
  location: string;
  tierQuotas: TierQuotas;
  calvingEaseMaxHeifer: number;
  scsGrayZone: GrayZone;          // default { from: 3.10, to: 3.18 }
  plGrayZone: GrayZone;           // default { from: 0.00, to: 0.20 }
}

export interface BreedingGoal {
  preset: GoalPreset | 'CUSTOM';
  weights: Partial<Record<TraitKey, number>>;
  wantBetaA2: boolean;
  wantKappaBB: boolean;
  rawText?: string;
}

export type Tier = 'ELITE' | 'COMMERCIAL' | 'BEEF' | 'CULL_ALERT';
export type Tag =
  | 'A2_NUCLEUS' | 'CHEESE_BB' | 'MASTITIS_RISK' | 'SHORT_LIFE' | 'NO_SIRE' | 'GOAL_PROTECTED';
export interface Classification {
  femaleId: string;
  tier: Tier;
  semenType: SemenType | null;    // null en CULL_ALERT
  ciPercentile: number;           // 0..100 dentro del tambo (RN-07)
  tags: Tag[];
  corrective: TraitKey[];         // rasgos a corregir en el matching (RN-09)
  reasons: string[];              // texto determinístico, nunca de la IA
}

export type FemaleField =
  | 'visualId' | 'birthDate' | 'sireNaab' | TraitKey | 'betaCasein' | 'kappaCasein';
export interface ColumnMapping { headerRow: number; columns: Record<string, FemaleField | 'IGNORE'> }
export interface MappingProposal extends ColumnMapping {
  confidence: Record<string, number>; // 0..1 por columna
  warnings: string[];
}
export interface RowRejection { row: number; reason: string }
export interface HerdImportResult {
  females: Female[];
  rowsOk: number;
  rowsRejected: RowRejection[];
  warnings: string[];
}
export interface HerdIngestionPort {
  proposeMapping(file: Uint8Array, filename: string): Promise<MappingProposal>;
  applyMapping(file: Uint8Array, mapping: ColumnMapping, farmId: string): Promise<HerdImportResult>;
}

export interface ClassificationSummary {
  byTier: Record<Tier, number>;
  byTag: Record<Tag, number>;
  total: number;                 // hembras con perfil
  withoutProfile: number;        // RN-24
  classicRulesBeefCount: number; // cuántas irían a BEEF con las reglas clásicas
}
```

De `mvp-a-core` (A1), vía el stub de T0 hasta I1:

```ts
export function deriveCategory(birthDate: string, today: string): FemaleCategory;
export function computeTraitStats(profiles: GenomicProfile[]): TraitStats;
```

De `mvp-0-foundation` / `llm-client`: `LlmClient.completeJson(prompt, MappingProposalSchema)`.

De `mvp-0-foundation` / `api-skeleton`: `HerdImportRepo`, `FemaleRepo`, `ClassificationRepo`, `FarmRepo`, `UserGuard`, `DomainError`.

### Produce

```ts
// packages/genetics-core — reemplaza el stub, misma firma
export function classifyHerd(females: Female[], farm: Farm, goal: BreedingGoal): Classification[]; // B2
/** Reglas del documento de mercado tal como estaban (analisis-idea-04 §3.1), solo para el "47% vs 30%". */
export function classifyHerdClassic(females: Female[]): Classification[];                          // B2

// packages/ai — adaptador real
export class HerdIngestion implements HerdIngestionPort { constructor(llm: LlmClient) }            // C2
```

| Método y ruta | Body | Respuesta | Errores propios |
|---|---|---|---|
| `POST /farms/:farmId/herd-imports` | multipart `file` (`.xlsx`/`.xls`) | `{ importId: string; proposal: MappingProposal }` | 400 `FILE_NOT_SPREADSHEET`, 422 `HEADER_ROW_NOT_FOUND` |
| `POST /farms/:farmId/herd-imports/:importId/confirm` | `ColumnMapping` | `HerdImportResult` | 404 `HERD_IMPORT_NOT_FOUND`, 422 `MAPPING_INCOMPLETE` (falta `visualId` o `birthDate`) |
| `POST /farms/:farmId/classifications` | `{ goal: BreedingGoal }` | `Classification[]` | 409 `HERD_EMPTY` (sin hembras con perfil) |
| `GET /farms/:farmId/classifications/summary` | — | `ClassificationSummary` | 409 `HERD_NOT_CLASSIFIED` |
| `GET /farms/:farmId/females` | — | `Array<Female & { classification: Classification \| null }>` | — |

Todas detrás de `UserGuard`: tambo ajeno → 403 `FARM_FORBIDDEN`.

### Rutas del frontend (del mapa de navegación de `frontend-shell`)

| Módulo (sidebar) | Tab | Ruta | Carpeta | Entradas |
|---|---|---|---|---|
| Motor genético | Carga del rodeo | `/motor-genetico/importar` | `features/herd-import/` | la tab; el botón "Subir Excel" de la barra del módulo; el estado vacío del Tablero |
| Motor genético | Tablero del rodeo | `/motor-genetico/tablero` | `features/herd/` | la tab; el redirect al confirmar una importación |

Salidas: clic en una hembra del Tablero → `/motor-genetico/matching/:femaleId` (D4, `mvp-d-match`).

## ADDED Requirements

### Requirement: REQ-C-01 Detección de la fila de encabezados
El sistema SHALL localizar en la primera hoja del archivo la fila de encabezados como la primera fila con al menos 6 celdas de texto no vacías cuyas filas siguientes contienen valores numéricos. Si no la encuentra, SHALL responder 422 `HEADER_ROW_NOT_FOUND` con un `message` que diga qué se esperaba.

#### Scenario: Excel real con título arriba
- **WHEN** se sube el Excel real del productor, que tiene filas de título antes de los encabezados `VISUALID`, `Fecha Nacimiento`, `Padre`, `CI`, `MILK`, `FAT`, `PRO`, `PL`, `SCS`, `FS`, `RFI`, `BETAC`, `KAPPAC`
- **THEN** `proposal.headerRow` apunta a esa fila y no a las de título

#### Scenario: Archivo sin tabla
- **WHEN** se sube un `.xlsx` con solo texto suelto
- **THEN** responde 422 `HEADER_ROW_NOT_FOUND`

### Requirement: REQ-C-02 La IA propone el mapeo y un humano confirma
`proposeMapping` SHALL enviar al LLM los encabezados detectados y una muestra de hasta 5 filas, y SHALL obtener una `MappingProposal` validada con `MappingProposalSchema` donde cada columna mapea a un `FemaleField` o a `'IGNORE'` con confianza 0..1. Ninguna hembra SHALL persistirse hasta que el usuario confirme un `ColumnMapping` (RN-19).

#### Scenario: Mapeo del Excel real
- **WHEN** se llama `proposeMapping` con el Excel real
- **THEN** la propuesta contiene `VISUALID→visualId`, `Fecha Nacimiento→birthDate`, `Padre→sireNaab`, `CI→ci`, `MILK→milk`, `FAT→fat`, `PRO→pro`, `PL→pl`, `SCS→scs`, `FS→fs`, `RFI→rfi`, `BETAC→betaCasein`, `KAPPAC→kappaCasein`, todas con `confidence ≥ 0.9`

#### Scenario: Encabezados en castellano
- **WHEN** se sube un Excel sintético con encabezados `Caravana`, `Nacimiento`, `Padre`, `Índice`, `Leche`, `Grasa`, `Proteína`, `Vida productiva`, `Células somáticas`, `Beta caseína`, `Kappa caseína`
- **THEN** cada uno mapea al `FemaleField` correcto y la columna sin equivalente (por ejemplo `Observaciones`) mapea a `'IGNORE'`

#### Scenario: Nada se guarda sin confirmar
- **WHEN** se llama `POST /herd-imports` y nunca `.../confirm`
- **THEN** `GET /farms/:farmId/females` no cambia

#### Scenario: El LLM devuelve un campo inexistente
- **WHEN** el LLM propone `CI→'index'`
- **THEN** la validación de `llm-client` reintenta y, si vuelve a fallar, la API responde 502 `LLM_SCHEMA_MISMATCH`; nunca se acepta un campo fuera de `FemaleField`

### Requirement: REQ-C-03 Aplicar el mapeo tolera el Excel real
`applyMapping` SHALL producir una `Female` por fila de datos y SHALL descartar, con motivo en `rowsRejected`, las filas vacías y las filas de notas (sin `visualId` o sin ningún valor numérico en los rasgos mapeados). Los `visualId` SHALL tratarse como texto. `category` SHALL calcularse con `deriveCategory` y todo `GenomicProfile` SHALL llevar `scale: 'CDCB'` y `source` con el nombre del archivo (RN-01).

#### Scenario: Resultado con el Excel real
- **WHEN** se confirma el mapeo propuesto sobre el Excel real
- **THEN** `rowsOk === 293`, el bloque de notas del productor al pie del archivo aparece en `rowsRejected` (o se ignora por estar debajo de la primera fila vacía después de los datos), y ninguna nota se convirtió en hembra

#### Scenario: Caravana alfanumérica
- **WHEN** una fila tiene `VISUALID` = `C136`
- **THEN** la hembra se crea con `visualId: 'C136'` y no se descarta ni se convierte a número

#### Scenario: Categoría por fecha
- **WHEN** una fila tiene `birthDate` hace 8 meses y otra hace 20 meses respecto de la fecha de importación
- **THEN** la primera es `CALF` y la segunda `HEIFER`

### Requirement: REQ-C-04 Faltantes: avisar, nunca rellenar
Una hembra sin `sireNaab` SHALL importarse igual con un aviso en `warnings` (RN-24). Un rasgo faltante o fuera de rango en una fila SHALL rechazar esa fila con el motivo, o importarla con `profile: null` si faltan todos los rasgos; en ningún caso SHALL completarse con un promedio ni con un valor por defecto. Un rasgo fuera del rango plausible SHALL rechazar la fila con el rasgo y el valor en el motivo.

#### Scenario: Dos animales sin padre
- **WHEN** se confirma el mapeo sobre el Excel real
- **THEN** `warnings` contiene exactamente 2 avisos de "sin padre registrado", cada uno con el `visualId`, y las 2 hembras tienen `sireNaab: null`

#### Scenario: SCS fuera de rango
- **WHEN** una fila tiene `SCS = 7.4`
- **THEN** la fila va a `rowsRejected` con motivo "SCS 7,4 fuera del rango 2–4" y no se crea la hembra

#### Scenario: Fila sin genotipado
- **WHEN** una fila tiene `visualId` y `birthDate` pero todas las columnas de rasgos vacías
- **THEN** la hembra se crea con `profile: null` y un aviso "sin genotipado, queda fuera del motor"

### Requirement: REQ-C-05 Importar reemplaza el rodeo del tambo e invalida la clasificación
Confirmar una importación SHALL hacer upsert por `(farmId, visualId)` de las hembras del resultado y SHALL invalidar la clasificación previa del tambo, de modo que el tablero pida clasificar de nuevo.

#### Scenario: Reimportar el mismo Excel
- **WHEN** se confirma dos veces la importación del Excel real en `farm-a`
- **THEN** `farm-a` sigue teniendo 293 hembras, no 586

#### Scenario: Clasificación vieja
- **WHEN** `farm-a` estaba clasificada y se confirma una importación nueva
- **THEN** `GET /farms/farm-a/classifications/summary` responde 409 `HERD_NOT_CLASSIFIED` hasta que se vuelva a clasificar

### Requirement: REQ-C-06 Clasificación por cupos con percentil del propio rodeo
`classifyHerd` SHALL excluir las hembras sin `profile` (RN-24), SHALL calcular `ciPercentile` de cada hembra dentro del conjunto con perfil del tambo (RN-07), y SHALL asignar por cupo: el top `farm.tierQuotas.sexedPct`% a `ELITE`, el bottom `beefPct`% a `BEEF` y el resto a `COMMERCIAL` (RN-08). Los cupos SHALL no superponerse ni dejar huecos.

#### Scenario: Cupos sobre el rodeo real
- **GIVEN** `herd-farm-a`, cupos 25/30 y objetivo `BALANCED`
- **WHEN** se clasifica
- **THEN** `BEEF` está entre el 28% y el 31% del total genotipado y nunca supera `beefPct`% + 1 animal; `ELITE` está entre el 22% y el 25%; toda hembra con perfil tiene exactamente un tier

#### Scenario: Otro tambo, otros percentiles
- **WHEN** se clasifica `herd-farm-b` (sintético, distribución distinta)
- **THEN** los cortes de CI que separan los tiers son los percentiles de `farm-b`, no los de `farm-a`

### Requirement: REQ-C-07 Alertas de salud con zona gris que nunca mandan a carne
Después del cupo, `classifyHerd` SHALL aplicar RN-09 según ADR-0001: con `SCS > farm.scsGrayZone.to` o `PL < farm.plGrayZone.from`, la hembra recibe la etiqueta (`MASTITIS_RISK` / `SHORT_LIFE`), el rasgo entra en `corrective`, y si era `ELITE` baja a `COMMERCIAL`; **nunca baja a `BEEF`**. Con SCS dentro de `scsGrayZone` o PL dentro de `plGrayZone` (inclusivo), el rasgo entra en `corrective` y el tier **no cambia**. Los umbrales SHALL leerse del `Farm`.

#### Scenario: La ternera 3031
- **WHEN** se clasifica `herd-farm-a` con cupos 25/30 y `BALANCED`
- **THEN** la hembra `3031` (SCS 3,19) queda `COMMERCIAL`, con `MASTITIS_RISK` en `tags`, `corrective` que contiene `'scs'` y una línea en `reasons` que menciona el SCS 3,19

#### Scenario: Élite en zona gris
- **WHEN** una hembra con CI en el top 25% tiene SCS entre 3,10 y 3,18
- **THEN** sigue `ELITE`, `corrective` contiene `'scs'` y no tiene `MASTITIS_RISK`

#### Scenario: Comercial con riesgo
- **WHEN** una hembra `COMMERCIAL` por cupo tiene PL −0,4
- **THEN** sigue `COMMERCIAL` (no baja a `BEEF`), tiene `SHORT_LIFE` y `corrective` contiene `'pl'`

#### Scenario: Varios rasgos correctivos acumulados
- **WHEN** una hembra tiene SCS 3,25 y PL −0,3
- **THEN** `corrective` contiene `'scs'` y `'pl'` (sin duplicados), tiene las dos etiquetas, y baja como máximo un tier

#### Scenario: Umbral configurado por el tambo
- **WHEN** `farm.scsGrayZone` es `{ from: 3.00, to: 3.10 }`
- **THEN** una hembra con SCS 3,15 recibe `MASTITIS_RISK`, no zona gris

### Requirement: REQ-C-08 Protección por objetivo
Si `goal.wantBetaA2` y la hembra es `A2/A2`, o `goal.wantKappaBB` y es `BB`, y el cupo la mandaba a `BEEF`, `classifyHerd` SHALL dejarla en `COMMERCIAL` con la etiqueta `GOAL_PROTECTED` (RN-10).

#### Scenario: Objetivo leche A2
- **WHEN** se clasifica `herd-farm-a` con preset `A2_MILK`
- **THEN** ninguna hembra `A2/A2` queda en `BEEF`, y las rescatadas tienen `GOAL_PROTECTED` con una línea en `reasons`

#### Scenario: Sin objetivo de caseína
- **WHEN** se clasifica con `BALANCED`
- **THEN** ninguna hembra tiene `GOAL_PROTECTED`

### Requirement: REQ-C-09 Alerta de descarte y etiquetas informativas
`classifyHerd` SHALL marcar `CULL_ALERT` (con `semenType: null`) solo cuando se cumplen simultáneamente CI en el 5% inferior, PL < −0,5, SCS > 3,20 y RFI > 50 (RN-11). SHALL agregar `A2_NUCLEUS` a las `A2/A2`, `CHEESE_BB` a las `BB` y `NO_SIRE` a las que no tienen padre. La precedencia SHALL ser cupo → salud → protección por objetivo → alerta de descarte, y cada paso que cambia el resultado SHALL dejar una línea en `reasons` (RN-12).

#### Scenario: Exactamente dos alertas
- **WHEN** se clasifica `herd-farm-a` con `BALANCED`
- **THEN** hay exactamente 2 hembras en `CULL_ALERT`, las dos con `semenType: null`

#### Scenario: Etiquetas del rodeo real
- **WHEN** se clasifica `herd-farm-a`
- **THEN** alrededor de 146 hembras (el 50% del rodeo) tienen `A2_NUCLEUS`, 51 tienen `A2_NUCLEUS` y `CHEESE_BB` a la vez, y exactamente 2 tienen `NO_SIRE`

#### Scenario: Siempre hay motivo
- **WHEN** se clasifica cualquier rodeo
- **THEN** cada `Classification` tiene al menos una línea en `reasons`, en español y sin ningún texto generado por la IA

### Requirement: REQ-C-10 Reglas clásicas para la comparación del pitch
`classifyHerdClassic` SHALL reproducir las reglas del documento de mercado tal como las simula `analisis-idea-04-matching-reproductivo.md` §3.1: precedencia "cualquier condición de carne → carne; todas las de sexado → sexado; si no, convencional", con umbrales absolutos (no percentiles) y sin protección por objetivo ni zona gris. Su único uso SHALL ser calcular `ClassificationSummary.classicRulesBeefCount`; SHALL no persistirse ni alimentar el matching.

#### Scenario: El 47%
- **WHEN** se corre `classifyHerdClassic` sobre `herd-farm-a`
- **THEN** ≈ 47% de las 293 hembras van a `BEEF` (138–139 según la reconstrucción de las reglas clásicas, ver Q1) y ~37 a `ELITE`, como en §3.1b del análisis

#### Scenario: No contamina
- **WHEN** se clasifica el tambo con `classifyHerd`
- **THEN** ninguna `Classification` persistida proviene de `classifyHerdClassic`

### Requirement: REQ-C-11 Endpoint de clasificación
`POST /farms/:farmId/classifications` SHALL cargar las hembras del tambo, clasificar con `classifyHerd` y el `goal` del body, reemplazar la clasificación previa del tambo guardando el objetivo que la produjo, y devolver `Classification[]`. Sin hembras con perfil SHALL responder 409 `HERD_EMPTY`.

#### Scenario: Clasificar farm-a
- **WHEN** `tambero-a` hace `POST /api/farms/farm-a/classifications` con `{ goal: GOAL_PRESETS.BALANCED }`
- **THEN** responde 200 con 293 menos las hembras sin perfil clasificaciones, y una segunda llamada con otro objetivo reemplaza a la primera

#### Scenario: Tambo vacío
- **WHEN** se clasifica un tambo sin hembras importadas
- **THEN** responde 409 `HERD_EMPTY` con un `message` que dice que hay que cargar el rodeo primero

### Requirement: REQ-C-12 Resumen y listado de hembras
`GET /farms/:farmId/classifications/summary` SHALL devolver `byTier`, `byTag`, `total` (hembras con perfil), `withoutProfile` y `classicRulesBeefCount`; sin clasificación SHALL responder 409 `HERD_NOT_CLASSIFIED`. `GET /farms/:farmId/females` SHALL devolver todas las hembras del tambo con su `classification` o `null`.

#### Scenario: El resumen suma
- **WHEN** se clasificó `farm-a` y se pide el resumen
- **THEN** la suma de `byTier` es igual a `total`, `total + withoutProfile === 293` y `classicRulesBeefCount` está en 138–139 (≈ 47%, ver Q1)

#### Scenario: Hembras con y sin clasificación
- **WHEN** `farm-a` tiene una hembra con `profile: null` y se pide `GET /females`
- **THEN** esa hembra aparece con `classification: null` y las demás con su clasificación

### Requirement: REQ-C-13 Tab "Carga del rodeo" del módulo Motor genético
La tab **Carga del rodeo** (`/motor-genetico/importar`) SHALL resolver los tres pasos en una sola pantalla: una zona para soltar el archivo, la tabla de mapeo con la columna del Excel, un selector del campo destino editable y la confianza en color, y tras confirmar el resultado con `rowsOk`, `rowsRejected` con su motivo y `warnings`. Una confianza menor a 0,8 SHALL verse en amarillo y SHALL exigir que el usuario la revise (toque el selector o la marque como revisada) antes de habilitar "Confirmar" (RN-19). Al confirmar con éxito SHALL navegar a `/motor-genetico/tablero`. La tab SHALL ser alcanzable desde la barra de tabs del módulo, desde el botón "Subir Excel" de la barra del módulo y desde el estado vacío del Tablero. La pantalla SHALL tener los cuatro estados obligatorios.

#### Scenario: Recorrido con el Excel real
- **WHEN** se suelta el Excel real, se confirma el mapeo propuesto y se espera el resultado
- **THEN** se ven 293 filas ok, el bloque de notas como rechazado y 2 avisos de "sin padre" en un `Alert`, y al cerrar el resultado la app navega a `/motor-genetico/tablero` con el sidebar en "Motor genético"

#### Scenario: Entrar por "Subir Excel"
- **WHEN** el usuario está en `/motor-genetico/matching` y toca "Subir Excel" en la barra del módulo
- **THEN** navega a `/motor-genetico/importar` con la tab "Carga del rodeo" activa

#### Scenario: Columna dudosa
- **WHEN** la propuesta trae una columna con confianza 0,6
- **THEN** su fila se muestra con `Badge variant="warn"` y el botón "Confirmar" está deshabilitado hasta que el usuario la revisa

#### Scenario: Error del backend
- **WHEN** la API responde 422 `HEADER_ROW_NOT_FOUND`
- **THEN** la pantalla muestra el `message` del backend en `ErrorMessage`

### Requirement: REQ-C-14 Tab "Tablero del rodeo" del módulo Motor genético
La tab **Tablero del rodeo** (`/motor-genetico/tablero`) SHALL mostrar, debajo de la barra de tabs del módulo (tab activa oscura, las demás `ghost`, con los tokens del mockup), cuatro tarjetas (una por tier) con conteo y porcentaje, un selector de objetivo y un botón "Clasificar", chips de filtro por tier y por etiqueta, y una tabla de hembras con los motivos desplegables por fila. Hacer clic en una hembra SHALL navegar a `/motor-genetico/matching/:femaleId`. Sin clasificación SHALL mostrar un estado vacío que invita a clasificar; sin hembras, un `EmptyState` "Todavía no cargaste el rodeo · Subir Excel" cuya acción navega a `/motor-genetico/importar`.

#### Scenario: Tablero de farm-a
- **WHEN** `tambero-a` abre `/motor-genetico/tablero` con el rodeo clasificado con `BALANCED`
- **THEN** el sidebar marca "Motor genético", la tab "Tablero del rodeo" está activa, y ve `ELITE`, `COMMERCIAL`, `BEEF` y `CULL_ALERT` con sus conteos, `BEEF` en torno al 30% y 2 en alerta

#### Scenario: Tambo sin rodeo
- **WHEN** `tambero-b` abre `/motor-genetico/tablero` sin hembras importadas
- **THEN** ve el `EmptyState` "Todavía no cargaste el rodeo · Subir Excel" y al tocarlo navega a `/motor-genetico/importar`

#### Scenario: Cambiar el objetivo
- **WHEN** elige `A2_MILK` y toca "Clasificar"
- **THEN** la tabla se recalcula y ninguna hembra con `A2_NUCLEUS` figura en `BEEF`

#### Scenario: Filtrar y ver motivos
- **WHEN** activa el chip `MASTITIS_RISK` y despliega la fila de `3031`
- **THEN** ve solo las hembras con esa etiqueta y, en la fila desplegada, las líneas de `reasons` de `3031`

#### Scenario: Ir al matching
- **WHEN** hace clic en la fila de `3031`
- **THEN** navega a `/motor-genetico/matching/<id de 3031>`, en la tab "Matching genético" del mismo módulo

### Requirement: REQ-C-15 La comparación clásico vs. Torinder es visible sin explicación
El tablero SHALL mostrar, con la clasificación cargada, un aviso destacado con el texto "Con las reglas clásicas, N (P%) iban a carne" usando `classicRulesBeefCount` del resumen, al lado del porcentaje real de `BEEF`.

#### Scenario: El número del pitch
- **WHEN** se abre `/motor-genetico/tablero` con `farm-a` clasificada
- **THEN** se lee "Con las reglas clásicas, N (47%) iban a carne" con N = `classicRulesBeefCount` (138–139, ver Q1), junto a la tarjeta `BEEF` que muestra ~30%

## Reglas que respeta

- **RN-01** escala única: todo perfil importado lleva `scale: 'CDCB'` (REQ-C-03).
- **RN-07** percentiles del propio rodeo, **RN-08** cupos (REQ-C-06), **RN-09** con **ADR-0001** zona gris y "nunca a carne" (REQ-C-07), **RN-10** protección por objetivo (REQ-C-08), **RN-11** alerta de descarte y **RN-12** precedencia con `reasons` (REQ-C-09).
- **RN-19** carga asistida con confirmación humana (REQ-C-02, REQ-C-13). **RN-20** lo interpretado se ve y se ajusta.
- **RN-24** sin genotipado fuera del motor con aviso; sin padre, `NO_SIRE` (REQ-C-04, REQ-C-09).
- **RN-17 / RN-18**: el LLM solo propone el mapeo de columnas y su salida se valida contra `MappingProposalSchema`; nunca produce un valor genético ni un tier.
- **Regla de datos del handoff (§5)**: un faltante nunca se rellena con un promedio (REQ-C-04).
- **RN-38** aislamiento: todas las rutas detrás de `UserGuard`.
- `pantallas.md` §3.2, §3.3 y §4 (motivos visibles, mensaje real del backend, los cuatro estados) para el **contenido** de las dos pantallas.
- **Navegación:** el mapa de `mvp-0-foundation/specs/frontend-shell` (REQ-FS-01: las pantallas son tabs del módulo, nunca ítems del sidebar) y `designs/01-sidebar-scaffolding.html` / `AgroMatch Motor Genetico.dc.html` (PR #11) para la barra de tabs y los tokens.

## Criterios de aceptación

**Tests (Vitest, `packages/genetics-core/test/classification.test.ts`, con `herd-farm-a`, cupos 25/30):**
- [ ] `BALANCED`: `BEEF` entre 28% y 31%, nunca > 30% + 1 animal (REQ-C-06).
- [ ] `3031` → `COMMERCIAL`, `MASTITIS_RISK`, `corrective` incluye `'scs'` (REQ-C-07).
- [ ] Una `ELITE` con SCS en 3,10–3,18 sigue `ELITE` con `corrective: ['scs']` (REQ-C-07).
- [ ] SCS 3,25 y PL −0,3 → dos etiquetas, dos correctivos, baja un solo tier (REQ-C-07).
- [ ] `A2_MILK`: ninguna `A2/A2` en `BEEF` (REQ-C-08).
- [ ] Exactamente 2 `CULL_ALERT` (REQ-C-09).
- [ ] Toda clasificación con ≥ 1 `reasons` (REQ-C-09).
- [ ] `classifyHerdClassic(herd-farm-a)` → ≈ 47% a `BEEF` (138–139), ~37 a `ELITE` (REQ-C-10).
- [ ] Cambiar `farm.scsGrayZone` mueve el corte (REQ-C-07).

**Tests (Vitest, `packages/ai`, con un `.xlsx` sintético generado en el test y el LLM en `fake`):**
- [ ] Encabezado detectado debajo de filas de título; filas vacías y de notas rechazadas; `C136` como texto; SCS 7,4 rechazado; fila sin rasgos → `profile: null` (REQ-C-01, REQ-C-03, REQ-C-04).

**Verificación manual (convenciones §1), descrita en el PR con captura:**
- [ ] Con el Excel real y `AI_MODE=live`: propuesta con las 13 columnas y confianza ≥ 0,9; resultado `rowsOk = 293`, notas rechazadas, 2 avisos de "sin padre" (REQ-C-02, REQ-C-03, REQ-C-04).
- [ ] Excel sintético con encabezados en castellano mapea bien (REQ-C-02).
- [ ] `curl -H 'x-user-id: tambero-a' -X POST :3333/api/farms/farm-a/classifications` y luego el resumen: `total + withoutProfile = 293`, `classicRulesBeefCount` ≈ 47% (138–139) (REQ-C-11, REQ-C-12).
- [ ] `/motor-genetico/importar` y `/motor-genetico/tablero` con MSW y luego contra la API real en I1: sidebar en "Motor genético", barra de tabs, tarjetas, aviso del 47%, filtros, fila desplegable, clic lleva a `/motor-genetico/matching/:femaleId` (REQ-C-13 a REQ-C-15).
- [ ] Confirmar una importación redirige al Tablero; "Subir Excel" desde la barra del módulo y el `EmptyState` del Tablero sin rodeo llevan a la Carga (REQ-C-13, REQ-C-14).
- [ ] Reimportar no duplica y obliga a reclasificar (REQ-C-05).

## Riesgos y supuestos

- **El Excel real no está en el repo.** Los criterios con "el Excel real" se verifican a mano con el archivo que tiene el equipo; los tests automáticos usan `herd-farm-a.json` (ya convertido) y un `.xlsx` sintético. Si el archivo no está a mano en la hackathon, se reconstruye uno desde el fixture con SheetJS para la demo.
- **El archivo mezcla notas con datos y tiene filas vacías** (`analisis-idea-04` §3.1b). La detección de encabezado y el corte de datos tienen que tolerarlo (REQ-C-01, REQ-C-03).
- **`visualId` es texto** (`C136`): cualquier `parseInt` rompe el rodeo. Se persiste y se compara como string.
- **Un toro tiene 41 hijas (14%)** y **el 50% es A2/A2**: los tests de etiquetas (REQ-C-09) dependen de esos números; si A6 o una reconversión del fixture los cambia, se actualizan los tests, no las reglas.
- **Riesgo (ADR-0001):** con la zona gris entran más hembras con `corrective`; el matching (`mvp-a-core` A4) tiene que verificar que varios correctivos acumulados no dominen el ranking. Acá solo se garantiza que no haya duplicados y que el tier baje como máximo uno.
- **Supuesto:** la clasificación se guarda por tambo con el objetivo que la produjo; el swipe recibe un `goal` propio pero usa la clasificación persistida (lo define `mvp-d-match`).
- **Riesgo:** la propuesta de mapeo del LLM con `AI_MODE=live` depende de la conexión del evento; el fallback es corregir el mapeo a mano en la tabla, que ya es editable.
- **Supuesto:** el Tablero y la Carga no tienen mockup propio en PR #11 (la tab figura "pendiente"); su layout sigue `pantallas.md §3.2`/`§3.3` con los tokens y la barra de tabs del módulo. Si diseño entrega un mockup antes de I1, se ajusta el layout sin tocar rutas ni endpoints.
- **Riesgo:** el botón "Subir Excel" de la barra del módulo lo renderizan dos tabs de dos devs (C y D). Mitigación: es un componente chico en `features/herd-import/` que D importa; no se duplica.

## Preguntas abiertas

| # | Pregunta | Default tomado acá | Quién cierra |
|---|---|---|---|
| Q1 | La fórmula exacta de las "reglas clásicas" del documento de mercado no está íntegra en el repo; `analisis-idea-04` §3.1 solo la simula (sexado si CI > 480 **y** PRO > 0 **y** FAT > 0 **y** SCS < 3,00; carne si CI < 355 **o** SCS > 3,15 **o** sólidos negativos; el resto convencional; la regla de RFI > +40 de la tabla queda afuera porque llevaría el 47% al 65%) | Esa reconstrucción, calibrada a ≈ 47% sobre `herd-farm-a`. **El conteo exacto no está cerrado:** `analisis-idea-04` §3.1b dice 139, `pantallas.md` §3.3 dice 138. El aviso del tablero muestra el número que devuelva `classifyHerdClassic`, no uno hardcodeado | Dev C con el analista, antes de I1 |
| Q2 | Rangos plausibles por rasgo: el plan solo fija SCS entre 2 y 4 | `ci` −500..1500, `milk` −3000..3000, `fat` −150..200, `pro` −100..150, `pl` −10..10, `scs` 2..4, `fs` −500..600, `rfi` −300..300 | Dev C con el analista |
| Q3 | ¿Una importación nueva invalida la clasificación o se reclasifica sola con el último objetivo? | Invalida (409 hasta reclasificar): más simple y explícito | Dev C |
| Q4 | ¿`deriveCategory` usa la fecha de importación o "hoy"? Los animales del fixture nacieron 2023–2025 y la demo es en 2026 | La fecha del momento de importar; los tests fijan `today` | Dev A (A1) y Dev C |
| Q5 | Si el usuario mapea dos columnas al mismo `FemaleField` | 422 `MAPPING_INCOMPLETE` con el detalle | Dev C |
| Q6 | Muestra de filas que se envía al LLM: ¿incluye datos del productor? Es un rodeo anonimizado, pero conviene mandar solo encabezados + 5 filas | Encabezados + 5 filas, sin `visualId` | Dev C |
| Q7 | El Tablero del rodeo y la Carga no tienen mockup propio en PR #11 (la tab está "pendiente") | D3 y D2 siguen `pantallas.md §3.3`/`§3.2` con los tokens y la barra de tabs del módulo Motor genético, hasta que diseño entregue uno | Diseño (Tobías) antes de I1; Dev C ajusta |
| Q8 | ¿La Carga del rodeo es una tab visible en la barra del módulo o solo se llega por "Subir Excel"? El mockup no la muestra como tab | Tab visible (`frontend-shell` Q4), además del botón y del estado vacío | Dev D en D1 |
