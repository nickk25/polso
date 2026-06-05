# Email Catalog — Polso

**24 templates** • `packages/email/templates/`

Preview server: `pnpm --filter @polso/email preview` → http://localhost:3002

---

## Preview rápido

Todos los templates tienen `PreviewProps` definidos. Para ver cualquiera visualmente:

```bash
pnpm --filter @polso/email preview
# abre http://localhost:3002
```

---

## Onboarding

### `welcome.tsx` — Bienvenida al dashboard
- **Destinatario:** Usuario recién registrado
- **Remitente:** `FROM_EMAIL` (Polso)
- **Trigger:** Signup completado
- **Dónde se envía:** `sendWelcome()` — pendiente de wiring en signup flow
- **Contenido:** Nombre personalizado, 3 pasos numerados (conectar banco, revisar gastos, configurar alertas), botón al dashboard

### `welcome-founder.tsx` — Nota personal del founder
- **Destinatario:** Usuario recién registrado
- **Remitente:** `FROM_FOUNDER` (Nick)
- **Trigger:** Signup completado (segmento founder/early adopter)
- **Dónde se envía:** `sendWelcomeFounder()` — pendiente de wiring
- **Contenido:** Email conversacional de Nick, sin botones, invita a responder directamente

### `waitlist-confirmation.tsx` — Confirmación de lista de espera
- **Destinatario:** Email que se apuntó a la waitlist
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Formulario de waitlist enviado
- **Dónde se envía:** `sendWaitlistConfirmation()` — sin uso activo encontrado en el codebase (posible omisión)
- **Contenido:** Confirmación, 4 features que recibirá cuando abra acceso

### `waitlist-founder.tsx` — Nota personal del founder a waitlist
- **Destinatario:** Persona en waitlist
- **Remitente:** `FROM_FOUNDER`
- **Trigger:** Formulario de waitlist (`apps/web/features/waitlist/actions/join-waitlist.ts:42`)
- **Dónde se envía:** `sendWaitlistFounder(to, name, locale)`
- **Contenido:** Párrafos conversacionales de Nick, info sobre acceso por batches, invita a responder

---

## Trial & Suscripción

### `trial-started.tsx` — Trial activado
- **Destinatario:** Usuario que inicia trial
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Activación de trial (billing webhook / Creem)
- **Dónde se envía:** `sendTrialStarted(to, name, trialEndDate, locale)` — wiring en billing webhook
- **Contenido:** Fecha de fin del trial, 4 features disponibles durante el trial, botón al dashboard

### `trial-ending.tsx` — Trial terminando (urgencia)
- **Destinatario:** Usuario con trial próximo a vencer
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Cron job X días antes del vencimiento (configurable `daysLeft`)
- **Dónde se envía:** `sendTrialEnding(to, name, daysLeft, trialEndDate, locale)`
- **Contenido:** Días restantes en el heading, comparativa de planes Starter/Business con precios, botón de upgrade

### `trial-ended.tsx` — Trial expirado
- **Destinatario:** Usuario con trial vencido
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Día de vencimiento del trial
- **Dónde se envía:** `sendTrialEnded(to, name, locale)`
- **Contenido:** Consecuencias claras, aviso de retención de datos 30 días, botón de upgrade

### `subscription-confirmed.tsx` — Suscripción confirmada
- **Destinatario:** Usuario que suscribió/upgradó
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Pago exitoso (Creem webhook)
- **Dónde se envía:** `sendSubscriptionConfirmed(to, name, planName, amount, nextBillingDate, locale)`
- **Contenido:** Tabla con plan, importe con "/mo", próxima fecha de facturación, botón al dashboard

### `payment-failed.tsx` — Pago fallido
- **Destinatario:** Usuario cuyo pago falló
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Webhook de fallo de pago (Creem)
- **Dónde se envía:** `sendPaymentFailed(to, name, amount, locale)`
- **Contenido:** Badge "Acción requerida", importe fallido, 3 razones comunes, botón para actualizar método de pago

### `subscription-cancelled.tsx` — Suscripción cancelada
- **Destinatario:** Usuario que canceló
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Cancelación procesada (Creem webhook)
- **Dónde se envía:** `sendSubscriptionCancelled(to, name, accessEndDate, locale)`
- **Contenido:** Fecha de fin de acceso, lista de consecuencias (sin dashboard, sin sincronización, retención 30 días), botón de reactivación

---

## Banca (Open Banking)

### `bank-connected.tsx` — Banco conectado
- **Destinatario:** Usuario que conectó un banco
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Callback exitoso de Tink/GoCardless
- **Dónde se envía:** `sendBankConnected(to, name, bankName, accountCount, locale)`
- **Contenido:** Nombre del banco, número de cuentas, 3 próximos pasos (transacciones sincronizando, auto-categorización activada, actualizaciones diarias), botón al dashboard

