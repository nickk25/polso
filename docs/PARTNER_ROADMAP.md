# Partner App — Roadmap para Asesorías Fiscales

> Análisis de casos de uso reales de asesorías fiscales en España vs. cobertura actual de Polso Partner.
> Objetivo: hacer Partner irresistible para asesorías — que puedan crecer más con el mismo personal.

---

## Cobertura actual

| Workflow de asesoría | Estado |
|---|---|
| Recogida de documentos (facturas, tickets) | **Fuerte** — WhatsApp/Telegram bot es el canal dominante en España |
| Sincronización bancaria | **Fuerte** — Tink Open Banking, mejor integración que A3/Sage out-of-the-box |
| Categorización automática de gastos | **Fuerte** — auto-categorización + detección de recurrentes |
| Matching factura↔movimiento | **Fuerte** — AI matching con scores de confianza, confirmación bulk |
| Vista multi-cliente | **Buena** — dashboard con KPIs, pendientes por trimestre, VAT summary |
| Recordatorios proactivos al cliente | **Buena** — agente WhatsApp/Telegram con cooldown, bulk reminders |
| Exportación para el asesor | **Básica** — CSV + ZIP con facturas, funcional pero sin destino específico |
| Análisis P&L / IVA por cliente | **Básica** — existe pero no orientada a preparar modelos fiscales |

---

## Huecos críticos

### 🔴 Bloqueantes — sin estos no pueden usar Polso como herramienta principal

**1. Calendario fiscal por cliente**
No existe tracking de qué obligaciones tiene cada cliente (303, 130, 111, 200, 100...) ni cuándo vencen. Un asesor con 100 clientes necesita ver de un vistazo quién está listo para presentar y quién no.

**2. Integración con A3 / Sage**
A3 tiene el 60%+ del mercado y nadie lo va a abandonar. El movimiento ganador (que Quipu ejecutó) es ser la capa de pre-contabilidad que exporta asientos limpios a A3. El export actual es CSV genérico — no habla con ningún sistema contable.

**3. Validación de facturas**
Cuando llega una factura, la asesoría verifica NIF del proveedor, tipo de IVA correcto y deductibilidad del gasto. El inbox muestra los documentos pero no los valida fiscalmente.

---

### 🟡 Importantes — diferenciarían fuerte contra la competencia

**4. Libro Registro de IVA**
Los datos ya están en Polso (transacciones + facturas + IVA). Falta formatearlos como el Libro Registro oficial (facturas recibidas / emitidas) que la asesoría necesita para preparar el 303. Es exportar datos existentes en un formato diferente.

**5. Pre-relleno del Modelo 303**
Con los datos del trimestre (base imponible + cuotas IVA soportado/repercutido) se puede generar un borrador del 303. No hace falta presentarlo desde Polso — solo que el asesor lo tenga casi listo sin calcular desde cero.

**6. Perfil de obligaciones por cliente**
Cada cliente tiene una configuración diferente: autónomo en módulos (no hace 130), SL con empleados (hace 111), arrendador (hace 115). Sin esto, los recordatorios y el dashboard de pendientes no pueden ser precisos.

---

### 🟢 Quick wins — poco esfuerzo, alto valor percibido

**7. Semáforo "listo para presentar"**
El quarter-pendings card ya existe. Falta convertirlo en un semáforo visual por cliente y período: 🔴 faltan documentos → 🟡 docs completos, pendiente revisar → 🟢 listo para presentar. El asesor ve 100 clientes de un vistazo.

**8. Recordatorios ligados al calendario fiscal**
Los recordatorios son manuales ahora. Lo que necesitan: "estamos a 3 semanas del 20 de octubre, manda recordatorio automático a todos los clientes con cobertura <85%". El agente ya existe — falta el trigger temporal fiscal.

**9. Export por trimestre con naming contable**
El export ya genera ZIP. Con naming normalizado (`2025-T3_FACTURA_RECIBIDA_001.pdf`) y CSV con columnas en formato A3/Sage, el asesor importa directamente sin retocar.

