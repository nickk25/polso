# AI Security & Compliance Audit

Auditoría completa de la implementación de IA, flujos de datos, seguridad de infraestructura y regulación española aplicable. Actualizado: 2026-06-05.

---

## 1. Qué datos ven los modelos de IA

Hay tres puntos de entrada a Claude, cada uno con una superficie de datos diferente.

### A. OCR de recibos (`claude-haiku-4-5-20251001`)

**Archivos:** `packages/agent/src/ocr.ts`

**Recibe:** Solo el archivo (imagen/PDF) en base64. Sin ID de usuario, sin datos de organización, sin transacciones.

**Devuelve:** JSON estructurado (importe, fecha, CIF del vendedor, IVA, número de factura).

**Valoración:** Superficie mínima. Es la implementación más limpia.

### B. Mensajes proactivos (`claude-haiku-4-5-20251001`)

**Archivos:** `packages/agent/src/proactive.ts`, `apps/partner/features/proactive/lib/gather-context.ts`

**Recibe:**
- Nombre de la organización
- Nombres de transacciones (nombre del comercio)
- Importes exactos en euros
- Fechas de transacciones
- Nombres de categorías con importes totales
- Porcentajes de conciliación
- Anomalías detectadas con importe de referencia de la categoría

**No recibe:** teléfono, email, ID interno, NIF de la empresa.

**Valoración:** Datos financieros reales de la empresa van a Anthropic. La identidad de la organización (nombre) también.

### C. Chat del dashboard (`claude-sonnet-4-6`)

**Archivos:** `apps/web/app/api/chat/route.ts`, `apps/web/features/agent/lib/system-prompt.ts`, `apps/web/features/agent/tools/`

**Recibe:** Contexto del sistema (nombre org, nombre de usuario, moneda, locale) + 17 herramientas que puede invocar dinámicamente.

Las herramientas dan acceso completo a:
- Lista de transacciones (descripción, importe, fecha, categoría, contrapartida)
- Saldos de cuentas bancarias
- Patrones recurrentes / suscripciones
- Alertas activas
- Ítems del inbox con estado de matching
- Forecasts (burn rate, runway, cash flow, revenue)
- VAT summary

**Aislamiento:** Cada herramienta filtra por `organizationId` — no hay fuga cross-org.

**Valoración:** Acceso total a los datos financieros de la organización, limitado por la autenticación.

---

## 2. Fallos de seguridad

### Críticos

#### ~~C1 — Webhook signature bypass si falta env var~~ ✅ RESUELTO

**Archivos:** `apps/web/app/api/webhooks/whatsapp/route.ts`, `apps/web/app/api/webhooks/telegram/route.ts`, `apps/web/app/api/webhooks/creem/route.ts`

Los tres webhooks devolvían `true` cuando la env var del secret no estaba configurada. Ahora devuelven `false` — petición rechazada si falta el secret, sin excepción.

#### ~~C2 — Brute force en códigos de vinculación del bot~~ ✅ RESUELTO

**Archivos:** `apps/web/app/api/webhooks/whatsapp/route.ts`, `apps/web/app/api/webhooks/telegram/route.ts`

Implementado rate limiting basado en base de datos (`AgentLinkAttempt`): máximo 5 intentos fallidos por identificador (teléfono/chat ID) en una ventana de 30 minutos. El intento 6 recibe un mensaje de bloqueo sin revelar si el código es válido.

---

### Altos

#### A1 — Datos financieros reales enviados a Anthropic sin DPA ⏳ PENDIENTE ACCIÓN MANUAL

Los mensajes proactivos incluyen nombre de la organización, importes de transacciones, nombres de comercios y categorías. Bajo GDPR Art. 28, enviar datos personales a un procesador externo requiere contrato escrito.

**Acción requerida (3 pasos):**