### `bank-disconnected.tsx` — Banco desconectado
- **Destinatario:** Usuario cuyo banco se desconectó
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Webhook de desconexión / token expirado
- **Dónde se envía:** `sendBankDisconnected(to, name, bankName, locale)`
- **Contenido:** Badge "Acción requerida", nombre del banco, 3 razones de desconexión (token expirado, cambio de contraseña, revocación), botón de reconexión

### `sync-error.tsx` — Error de sincronización
- **Destinatario:** Usuario con error de sync
- **Remitente:** `FROM_EMAIL`
- **Trigger:** `detect-alerts.ts:766` — cuando sync de cuenta bancaria falla
- **Dónde se envía:** `sendSyncError(to, name, bankName, errorMessage, locale)`
- **Contenido:** Error code en caja gris (e.g. `ITEM_LOGIN_REQUIRED`), botón a configuración de banca

---

## Alertas Financieras (Inteligencia)

Todas disparadas desde `apps/web/features/alerts/lib/detect-alerts.ts`.

### `alert-low-balance.tsx` — Saldo bajo
- **Destinatario:** Owner/admin de la org
- **Trigger:** `detect-alerts.ts:136` — saldo de cuenta cae bajo el umbral configurado
- **Dónde se envía:** `sendLowBalanceAlert(to, name, accountName, currentBalance, threshold, locale)`
- **Contenido:** Comparativa visual saldo actual (rojo, grande) vs umbral configurado (gris, pequeño)

### `alert-high-spend.tsx` — Gasto elevado en categoría
- **Destinatario:** Owner/admin de la org
- **Trigger:** `detect-alerts.ts:275` — gasto de categoría supera umbral en el mes corriente
- **Dónde se envía:** `sendHighSpendAlert(to, name, category, amount, threshold, period, locale)`
- **Contenido:** Nombre de categoría en heading, comparativa gasto actual (rojo) vs umbral (gris), botón a gastos

### `alert-unusual-activity.tsx` — Actividad inusual
- **Destinatario:** Owner/admin de la org
- **Trigger:** `detect-alerts.ts:554` — transacción es 2-3x el promedio de su categoría
- **Dónde se envía:** `sendUnusualActivityAlert(to, name, category, amount, averageAmount, multiplier, locale)`
- **Contenido:** Multiplicador en heading (e.g. "7x tu promedio"), comparativa este gasto vs tu promedio, nota aclaratoria sobre threshold 2x

### `alert-missing-recurring.tsx` — Pago recurrente no detectado
- **Destinatario:** Owner/admin de la org
- **Trigger:** `detect-alerts.ts:680` — pago recurrente esperado lleva >7 días de retraso
- **Dónde se envía:** `sendMissingRecurringAlert(to, name, vendorName, expectedAmount, expectedDate, locale)`
- **Contenido:** Proveedor, importe esperado y fecha esperada en caja gris, 3 posibles causas

### `alert-runway-critical.tsx` — Runway crítico
- **Destinatario:** Owner/admin de la org
- **Trigger:** `detect-alerts.ts:402` — runway de caja cae bajo el umbral configurado
- **Dónde se envía:** `sendRunwayCriticalAlert(to, name, runwayMonths, threshold, currentBalance, monthlyBurn, locale)`
- **Contenido:** Tabla de 3 columnas: runway en meses (rojo), saldo actual, burn mensual — todo en monospace

---

## Equipo & Invitaciones

### `user-invited.tsx` — Invitación a equipo (web)
- **Destinatario:** Persona invitada al equipo de una org cliente
- **Remitente:** `FROM_EMAIL`
- **Trigger (web):**
  - `apps/web/features/team/actions/send-invite.ts:141` — nueva invitación
  - `apps/web/features/team/actions/resend-invite.ts:73` — reenvío
- **Trigger (partner):**
  - `apps/partner/features/team/actions/invite-teammate.ts:78` — invitar colega al equipo partner
- **Dónde se envía:** `sendUserInvited(to, inviterName, organizationName, inviteToken, locale)`
- **Contenido:** Quién invita, nombre de la org, descripción de Polso, botón para aceptar

### `user-accepted-invite.tsx` — Alguien aceptó tu invitación
- **Destinatario:** Miembros existentes del equipo
- **Remitente:** `FROM_EMAIL`
- **Trigger:** Usuario acepta invite (`apps/web/features/team/actions/accept-invite.ts`)
- **Dónde se envía:** `sendUserAcceptedInvite(to, name, newMemberName, newMemberEmail, organizationName, locale)`
- **Contenido:** Nombre y email del nuevo miembro en caja gris, botón a gestión del equipo

---

## Flujo Partner → Cliente

### `partner-client-invited.tsx` — Advisor invita a cliente
- **Destinatario:** Email del cliente (SMB) invitado
- **Remitente:** `FROM_EMAIL`
- **Trigger:**
  - `apps/partner/features/clients/actions/invite-client.ts:58` — invitación individual
  - `apps/partner/features/clients/actions/bulk-invite.ts:61` — invitación masiva (chunks de 5)
  - `apps/partner/features/clients/actions/resend-invite.ts:47` — reenvío (rate-limited 1/hora)
  - `apps/partner/features/clients/actions/update-invite-email.ts:60` — cambio de email (regenera token)