**10. NIF lookup automático**
Al procesar una factura, validar el NIF del proveedor contra el censo de AEAT (API pública). Detecta facturas falsas o erróneas antes de que lleguen a contabilidad.

---

## Análisis competitivo

| Feature | Polso | Quipu | Holded | A3 |
|---|---|---|---|---|
| Open Banking real (Tink) | ✅ | ❌ | Parcial | ❌ |
| Bot WhatsApp/Telegram | ✅ | ❌ | ❌ | ❌ |
| AI matching factura↔banco | ✅ | Manual | Parcial | ❌ |
| Multi-cliente dashboard | ✅ | ✅ | ✅ | ✅ |
| Calendario fiscal | ❌ | Parcial | Parcial | ✅ |
| Export a A3/Sage | ❌ | ✅ | ❌ | N/A |
| Libro Registro IVA | ❌ | Parcial | Parcial | ✅ |
| Presentación AEAT directa | ❌ | ❌ | ❌ | ✅ |

**Brecha estratégica**: Polso gana en la capa de datos (Open Banking + AI + docs) pero no tiene la capa fiscal. A3 tiene la capa fiscal pero no tiene la capa de datos. Nadie tiene las dos.

---

## Hoja de ruta

### Sprint 1 — "El dashboard que no tienen en ningún sitio"

1. **Perfil de obligaciones por cliente** — campo configurable por el asesor (qué modelos hace cada cliente)
2. **Semáforo trimestral** — visualización rojo/amarillo/verde en el client list
3. **Recordatorios ligados al calendario fiscal** — trigger automático basado en próximas fechas de vencimiento

> Por qué primero: no requiere integraciones externas, usa datos que ya existen, y resuelve el pain point de visibilidad de cartera. El asesor ve el valor el primer día.

---

### Sprint 2 — "El puente con A3"

4. **Export Libro Registro IVA** — CSV oficial de facturas recibidas/emitidas por trimestre
5. **Export compatible A3/Sage** — mismo ZIP actual con formato de asientos A3 (columnas + formato de fecha)
6. **NIF validation en inbox** — verificar NIF automáticamente al procesar cada factura

> Por qué segundo: aquí la asesoría empieza a decir "me está ahorrando 3 horas por cliente por trimestre". El argumento de venta se vuelve concreto y medible.

---

### Sprint 3 — "El copiloto fiscal"

7. **Borrador Modelo 303** — pre-relleno con datos del trimestre, listo para revisar y presentar
8. **Alertas de deductibilidad** — flags automáticos en categorías sospechosas (gastos personales camuflados, IVA no deducible)
9. **Panel de cruce 347** — listado de contrapartes >3.005€ anuales por cliente, listo para alimentar el modelo

> Por qué tercero: esto hace que la asesoría deje de ver Polso como "la app de los recibos" y lo vea como su copiloto fiscal. Con esto pueden manejar 40% más clientes con el mismo equipo.

---

## El argumento de venta

La asesoría no necesita que Polso reemplace A3. Necesita que Polso elimine todo el trabajo **antes** de A3: conseguir los documentos, validarlos, cuadrarlos con el banco, y entregarlos listos para contabilizar.

Si Polso hace eso bien, cada asesor puede manejar 30-40 clientes más con el mismo tiempo. A €50-80/cliente/mes de margen para la asesoría, eso son €18k-40k más de ingresos anuales por asesor. Eso es irresistible.

---

## Contexto del mercado

- **80.6%** de los despachos en España tienen menos de 10 empleados
- **1 asesor** maneja entre 80-120 clientes como techo actual
- **40% más clientes** gestionan las asesorías digitalizadas con el mismo personal (fuente: acciogest.com)
- **A3/a3innuva (Wolters Kluwer)** domina con 240.000+ despachos — no se reemplaza, se complementa
- **Verifactu** obligatorio para software fiscal desde enero 2027 (IS) y julio 2027 (resto)
- **Facturación electrónica B2B (Ley Crea y Crece)** — obligatoria para todos los autónomos y empresas en 2026-2027
- **Crunch calendar**: enero (Q4 + anuales), marzo (347), abril-junio (IRPF), julio (IS), octubre (Q3)