1. Ir a [anthropic.com/legal/data-processing-addendum](https://www.anthropic.com/legal/data-processing-addendum) y aceptar el DPA con la cuenta organizacional de Anthropic (el email asociado a las API keys).
2. Escribir a privacy@anthropic.com solicitando **Zero Data Retention (ZDR)** para ambas keys (`ANTHROPIC_API_KEY_OCR`, `ANTHROPIC_API_KEY_CHAT`) — mencionar que se procesan datos de empresas españolas bajo RGPD. ZDR garantiza que los datos no se almacenan ni usan para entrenar modelos.
3. Cuando esté confirmado, marcar esta entrada como ✅ RESUELTO con la fecha y guardar el PDF del DPA en el drive del equipo.

#### ~~A2 — Anthropic no está en la política de privacidad~~ ✅ RESUELTO

**Archivo:** `apps/web/app/(marketing)/privacy/page.tsx`, `messages/{en,es}/legal.json`

La política de privacidad ahora incluye una tabla detallada con los 9 sub-procesadores (Anthropic, Creem, Resend, Meta/WhatsApp, Telegram, GoCardless, Neon, Cloudflare, Vercel), con país de procesamiento, base de la transferencia (SCCs/adequacy) y enlace a su política. También se añadió la sección de transferencias internacionales y la sección de toma de decisiones automatizadas (GDPR Art. 22).

#### ~~A3 — Sin consentimiento explícito en el registro~~ ✅ RESUELTO

**Archivos:** `packages/auth/src/ui/email-otp-form.tsx`, `apps/web/app/auth/[path]/page.tsx`, `apps/web/features/auth/actions/record-consent.ts`, `packages/db/prisma/schema.prisma`

Checkbox obligatorio añadido al formulario de registro. Nuevo modelo `UserConsent` en la base de datos almacena: userId, versión de términos, versión de política, fecha de aceptación, IP y user agent. El server action `recordConsentAction` hace upsert en cada inicio de sesión exitoso (idempotente).

#### ~~A4 — Telegram: verificación no es timing-safe~~ ✅ RESUELTO

**Archivo:** `apps/web/app/api/webhooks/telegram/route.ts`

Reemplazada la comparación directa de strings por `timingSafeEqual` de `node:crypto`. Además ahora rechaza si el secret no está configurado en lugar de permitir la petición.

---

### Medios

#### M1 — Archivos de recibos en R2 sin TTL

Los archivos en `inbox/{orgId}/{uuid}.ext` nunca se borran automáticamente. Los PDFs e imágenes de facturas contienen CIF, importes, fechas. Sin política de retención viola el principio de minimización de datos (GDPR Art. 5(1)(e)).

**Fix:** Lifecycle policy en R2 — 365 días para `inbox/`, 90 días para `exports/`.

#### M2 — Contexto completo de mensajes proactivos guardado indefinidamente

`ProactiveMessage.context` almacena el JSON completo enviado a Claude (importes, nombres de comercios, org name) sin TTL.

**Fix:** No guardar el campo `context` después de 90 días, o no almacenarlo en absoluto.

#### M3 — Sin cookie consent banner

Vercel Analytics está activo pero no hay pre-consent. La política de cookies existe en texto pero no hay implementación real. Incumple ePrivacy Directive y GDPR Recital 32.

**Fix:** Banner de cookies que bloquee analytics hasta aceptación. Componente ligero con `localStorage`.

#### M4 — Sin security headers HTTP

No hay `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` ni `Strict-Transport-Security` configurados en Next.js.

**Fix en `next.config.ts`:**
```typescript
headers: async () => [{
  source: '/(.*)',
  headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ],
}]
```

#### M5 — Cron secret aceptado como query param

`CRON_SECRET` se puede pasar como `?secret=...` — expuesto en logs de acceso del servidor.

**Fix:** Eliminar soporte de query param. Solo `Authorization: Bearer ...`.

#### M6 — Sin rate limiting en endpoints críticos

- El endpoint de envío de OTP no tiene límite de requests.
- El endpoint `/api/chat` no tiene rate limiting — coste de API de Anthropic ilimitado.

**Fix:** Rate limiting por IP/usuario con Vercel Edge Middleware o KV counter.

---

### Lo que funciona bien

- Aislamiento multi-tenant: todos los queries filtran por `organizationId`
- Partner verifica `PartnerClient` link antes de acceder a datos de cliente
- Claves API separadas para OCR (`ANTHROPIC_API_KEY_OCR`) vs chat (`ANTHROPIC_API_KEY_CHAT`)
- Sin credenciales bancarias almacenadas — GoCardless las maneja
- Contraseñas no almacenadas (passwordless OTP)
- HMAC-SHA256 en WhatsApp con comparación timing-safe (cuando está configurado)
- Sin PII en el modelo OCR
- Prisma ORM — sin SQL injection posible
- URLs presignadas de R2 con expiración de 1 hora

---

## 3. Regulación aplicable en España

### RGPD (Reglamento General de Protección de Datos)

Aplica plenamente. Los clientes son empresas españolas, los datos se procesan en la UE.

| Artículo | Requisito | Estado |
|----------|-----------|--------|
| Art. 13 | Informar qué datos se recogen y a quién se transfieren | Parcial — faltan sub-procesadores |
| Art. 22 | Decisiones automatizadas: disclosure + derecho a intervención humana | Falta — auto-categorizador no documentado |
| Art. 28 | Contratos escritos con procesadores externos | Falta DPA con Anthropic |
| Art. 44-49 | Transferencias internacionales (Anthropic, Vercel, Creem = empresas USA) | Falta — necesita SCCs |

### LOPDGDD (Ley Orgánica 3/2018)

Complementa el RGPD con especificidades españolas:

- **Art. 8** — Menores: cubierto (18+).
- **Disposición adicional 17ª** — Notificación a la AEPD de incidentes en 72 horas. No hay mención de este proceso en el código ni en la política de privacidad.
- La AEPD puede multar hasta 20M€ o el 4% de facturación global.
- La privacy policy no menciona la AEPD como autoridad supervisora competente.

### EU AI Act (Reglamento UE 2024/1689)

En vigor para sistemas de alto riesgo a partir de agosto 2026.

- **Categoría de Polso:** Riesgo limitado (no está en el Anexo III de alto riesgo).
- **Art. 52** — Usuarios deben saber que interactúan con IA. El chat y los mensajes del bot deben identificarse como IA.
- **Art. 13** — Documentación de cómo funciona la categorización automática (requerida internamente).
- Los mensajes de WhatsApp/Telegram generados por IA en nombre de la empresa necesitan disclosure.

### PSD2 / Open Banking

GoCardless gestiona el acceso Open Banking y cumple PSD2 como proveedor autorizado. Polso actúa indirectamente como AISP. Si el servicio escala, puede requerir autorización directa del Banco de España.

---

## 4. Transferencias internacionales de datos

| Servicio | País | Estado |
|----------|------|--------|
| Neon PostgreSQL | UE | Sin transferencia — OK |
| Cloudflare R2 | UE (verificar región eu-west) | Verificar configuración |
| Vercel | USA | DPA de Vercel disponible — revisar |
| Anthropic | USA | Sin DPA documentado — Crítico |
| GoCardless | UK / UE | UK adequacy decision — revisar post-Brexit |
| Creem | USA | No documentado |
| Resend | USA | SCCs disponibles — revisar |
| Meta (WhatsApp) | USA | SCCs de Meta — revisar |
| Telegram | Dubai / UE | No está claro |

---

## 5. Plan de acción

### Sprint 1 — Crítico ✅ COMPLETADO

- [x] **S1-1** Fail-fast en env vars de webhooks: los tres webhooks (WhatsApp, Telegram, Creem) devuelven `false` si falta el secret — nunca `true`
- [x] **S1-2** Rate limiting en link codes: tabla `AgentLinkAttempt` + máximo 5 intentos fallidos por identificador en 30 minutos
- [x] **S1-3** Telegram verification timing-safe: `timingSafeEqual` de `node:crypto` reemplaza la comparación directa

### Sprint 2 — Legal urgente ✅ COMPLETADO (excepto S2-1 acción manual)

- [x] **S2-2** Política de privacidad: tabla de 9 sub-procesadores con país, base de transferencia (SCCs) y link. Sección GDPR Art. 22 (decisiones automatizadas). Referencia a AEPD
- [x] **S2-3** Consent en el registro: checkbox obligatorio en `EmailOtpForm` + modelo `UserConsent` en DB con versión, IP y user agent
- [x] **S2-4** Cookie consent banner: bloquea Vercel Analytics hasta aceptación. Hook `useCookieConsent` + `localStorage`
- [ ] **S2-1** ⏳ DPA con Anthropic + Zero Data Retention — **acción manual pendiente** (ver guía en la sección A1 de este documento)

### Sprint 3 — Hardening técnico ✅ COMPLETADO (excepto S3-1 acción manual)

- [ ] **S3-1** ⏳ Lifecycle policy en Cloudflare R2 — **acción manual pendiente**
  - Ir a Cloudflare dashboard → R2 → bucket → Settings → Object Lifecycle Rules
  - Regla 1: prefix `inbox/` → expire after **365 days**
  - Regla 2: prefix `exports/` → expire after **90 days**
  - Cuando esté hecho, marcar ✅ con la fecha
- [x] **S3-2** Eliminar secret de query param en crons: solo `Authorization: Bearer ...` (`apps/web` y `apps/partner`)
- [x] **S3-3** Security headers en ambos `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`
- [x] **S3-4** Rate limiting AI por organización: 100 req/24h Sonnet (chat dashboard), 500 req/24h Haiku (OCR en todos los puntos de entrada — Telegram, WhatsApp, inbox, chat attachments, partner cron). Paquete `@polso/cache` con Upstash Redis sliding window
- [x] **S3-5** TTL en mensajes proactivos: `ProactiveMessage.context` se pone a `NULL` después de 90 días en el cron diario del partner
- [x] **S3-6** Optimización billing de GoCardless: prevención de bancos duplicados (409 en create-link), retry queue para deletes fallidos (tabla `RequisitionCleanupQueue`), limpieza mensual el día 28 UTC en el cron de sync-transactions, access token cacheado en Redis (23.5h TTL)

### Sprint 4 — EU AI Act (antes de agosto 2026)

- [ ] **S4-1** Disclosure de IA en la UI: badge "Asistente IA" visible en el chat del dashboard y en el primer mensaje del bot
- [ ] **S4-2** Derecho a revisión humana de categorizaciones: flujo de impugnación o marcado de categorización incorrecta
- [ ] **S4-3** Documentación técnica del sistema de IA: documento interno describiendo modelos, datos procesados y lógica de categorización (requerido por EU AI Act Art. 11)

---

## Resumen

La implementación técnica tiene buen aislamiento multi-tenant y minimización de datos en OCR. Los riesgos más urgentes son:

1. ~~**Dos vulnerabilidades críticas** explotables hoy: webhook bypass y brute force en link codes.~~ **✅ Resueltas en Sprint 1.**
2. ~~**Vacío legal claro**: Anthropic recibe datos financieros reales sin DPA firmado y sin aparecer en la política de privacidad.~~ **Sub-procesadores y consent resueltos en Sprint 2. DPA con Anthropic pendiente acción manual (ver guía en A1).**
3. ~~**Cuatro sub-procesadores invisibles** para el usuario (Anthropic, Creem, Resend, Meta/Telegram).~~ **✅ Resuelto en Sprint 2 — tabla completa en política de privacidad.**
