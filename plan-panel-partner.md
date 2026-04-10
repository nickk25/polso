# Plan: Panel de Asesoría (apps/partner/)

## Contexto

Polso ya tiene un monorepo Turborepo con `apps/web` (dashboard freelancer) y `packages/banking` (Tink client). El siguiente paso es crear `apps/partner/` — un panel separado para asesorías que gestionan múltiples clientes autónomos/pymes.

- **Auth**: Neon Auth (basado en Better Auth) — compartido entre ambas apps via `packages/auth/`
- **Relación asesoría→clientes**: No existe aún en el schema, hay que crearla
- **Export**: Genérico CSV/XLSX para empezar, formatos específicos (A3, Sage) después
- **Dominio**: `partner.polso.app` → deploy separado en Vercel
- **Referencia principal**: Midday.ai (https://github.com/midday-ai/midday) — modelar export, matching, e inbox

---

## Fase 1: Schema — Modelo Asesoría↔Cliente

### 1.1 Nuevo modelo `PartnerClient`

Relación many-to-many entre organizaciones. Dos tipos: `"partner"` (la asesoría que gestiona) y `"client"` (el autónomo/pyme gestionado). Genérico y escalable — si mañana un despacho de abogados usa Polso, sigue siendo `partner`.

```prisma
// En schema.prisma — agregar campo type a Organization
model Organization {
  // ... campos existentes
  type          String    @default("client") // "partner" | "client"
  
  // Relaciones partner↔client
  partnerLinks  PartnerClient[] @relation("AsClient")
  clientLinks   PartnerClient[] @relation("AsPartner")
}

model PartnerClient {
  id            String       @id @default(cuid())
  partnerId     String       @map("partner_id")
  clientId      String       @map("client_id")
  status        String       @default("pending") // "pending" | "active" | "disconnected"
  invitedAt     DateTime     @default(now()) @map("invited_at")
  connectedAt   DateTime?    @map("connected_at")
  
  partner       Organization @relation("AsPartner", fields: [partnerId], references: [id], onDelete: Cascade)
  client        Organization @relation("AsClient", fields: [clientId], references: [id], onDelete: Cascade)
  
  @@unique([partnerId, clientId])
  @@map("partner_clients")
}
```

### 1.2 Permisos de acceso

La asesoría puede leer (nunca escribir) los datos de sus clientes activos:
- Cuentas bancarias (BankAccount)
- Transacciones (Transaction)
- Recibos (Receipt) — modelo nuevo, ver Fase 3
- Gastos e ingresos (Expense, Income)
- Estado de conciliación (Conciliation) — modelo nuevo, ver Fase 3

RLS policy: `SELECT` permitido cuando `organization_id IN (SELECT client_id FROM partner_clients WHERE partner_id = current_org AND status = 'active')`.

> **Nomenclatura**: `partner` = quien gestiona (asesoría, despacho, gestoría). `client` = quien es gestionado (autónomo, pyme). Genérico y escalable.

**Commit**: `feat: add PartnerClient model with partner/client organization types`

---

## Fase 2: Package compartido — `packages/auth/`

### 2.1 Extraer auth a package compartido

Para que `apps/partner/` comparta auth con `apps/web/`:

```
packages/auth/
├── package.json          # @polso/auth
├── tsconfig.json
└── src/
    ├── index.ts          # re-exports
    ├── server.ts         # Better Auth server instance
    ├── client.ts         # Better Auth client hooks
    ├── middleware.ts      # Auth middleware factory
    └── types.ts          # Session, User, Organization types
```

- Mover la configuración de auth de `apps/web/lib/auth/` a `packages/auth/src/`
- Ambas apps importan `@polso/auth`
- El middleware de `apps/partner/` verifica `session.organization.type === "partner"`

### 2.2 Middleware de apps/partner/

```typescript
// apps/partner/middleware.ts
import { authMiddleware } from "@polso/auth/middleware";

export default authMiddleware({
  requiredOrgType: "partner",
  redirectTo: "/login", // si no autenticado
  forbiddenRedirect: "/", // si autenticado pero no es partner
});
```

**Commit**: `feat: extract @polso/auth package for shared authentication`

---

## Fase 3: Modelos nuevos — Inbox + MatchSuggestion (modelando Midday)

Estos modelos son necesarios para el panel partner y también para el agente WhatsApp (siguiente fase). Modelamos la arquitectura de Midday adaptada al contexto español.

> **Referencia Midday**: Ver schema completo en `packages/db/src/schema.ts` — tablas `inbox`, `transactionAttachments`, `transactionMatchSuggestions`

### 3.1 Inbox (equivalente a Receipt, pero modelando Midday)

Midday usa un modelo `inbox` que recibe documentos de cualquier fuente y los procesa. Polso hace lo mismo pero con foco en recibos/facturas españoles.

```prisma
model InboxItem {
  id               String        @id @default(cuid())
  organizationId   String        @map("organization_id")
  
  // Archivo
  fileName         String        @map("file_name")
  filePath         String        @map("file_path")     // path en storage
  contentType      String?       @map("content_type")   // "application/pdf", "image/jpeg"
  size             Int?
  
  // Metadata extraída por OCR (Claude Haiku)
  displayName      String?       @map("display_name")   // nombre del proveedor
  amount           Decimal?      @db.Decimal(12, 2)
  currency         String        @default("EUR")
  date             DateTime?                             // fecha de la factura
  cif              String?                               // CIF del proveedor (España)
  
  // Estado del procesamiento
  status           String        @default("new")         // "new" | "processing" | "analyzing" | "suggested_match" | "no_match" | "done" | "archived"
  source           String        @default("upload")      // "upload" | "whatsapp" | "email"
  
  // OCR raw data
  meta             Json?                                 // resultado completo del OCR
  
  // Match con transacción
  transactionId    String?       @map("transaction_id")  // cuando se confirma el match
  
  // Full-text search
  fts              Unsupported("tsvector")?
  
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")
  
  organization     Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  transaction      Transaction?  @relation(fields: [transactionId], references: [id])
  matchSuggestions MatchSuggestion[]
  
  @@map("inbox")
}
```

> **Referencia Midday inbox**: `packages/db/src/schema.ts` → buscar `inbox` table. Campos clave: `status`, `displayName`, `amount`, `date`, `currency`, `meta`, `transactionId`, `filePath`, `source`

### 3.2 MatchSuggestion (modelando transactionMatchSuggestions de Midday)

```prisma
model MatchSuggestion {
  id               String       @id @default(cuid())
  organizationId   String       @map("organization_id")
  transactionId    String       @map("transaction_id")
  inboxItemId      String       @map("inbox_item_id")
  
  // Scores (modelando Midday exactamente)
  confidenceScore  Float        @map("confidence_score")  // score total 0-1
  amountScore      Float        @map("amount_score")      // 30% weight
  dateScore        Float        @map("date_score")        // 15% weight
  nameScore        Float        @map("name_score")        // 10% weight
  currencyScore    Float        @map("currency_score")    // 5% weight
  
  // Tipo de match
  matchType        String       @map("match_type")        // "auto_matched" | "high_confidence" | "suggested"
  matchDetails     Json?        @map("match_details")     // detalles del scoring
  
  // Estado de la sugerencia
  status           String       @default("pending")       // "pending" | "confirmed" | "declined" | "expired" | "unmatched"
  userActionAt     DateTime?    @map("user_action_at")
  userActionBy     String?      @map("user_action_by")
  
  createdAt        DateTime     @default(now()) @map("created_at")
  
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  transaction      Transaction  @relation(fields: [transactionId], references: [id])
  inboxItem        InboxItem    @relation(fields: [inboxItemId], references: [id])
  
  @@unique([transactionId, inboxItemId])
  @@map("match_suggestions")
}
```

> **Referencia Midday matching**: `packages/db/src/schema.ts` → buscar `transactionMatchSuggestions`. Campos clave: `confidenceScore`, `amountScore`, `dateScore`, `nameScore`, `currencyScore`, `matchType`, `status`

### 3.3 TransactionAttachment (link confirmado entre transacción y documento)

```prisma
model TransactionAttachment {
  id               String       @id @default(cuid())
  transactionId    String       @map("transaction_id")
  inboxItemId      String       @map("inbox_item_id")
  createdAt        DateTime     @default(now()) @map("created_at")
  
  transaction      Transaction  @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  inboxItem        InboxItem    @relation(fields: [inboxItemId], references: [id])
  
  @@unique([transactionId, inboxItemId])
  @@map("transaction_attachments")
}
```

> **Referencia Midday attachments**: `packages/db/src/schema.ts` → buscar `transactionAttachments`

**Commit**: `feat: add InboxItem, MatchSuggestion, and TransactionAttachment models`

---

## Fase 3b: Matching Algorithm — `packages/matching/`

Package separado con el algoritmo de scoring, adaptado de Midday al contexto español.

> **REFERENCIA CLAVE**: `packages/db/src/utils/transaction-matching.ts` — Este es el archivo más importante. Contiene todo el algoritmo de scoring de Midday. Leer COMPLETO antes de implementar.

```
packages/matching/
├── package.json          # @polso/matching
├── tsconfig.json
└── src/
    ├── index.ts          # re-exports
    ├── matcher.ts        # algoritmo principal de scoring
    ├── scores/
    │   ├── amount.ts     # score por importe (30% weight)
    │   ├── date.ts       # score por fecha (15% weight)
    │   ├── name.ts       # score por nombre proveedor (10% weight)
    │   └── currency.ts   # score por moneda (5% weight)
    ├── normalizers.ts    # normalización de nombres españoles
    └── types.ts          # MatchCandidate, MatchResult, ScoringWeights
```

### Adaptaciones al contexto español vs Midday:

**Amount score** (ref: `transaction-matching.ts` → función de amount scoring):
- Midday detecta IVA genérico (5%, 6%, 7%, 8%, 10%, 12%, 19%, 20%, 21%, 22%, 25%)
- Polso prioriza tasas españolas: **21%** (general), **10%** (reducido), **4%** (superreducido)
- Tolerancia: importes <100€ → 4%, 100-1000€ → 2%, >1000€ → 1.5% (igual que Midday)

**Name score** (ref: `transaction-matching.ts` → función de name scoring):
- Midday normaliza sufijos anglosajones: Inc, LLC, Ltd, Corp
- Polso normaliza sufijos españoles: **S.L.**, **S.A.**, **S.L.U.**, **S.C.**, **Autónomo**
- Jaccard token overlap + substring containment (igual que Midday)
- Agregar: matching por **CIF** cuando ambos lo tienen → score 1.0 directo

**Date score** (ref: `transaction-matching.ts` → función de date scoring):
- Igual que Midday: same day 1.0, ≤1 day 0.95, ≤7 days 0.75, ≤30 days escala down
- Para facturas con payment terms: ventana hasta 90 días

**Currency score**:
- Simplificado: casi todo es EUR en España. Exact match 1.0, diferente 0.3

### Calibración (ref: `transaction-matching.ts` → calibration logic):
- Min 5 samples para auto-match calibration
- Min 3 samples para suggested-match calibration  
- Max 3% threshold adjustment per calibration
- Igual que Midday

**Commit**: `feat: add @polso/matching package with Spanish-adapted scoring`

---

## Fase 4: Scaffold apps/partner/

### 4.1 Estructura de la app

```
apps/partner/
├── package.json              # @polso/partner
├── tsconfig.json
├── next.config.ts
├── middleware.ts              # Auth + org type check
├── tailwind.config.ts
├── postcss.config.mjs
├── app/
│   ├── layout.tsx            # Root layout con providers
│   ├── (auth)/
│   │   ├── login/page.tsx    # Login asesoría
│   │   └── register/page.tsx # Registro asesoría
│   ├── (dashboard)/
│   │   ├── layout.tsx        # Dashboard layout: sidebar + header
│   │   ├── page.tsx          # Overview: resumen de todos los clientes
│   │   ├── clients/
│   │   │   ├── page.tsx      # Lista de clientes + estado semáforo
│   │   │   └── [clientId]/
│   │   │       ├── page.tsx          # Detalle del cliente: resumen
│   │   │       ├── transactions/
│   │   │       │   └── page.tsx      # Transacciones del cliente
│   │   │       ├── receipts/
│   │   │       │   └── page.tsx      # Recibos del cliente
│   │   │       ├── conciliation/
│   │   │       │   └── page.tsx      # Vista de conciliación
│   │   │       └── export/
│   │   │           └── page.tsx      # Exportar datos del cliente
│   │   ├── invite/
│   │   │   └── page.tsx      # Invitar nuevo cliente
│   │   └── settings/
│   │       └── page.tsx      # Config de la asesoría
│   └── api/
│       └── auth/
│           └── [...path]/route.ts  # Better Auth handler
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── nav-items.ts
│   ├── clients/
│   │   ├── client-list.tsx
│   │   ├── client-card.tsx
│   │   ├── client-status-badge.tsx   # Semáforo verde/amarillo/rojo
│   │   └── invite-client-form.tsx
│   ├── transactions/
│   │   ├── transaction-table.tsx
│   │   └── transaction-row.tsx
│   ├── inbox/
│   │   ├── inbox-list.tsx
│   │   ├── inbox-card.tsx
│   │   └── inbox-status-badge.tsx
│   ├── matching/
│   │   ├── matching-view.tsx
│   │   ├── suggestion-card.tsx
│   │   ├── score-breakdown.tsx
│   │   └── status-indicator.tsx
│   └── export/
│       ├── export-form.tsx
│       └── export-progress.tsx
├── features/
│   ├── clients/
│   │   ├── actions/
│   │   │   ├── get-clients.ts
│   │   │   ├── invite-client.ts
│   │   │   └── disconnect-client.ts
│   │   └── queries/
│   │       ├── get-client-list.ts
│   │       └── get-client-detail.ts
│   ├── transactions/
│   │   └── queries/
│   │       └── get-client-transactions.ts
│   ├── inbox/
│   │   └── queries/
│   │       └── get-client-inbox.ts
│   ├── matching/
│   │   ├── actions/
│   │   │   ├── run-matching.ts            # trigger matching algorithm
│   │   │   ├── confirm-suggestion.ts      # user confirms match
│   │   │   └── decline-suggestion.ts      # user declines match
│   │   └── queries/
│   │       └── get-match-suggestions.ts
│   └── export/
│       ├── actions/
│       │   └── export-client-data.ts
│       ├── lib/
│       │   ├── csv-generator.ts
│       │   └── xlsx-generator.ts
│       └── queries/
│           └── get-exportable-data.ts
└── lib/
    ├── auth.ts               # import from @polso/auth
    └── db.ts                 # Prisma client (shared)
```

### 4.2 Package dependencies

```json
{
  "name": "@polso/partner",
  "dependencies": {
    "@polso/auth": "workspace:*",
    "@polso/banking": "workspace:*",
    "next": "^15.x",
    "react": "^19.x",
    "@fast-csv/format": "^5.x",
    "node-xlsx": "^0.24.x"
  }
}
```

### 4.3 Turbo config update

```json
// turbo.json — agregar apps/partner a las tasks
{
  "tasks": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "persistent": true },
    "lint": {}
  }
}
```

**Commit**: `feat: scaffold apps/partner/ with routing and components structure`

---

## Fase 5: Features del Panel

### 5.1 Overview (Dashboard principal)

**Ruta**: `/`

Muestra resumen agregado de todos los clientes:
- Total de clientes conectados / pendientes
- Transacciones sin conciliar (últimos 30 días)
- Recibos pendientes de match
- Alertas: clientes con tokens expirados, sync fallido, etc.

**Componentes**: cards con métricas, lista de alertas recientes

### 5.2 Lista de Clientes

**Ruta**: `/clients`

Tabla/grid con todos los clientes de la asesoría:

| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre de la organización del cliente |
| CIF | CIF del autónomo/empresa |
| Estado conexión | Conectado / Pendiente / Desconectado |
| Semáforo conciliación | 🟢 >90% conciliado / 🟡 50-90% / 🔴 <50% |
| Último sync | Fecha del último sync de Tink |
| Transacciones sin conciliar | Número |
| Acciones | Ver detalle, Exportar, Desconectar |

**Filtros**: por estado, por semáforo, búsqueda por nombre/CIF

### 5.3 Detalle de Cliente

**Ruta**: `/clients/[clientId]`

Dashboard individual del cliente con tabs:

#### Tab: Resumen
- Cuentas bancarias conectadas (de Tink)
- Balance actual
- Gráfico de gastos/ingresos últimos 3 meses
- Estado de conciliación general

#### Tab: Transacciones (`/clients/[clientId]/transactions`)
- Tabla de transacciones bancarias
- Columnas: fecha, descripción, monto, categoría, estado conciliación
- Filtros: por fecha, por monto, por estado de conciliación
- Cada fila muestra si tiene recibo vinculado o no

#### Tab: Inbox (`/clients/[clientId]/inbox`)
- Galería/lista de documentos recibidos (recibos, facturas)
- Cada item muestra: thumbnail, proveedor (OCR), monto, fecha, estado (`new` → `suggested_match` → `done`)
- Fuente: upload manual, WhatsApp, email
- Acción: vincular manualmente con transacción, archivar

> **Referencia Midday inbox UI**: `apps/dashboard/src/` → buscar componentes de inbox. Los estados del inbox item siguen el flujo: `new` → `processing` → `analyzing` → `suggested_match` | `no_match` → `done` | `archived`

#### Tab: Conciliación (`/clients/[clientId]/conciliation`)
- Vista side-by-side: transacciones a la izquierda, inbox items a la derecha
- Matches automáticos con confidence score (de `@polso/matching`)
- Sugerencias que el partner puede confirmar/rechazar (flujo de Midday)
- Drag & drop para match manual
- Estados: ✅ confirmed, ⚠️ suggested (high confidence), ❓ pending, ❌ declined/unmatched

> **Referencias Midday para UI de matching**:
> - `packages/db/src/queries/inbox.ts` — queries para inbox items, match status, linking
> - `packages/db/src/queries/transaction-attachments.ts` — confirmar/deshacer matches, reset export status al cambiar attachments
> - `packages/db/src/queries/accounting-sync.ts` — tracking de estado de export por transacción

#### Tab: Exportar (`/clients/[clientId]/export`)
- Seleccionar rango de fechas
- Seleccionar qué incluir: transacciones, recibos, conciliación
- Formato: CSV o XLSX
- Opciones CSV: delimitador (coma, punto y coma, tab)
- Botón exportar → genera archivo → descarga directa
- Futuro: formatos específicos A3, Sage

### 5.4 Invitar Cliente

**Ruta**: `/invite`

Flujo:
1. Asesoría ingresa: nombre del cliente, email, CIF, teléfono (opcional)
2. Sistema crea registro `PartnerClient` con `status: "pending"`
3. Se envía invitación por:
   - **Email**: Link a `polso.app/connect?invite={token}` donde el cliente se registra y conecta su banco
   - **WhatsApp** (futuro): Mensaje con link de conexión
4. Cuando el cliente acepta: `status` cambia a `"active"`, la asesoría ve sus datos

**Flujo del cliente al recibir invitación**:
1. Click en link → llega a `polso.app/connect?invite={token}`
2. Se registra o inicia sesión (Neon Auth)
3. Conecta su banco (Tink Link)
4. Acepta compartir datos con la asesoría
5. Redirect a su dashboard freelancer

### 5.5 Exportar datos

Modelando Midday pero simplificado para v1 (sin job queue ni accounting providers por ahora).

> **Referencias Midday para export — leer TODOS estos archivos**:
> - `apps/worker/src/processors/transactions/export.ts` — ExportTransactionsProcessor: genera CSV+XLSX, crea ZIP, sube a storage, envía email. **Archivo principal de export.**
> - `apps/worker/src/processors/transactions/process-export.ts` — ProcessExportProcessor: formateo de datos, descarga de attachments en batch, locale-specific formatting. **Lógica de transformación.**
> - `apps/dashboard/src/components/modals/export-transactions-modal.tsx` — Modal con form de export: toggles CSV/XLSX, delimitador CSV, envío por email. **UI de export.**
> - `apps/dashboard/src/components/tables/transactions/export-bar.tsx` — Barra flotante inferior con botón export. **UX pattern.**
> - `apps/dashboard/src/components/export-status.tsx` — Toast de progreso con download/share al completar. **Progress tracking UI.**
> - `apps/dashboard/src/store/export.ts` — Zustand store para estado de export. **State management.**
> - `apps/api/src/trpc/routers/transactions.ts` → mutation `transactions.export` — Trigger del job. **API layer.**
> - `apps/api/src/rest/routers/files/download.ts` — Endpoint de descarga con file key auth. **Download endpoint.**

**Implementación v1** (síncrono, para empezar):
1. Query transacciones + inbox items + match suggestions del cliente en rango de fechas
2. Generar CSV/XLSX en memoria con `@fast-csv/format` + `node-xlsx` (mismas libs que Midday)
3. Responder con `Content-Disposition: attachment` para descarga directa

**Columnas del export** (adaptando las 21 columnas de Midday al contexto español):
- Fecha
- Descripción
- Importe
- Moneda
- Importe formateado (locale es_ES)
- Tipo IVA (21%, 10%, 4%)
- Importe IVA
- Base imponible
- Categoría
- Tipo (gasto/ingreso)
- Proveedor (del inbox item si existe)
- CIF proveedor
- Estado conciliación (matched/partial/unmatched)
- Confidence score del match
- Archivo adjunto (nombre del archivo)
- Cuenta bancaria
- Nota

> **Referencia columnas Midday**: En `process-export.ts` buscar el array de columnas — tiene 21 campos incluyendo tax, formatted amount, base amount, attachments, balance, tags, note

**Implementación v2** (async, cuando haya volumen):
- Job queue (BullMQ o similar) — ref: `apps/worker/src/processors/transactions/export.ts` usa BullMQ
- Progress tracking 0-100% — ref: `export-status.tsx` muestra progress toast
- ZIP con CSV + XLSX + PDFs de recibos — ref: Midday usa `archiver` con compression level 9
- Email al partner cuando esté listo — ref: Midday trigger `transactions-exported` notification
- Short links con expiración para compartir — ref: `export-status.tsx` tiene share con 1 week/month/year

---

## Fase 6: Queries cross-org (acceso a datos del cliente)

La clave del panel partner es que la asesoría lee datos de otras organizaciones. Todas las queries del panel deben:

1. Verificar que existe `PartnerClient` activo entre la org del asesor y la org del cliente
2. Usar el `organizationId` del **cliente** (no del asesor) para queries de datos

```typescript
// features/clients/queries/get-client-transactions.ts
export async function getClientTransactions(clientId: string) {
  const session = await getSession();
  
  // Verificar acceso
  const link = await db.partnerClient.findFirst({
    where: {
      partnerId: session.organizationId,
      clientId,
      status: "active",
    },
  });
  
  if (!link) throw new Error("No access to this client");
  
  // Query con el org del CLIENTE
  return db.transaction.findMany({
    where: { organizationId: clientId },
    orderBy: { date: "desc" },
    include: {
      conciliation: { include: { receipt: true } },
    },
  });
}
```

---

## Orden de ejecución

1. **Schema**: Agregar `Organization.type`, modelo `PartnerClient`, modelos `InboxItem` + `MatchSuggestion` + `TransactionAttachment`
2. **Package auth**: Extraer `packages/auth/` de `apps/web/lib/auth/`
3. **Package matching**: Crear `packages/matching/` con algoritmo de scoring adaptado de Midday
4. **Scaffold**: Crear `apps/partner/` con estructura base, layout, routing
5. **Auth flow**: Login/registro de asesoría, middleware de tipo de org
6. **Clientes**: Lista + invitación + detalle
7. **Transacciones**: Vista read-only de transacciones del cliente
8. **Inbox**: Vista de documentos recibidos (read-only por ahora, el upload viene con WhatsApp agent)
9. **Matching**: Vista de sugerencias, confirmar/rechazar matches
10. **Export**: CSV/XLSX genérico
11. **Verificación**: E2E test del flujo completo

## Verificación

1. `pnpm install && pnpm build` — ambas apps compilan
2. `pnpm dev --filter=@polso/partner` — partner app levanta en localhost:3001
3. Registro como asesoría → dashboard vacío
4. Invitar cliente (email) → cliente recibe link
5. Cliente se registra, conecta banco → asesoría ve datos
6. Vista de transacciones, recibos, conciliación
7. Export CSV → archivo descargado con datos correctos
8. `grep -r "plaid\|Plaid" apps/partner/` → 0 resultados

## Dependencias de la siguiente fase

El panel partner es **read-only** de los datos del cliente. Los datos se llenan cuando:
- El **cliente conecta Tink** (ya implementado en apps/web)
- El **agente WhatsApp** sube recibos (siguiente fase)
- El **cron de sync** trae transacciones (ya implementado)
- El **matching algorithm** (`@polso/matching`) genera sugerencias transacción↔inbox item (se implementa junto con el agente)

Por eso el panel se puede construir ahora con data de testing, y cobra vida completa cuando el agente WhatsApp esté listo.

---

## Referencia Midday — Archivos clave para el agente

Repo: `https://github.com/midday-ai/midday`

### Matching (PRIORIDAD ALTA — leer primero)

| Archivo | Qué hace | Para qué lo necesitamos |
|---------|----------|------------------------|
| `packages/db/src/utils/transaction-matching.ts` | **Algoritmo completo de scoring**: 4 scores (name 10%, amount 30%, date 15%, currency 5%), normalización de nombres, detección de IVA, calibración automática | Base del `@polso/matching` package. Adaptar sufijos a españoles (S.L., S.A.) y priorizar IVA español (21/10/4%) |
| `packages/db/src/schema.ts` → `transactionMatchSuggestions` | Schema de sugerencias de match con scores individuales, matchType, status, userAction | Modelo `MatchSuggestion` de Polso |
| `packages/db/src/schema.ts` → `inbox` | Schema del inbox: status flow, metadata OCR, link a transaction | Modelo `InboxItem` de Polso |
| `packages/db/src/schema.ts` → `transactionAttachments` | Link confirmado entre transacción y documento | Modelo `TransactionAttachment` de Polso |

### Inbox & Document Processing

| Archivo | Qué hace | Para qué lo necesitamos |
|---------|----------|------------------------|
| `packages/db/src/queries/inbox.ts` | Queries: crear inbox item, actualizar status, buscar por org, link/unlink de transaction | Pattern para `features/inbox/queries/` |
| `packages/db/src/queries/transaction-attachments.ts` | Confirmar match (crear attachment), deshacer match, reset export status al cambiar attachments | Pattern para `features/matching/actions/` |

### Export

| Archivo | Qué hace | Para qué lo necesitamos |
|---------|----------|------------------------|
| `apps/worker/src/processors/transactions/export.ts` | **ExportTransactionsProcessor**: genera CSV+XLSX, ZIP con archiver, upload a storage, batch processing (100 txns), progress 0-100%, email notification | Pattern completo para export v2 |
| `apps/worker/src/processors/transactions/process-export.ts` | Formateo de datos, descarga de attachments en batch (20), locale formatting, tax calculation | Lógica de transformación de datos para export |
| `apps/dashboard/src/components/modals/export-transactions-modal.tsx` | Form de export: CSV/XLSX toggles, delimitador, email delivery, Zod validation | UI de export |
| `apps/dashboard/src/components/tables/transactions/export-bar.tsx` | Barra flotante inferior con botón export, dual mode (file vs accounting) | UX pattern |
| `apps/dashboard/src/components/export-status.tsx` | Toast de progreso, download/share buttons, short links con expiración | Progress UI |
| `apps/dashboard/src/store/export.ts` | Zustand store: exportData, isExporting, exportingTransactionIds | State management |

### Accounting Provider Abstraction (para v2 — A3, Sage)

| Archivo | Qué hace | Para qué lo necesitamos |
|---------|----------|------------------------|
| `packages/accounting/src/provider.ts` | `AccountingProvider` interface + `BaseAccountingProvider` base class con retry, rate limiting | Pattern para abstracción de providers contables españoles |
| `packages/accounting/src/types.ts` | `MappedTransaction` type con 21+ campos, sync record types, error codes | Types para export a A3/Sage |
| `packages/accounting/src/xero.ts` | Implementación Xero: OAuth, sync, attachments, rate limiting adaptativo | Ejemplo de implementación de un provider |
| `apps/worker/src/processors/accounting/export-transactions.ts` | Smart export: categoriza transacciones (toExport, toSyncAttachments, alreadyComplete), idempotent | Lógica de export incremental |

### Arquitectura general

| Archivo | Qué hace | Para qué lo necesitamos |
|---------|----------|------------------------|
| `packages/db/src/queries/accounting-sync.ts` | Tracking de sync records: status (synced/partial/failed/pending), error codes, attachment mapping | Pattern para tracking de estado de export |
| `apps/api/src/trpc/routers/transactions.ts` → `transactions.export` | API mutation que dispara el job de export | Pattern para API route de export |
| `apps/api/src/rest/routers/files/download.ts` | Download endpoint con file key auth, Content-Disposition headers | Pattern para download de archivos exportados |
| `apps/dashboard/src/lib/download.ts` | Client-side download: authenticated URL generation | Pattern para descarga en el browser |
