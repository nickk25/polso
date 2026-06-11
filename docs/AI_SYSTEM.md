# Documentación del Sistema de IA — Polso

Documentación técnica interna del sistema de IA de Polso, requerida por el **EU AI Act Art. 11** (sistemas de IA de riesgo limitado). Actualizado: 2026-06-11.

---

## 1. Clasificación del sistema

**Categoría:** Riesgo limitado (Art. 52 EU AI Act)

Polso no está en las categorías de alto riesgo del Anexo III. Opera como sistema de soporte a la toma de decisiones financieras para autónomos y PYMEs. Las decisiones finales (categorización, verificación de gastos, declaraciones fiscales) siempre las toma el usuario.

---

## 2. Componentes de IA

### A. OCR de recibos — `claude-haiku-4-5-20251001`

**Propósito:** Extraer datos estructurados de imágenes y PDFs de facturas y tickets.

**Entradas:** Archivo en base64 (imagen/PDF). Sin datos de usuario ni organización.

**Salidas:** JSON estructurado con: `documentType`, `displayName`, `amount`, `currency`, `date`, `cif`, `vatAmount`, `vatRate`.

**Cuándo se usa:**
- Al subir un archivo al Vault (inbox)
- Al enviar una foto por Telegram
- Al adjuntar un archivo en el chat del dashboard

**Límites:** 500 llamadas/24h por organización (sliding window, Upstash Redis).

**Revisión humana:** El usuario siempre ve el resultado del OCR en el inbox y puede corregir cualquier campo antes de asociarlo a una transacción.

---

### B. Categorización automática de transacciones

**Propósito:** Asignar una categoría de gasto a cada transacción importada desde el banco.

**Motor:** `packages/intelligence/src/category-suggester.ts` — sin LLM, basado en reglas deterministas.

**Sistema de prioridades (mayor a menor confianza):**

| Prioridad | Fuente | Confianza |
|-----------|--------|-----------|
| 1 | Categoría por defecto del proveedor (`categorySource: "vendor"`) | 95% |
| 2 | Historial de ese comercio en la misma org (`categorySource: "history"`) | 88% |
| 3 | Mapeo de categoría del proveedor bancario (`categorySource: "provider"`) | 70–80% |
| 4 | Coincidencia de palabras clave (`categorySource: "keyword"`) | 70–85% |
| 5 | Fallback: "Miscellaneous" (`categorySource: "keyword"`) | 50% |

**Disclosure al usuario:** En el panel de transacciones, al abrir el detalle de una transacción con `categorySource !== "manual"`, se muestra el texto: *"Categoría asignada automáticamente por IA. Puedes cambiarla."*

**Corrección:** El usuario puede cambiar la categoría manualmente en cualquier momento. Al hacerlo, se registra `categorySource: "manual"` y la corrección se usa como dato de entrenamiento para futuros suggesters (via historial).

**Sin LLM:** Este componente no llama a ninguna API externa. Es completamente determinista y auditable.

---

### C. Mensajes proactivos — `claude-haiku-4-5-20251001`

**Propósito:** Generar mensajes personalizados para el bot (Telegram/WhatsApp) que informen al cliente sobre su situación financiera.

**Entradas:** Nombre de la organización, nombres de comercios, importes de transacciones, fechas, categorías con totales, porcentajes de conciliación, anomalías detectadas.

**Salidas:** Texto en lenguaje natural en español.

**Cuándo se usa:** Cron diario del partner (`apps/partner/app/api/cron/daily/route.ts`) — solo si la organización tiene bot conectado y el partner ha habilitado los mensajes proactivos.

**Disclosure:** El primer mensaje del bot incluye una línea de presentación indicando que es un asistente automatizado.

**Retención de datos:** El campo `context` (que contiene los datos financieros enviados al modelo) se elimina de la base de datos a los 90 días (`ProactiveMessage.context = NULL`).

**Límites:** 500 llamadas/24h por organización (compartido con OCR).

---

### D. Chat del dashboard — `claude-sonnet-4-6`

**Propósito:** Asistente financiero conversacional para el usuario del dashboard.

**Entradas:** Mensajes del usuario + contexto del sistema (nombre org, moneda, locale) + 17 herramientas que puede invocar bajo demanda.

**Herramientas disponibles:** Transacciones, saldos, patrones recurrentes, alertas, inbox, forecasts (burn rate, runway, cash flow), IVA, proveedores.

**Aislamiento:** Cada herramienta filtra por `organizationId` — no hay acceso cross-org.

**Disclosure al usuario:** Cada respuesta del asistente muestra el badge "Polso AI" con un icono de sparkle, y hay un disclaimer permanente en el input: *"Polso AI puede cometer errores. Verifica siempre los datos financieros importantes."*

**Límites:** 100 llamadas/24h por organización.

**Logs:** Se almacena en `ChatLog` (mensaje del usuario truncado a 4000 chars, respuesta a 2000 chars, herramientas usadas, duración). Sin PII adicional.

---

## 3. Datos enviados a Anthropic

| Componente | Datos enviados |
|------------|---------------|
| OCR | Solo el archivo (imagen/PDF) en base64. Sin ID de usuario, sin org. |
| Mensajes proactivos | Nombre de org, nombres de comercios, importes, fechas, categorías |
| Chat dashboard | Nombre de org, nombre de usuario + datos que devuelven las herramientas (balances, transacciones, etc.) según lo que el usuario pregunte |

**Sub-procesador:** Anthropic PBC (USA). Base de transferencia: SCCs + DPA firmado (ver `docs/AI_SECURITY_AUDIT.md` S2-1).

---

## 4. Derechos del usuario (GDPR Art. 22)

Las funciones de OCR y mensajes proactivos constituyen **procesamiento automatizado** que puede afectar al usuario (clasificación de gastos, alertas financieras). Garantías implementadas:

- **Transparencia:** El usuario sabe qué categorías fueron auto-asignadas (`categorySource` visible en la UI).
- **Corrección:** El usuario puede cambiar cualquier categoría auto-asignada en cualquier momento.
- **Intervención humana:** Ninguna acción contable o fiscal se ejecuta sin confirmación explícita del usuario.
- **Opt-out del bot:** El campo `Organization.agentOptOut` permite a cualquier organización desactivar todos los mensajes proactivos.

---

## 5. Modelos y versiones

| Modelo | Versión | Uso |
|--------|---------|-----|
| Claude Haiku | `claude-haiku-4-5-20251001` | OCR, mensajes proactivos |
| Claude Sonnet | `claude-sonnet-4-6` | Chat dashboard |

Los modelos se actualizan con cada release de Anthropic. Anthropic no almacena ni usa los prompts para entrenar modelos bajo el acuerdo de Zero Data Retention (ZDR) — ver `docs/AI_SECURITY_AUDIT.md`.