- **Dónde se envía:** `sendPartnerClientInvited(to, partnerName, partnerOrgName, clientName, inviteToken, locale)`
- **Contenido:** Nombre del advisor, nombre de la asesoría, nombre opcional del cliente invitado, botón de aceptar

### `partner-client-connected.tsx` — Cliente se conectó (notificación al partner)
- **Destinatario:** Partner/advisor (miembros con `notifyOnClientConnected=true`)
- **Remitente:** `FROM_EMAIL`
- **Trigger:**
  - `apps/web/features/team/actions/accept-invite.ts:195` — cuando cliente acepta invite (`triggerEvent: "joined"`)
  - `apps/web/app/api/gocardless/callback/route.ts:173` — cuando cliente conecta primer banco (`triggerEvent: "first_bank"`)
- **Dónde se envía:** `sendPartnerClientConnected(to, partnerName, clientName, triggerEvent, dashboardUrl, locale)`
- **Contenido:** Dos variantes según `triggerEvent`: heading y texto diferentes para "se unió" vs "conectó su banco"

---

## Digests Periódicos

### `partner-digest.tsx` — Resumen diario/semanal para partners
- **Destinatario:** Miembros del equipo partner con `digestCadence` configurado
- **Remitente:** `FROM_EMAIL`
- **Trigger:** `apps/partner/app/api/cron/daily/route.ts:182` — cron diario a las 7:00 UTC (9:00 CET), solo envía si `cadence` coincide con el día
- **Dónde se envía:** `sendPartnerDigest(to, partnerName, partnerOrgName, cadence, periodLabel, newClients, receiptsUploaded, pendingReceipts, dashboardUrl, locale)`
- **Contenido:** Nuevos clientes del período, tabla de recibos subidos por cliente, tabla de recibos pendientes. Secciones ocultas si no hay datos.

### `client-weekly-digest.tsx` — Resumen semanal para clientes
- **Destinatario:** Miembros de org cliente que optaron por digest
- **Remitente:** `FROM_EMAIL`
- **Trigger:** `apps/web/features/notifications/lib/run-client-digests.ts:46` — cron semanal
- **Dónde se envía:** `sendClientWeeklyDigest(to, name, orgName, periodLabel, totalSpend, priorSpend, deltaPct, topCategories, accountBalances, unmatchedReceiptsCount, alertsTriggered, largeTransactions, currency, dashboardUrl, locale)`
- **Contenido:** Gasto total vs semana anterior con delta % (rojo/verde), top categorías, saldos de cuentas, recibos sin match, alertas disparadas, transacciones grandes

---

## Matriz de triggers por app

| Template | apps/web | apps/partner | Cron | Webhook |
|----------|----------|--------------|------|---------|
| welcome | ✓ (pending) | — | — | — |
| welcome-founder | ✓ (pending) | — | — | — |
| waitlist-confirmation | ? | — | — | — |
| waitlist-founder | ✓ join-waitlist | — | — | — |
| trial-started | — | — | — | ✓ billing |
| trial-ending | — | — | ✓ | — |
| trial-ended | — | — | ✓ | — |
| subscription-confirmed | — | — | — | ✓ billing |
| payment-failed | — | — | — | ✓ billing |
| subscription-cancelled | — | — | — | ✓ billing |
| bank-connected | — | — | — | ✓ gocardless |
| bank-disconnected | — | — | — | ✓ gocardless |
| sync-error | ✓ detect-alerts | — | — | — |
| alert-low-balance | ✓ detect-alerts | — | — | — |
| alert-high-spend | ✓ detect-alerts | — | — | — |
| alert-unusual-activity | ✓ detect-alerts | — | — | — |
| alert-missing-recurring | ✓ detect-alerts | — | — | — |
| alert-runway-critical | ✓ detect-alerts | — | — | — |
| user-invited | ✓ send-invite | ✓ invite-teammate | — | — |
| user-accepted-invite | ✓ accept-invite | — | — | — |
| partner-client-invited | — | ✓ invite/bulk/resend/update | — | — |
| partner-client-connected | ✓ accept-invite + gocardless | — | — | — |
| partner-digest | — | — | ✓ daily cron | — |
| client-weekly-digest | — | — | ✓ weekly cron | — |

---

## Notas

- `waitlist-confirmation` no tiene caller activo en el codebase — revisar si falta wiring en `join-waitlist.ts`
- `welcome` y `welcome-founder` tampoco tienen caller activo — pendiente de implementar en el signup flow post-auth
- El callback de GoCardless (`route.ts:179`) tiene locale hardcoded a `"es"` — considerar leerlo del usuario
- El cron de `partner-digest` (`route.ts:192`) también tiene locale hardcoded a `"es"`
