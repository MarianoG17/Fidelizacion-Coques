# Pendientes para Próxima Sesión

## ✅ COMPLETADO en esta sesión

1. ✅ **Refactor completo 22 endpoints admin** - Middleware implementado
2. ✅ **Función duplicada eliminada** - normalizarTelefono
3. ✅ **Template white-label** - Sistema completo
4. ✅ **Fixes críticos iOS** - PasskeyPrompt loop
5. ✅ **Passkeys mejorados** - Sesión expirada + duplicados
6. ✅ **Beneficio cumpleaños** - Guardado arreglado
7. ✅ **Auditoría completa** - Documentada en AUDITORIA-CODIGO-MEJORAS.md

## ⚠️ PENDIENTE (No crítico, documentado)

### 1. Fix Feedback Modal - Evento sin verificar frecuencia

**Archivo:** `src/components/FeedbackModal.tsx:46`

**Problema:** El listener `openFeedbackModal` NO verifica frecuencia antes de abrir

```typescript
// ❌ ACTUAL (línea 46-60)
function handleOpenFeedback() {
  console.log('[FEEDBACK] Abriendo modal desde notificación')
  const ultimoScan = localStorage.getItem('ultimo_scan')
  if (ultimoScan) {
    setTrigger({ type: 'VISITA_FISICA', timestamp: parseInt(ultimoScan) })
    setShow(true)
    localStorage.setItem('feedback_scan_visto', 'true')
  }
}
// NO VERIFICA ultimo_feedback_mostrado ni config.feedbackFrecuenciaDias
```

**Solución:** Aplicar el mismo patrón que en `checkVisitaFisica()`

**Documentado en:** [`SOLUCION-FEEDBACK-FRECUENCIA.md`](fidelizacion-zona/SOLUCION-FEEDBACK-FRECUENCIA.md:44)

**Impacto:** Medio - El usuario reportó que aparece cada 3 días

---

### 2. TODOs en el Código (15 comentarios)

**Archivo:** Ver `AUDITORIA-CODIGO-MEJORAS.md:119-148`

**Principales:**

1. **Push notifications estados-auto** (`estados-auto/route.ts:119`)
   ```typescript
   // TODO Fase 3: enviar push/WhatsApp si hay beneficios disparados
   ```
   
2. **SKU Torta Temática hardcodeado** (`woocommerce/tortas/route.ts:181`)
   ```typescript
   // XXX: [ // Torta Temática Buttercream (SKU 20) - REEMPLAZAR XXX con ID real
   ```
   Necesita ID real de WooCommerce

3. **Otros TODOs menores** - Documentación, validaciones, features futuras

**Impacto:** Bajo - Son features opcionales o mejoras futuras

---

### 3. Constantes Mágicas (Strings literales)

**Ejemplo:** `src/app/admin/components/Clientes.tsx:55-56`

```typescript
// ❌ String literal repetido
const [nivelFiltro, setNivelFiltro] = useState('TODOS')

// ✅ MEJORA SUGERIDA:
const FILTRO_TODOS = 'TODOS'
// O mejor: enum FiltroNivel
```

**Archivos afectados:** ~10-15

**Impacto:** Muy bajo - Mejora de código, no es bug

---

### 4. Mensajes de Validación Hardcodeados

**Ejemplo:** `src/components/CompletePhoneModal.tsx:50`

```typescript
// ❌ Mensaje largo hardcodeado
setError('Para CABA: 11 XXXX-XXXX. Para interior: incluí código de área...')

// ✅ MEJORA SUGERIDA:
// Mover a constante en /lib/phone.ts
export const PHONE_VALIDATION_MESSAGE = '...'
```

**Impacto:** Muy bajo - Mejora de mantenibilidad

---

## 🎯 Recomendaciones

### Prioridad ALTA (hacer pronto):
1. ✅ **Fix feedback modal evento** - El usuario lo reportó como problema activo
   - Aplicar el fix documentado en SOLUCION-FEEDBACK-FRECUENCIA.md
   - Testing: Verificar que no aparece antes de 7 días

### Prioridad MEDIA (cuando haya tiempo):
2. **SKU Torta Temática** - Reemplazar XXX con ID real
3. **Push notifications estados-auto** - Implementar o documentar como feature futura

### Prioridad BAJA (opcional):
4. Constantes para strings mágicos
5. Mensajes de validación centralizados
6. Resolver TODOs menores de documentación

---

## 📊 Estado del Proyecto

**Salud general:** ✅ Excelente
- Bugs críticos: 0
- Código refactorizado: 100% endpoints admin
- Template: Listo para reutilizar
- Documentación: Completa

**Deuda técnica:** ⚠️ Baja
- 1 fix medio pendiente (feedback evento)
- 15 TODOs documentados (no críticos)
- Mejoras de código opcionales

**Siguiente sesión sugerida:**
1. Implementar fix feedback evento (30 min)
2. Resolver SKU torta temática (10 min)
3. Testing completo en iOS (20 min)

---

**Última actualización:** 2026-03-19
**Documentos relacionados:**
- [`AUDITORIA-CODIGO-MEJORAS.md`](AUDITORIA-CODIGO-MEJORAS.md)
- [`SOLUCION-FEEDBACK-FRECUENCIA.md`](SOLUCION-FEEDBACK-FRECUENCIA.md)
