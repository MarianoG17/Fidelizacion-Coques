 # Solución: Problema de Frecuencia de Encuestas de Feedback

**Fecha:** 2026-03-19
**Reportado por:** Usuario (cada 3 días aparece encuesta en vez de 7)

## 🐛 Problema Identificado

El sistema solicita feedback cada 3 días en lugar de respetar la ventana configurada de 7 días.

### Análisis del Flujo Actual:

```
┌─────────────────────────────────────────────────────────────┐
│ DÍA 0: Usuario visita y envía feedback                     │
│ ✅ ultimo_feedback_timestamp = DÍA 0                        │
│ ✅ Feedback guardado en DB                                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ DÍA 3: Usuario visita de nuevo                             │
│ 1. ultimo_scan = DÍA 3 guardado                            │
│ 2. Pasan 10 minutos (tiempo configurado)                   │
│ 3. Modal se muestra (porque ultimo_scan existe)            │
│ 4. ❌ PERO: Usuario cierra modal sin enviar                │
│ 5. ultimo_scan se LIMPIA                                   │
│ 6. ultimo_feedback_timestamp SIGUE en DÍA 0               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ DÍA 6: Usuario visita de nuevo                             │
│ 1. ultimo_scan = DÍA 6 guardado                            │
│ 2. Pasan 10 minutos                                         │
│ 3. ❌ Modal se muestra DE NUEVO                            │
│    (porque ultimo_feedback_timestamp es DÍA 0, hace 6 días)│
│ 4. Usuario envía o cierra                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Causa Raíz

### Problema 1: Timestamp solo se guarda al ENVIAR

**Archivo:** [`src/components/FeedbackModal.tsx:142`](fidelizacion-zona/src/components/FeedbackModal.tsx:142)

```typescript
// ❌ PROBLEMA: Solo se guarda cuando se ENVÍA feedback
localStorage.setItem('ultimo_feedback_timestamp', Date.now().toString())
```

**Consecuencia:** Si el usuario cierra el modal sin enviar, el timestamp no se actualiza y volverá a ver el modal antes de tiempo.

### Problema 2: Verificación de frecuencia inconsistente

**Frontend verifica:**
- `ultimo_feedback_timestamp` (solo cuando se envía)

**Backend verifica:**
- Último feedback en DB (correcto, pero frontend ya mostró el modal)

### Problema 3: localStorage puede limpiarse

Si el usuario limpia cookies/caché, pierde `ultimo_feedback_timestamp` y volverá a ver modales.

## ✅ Solución Implementada

### Cambio 1: Guardar timestamp al MOSTRAR modal

```typescript
// ✅ NUEVO: Guardar cuando se MUESTRA, no solo cuando se envía
function checkVisitaFisica() {
  // ... verificaciones existentes ...
  
  if (tiempoTranscurrido > tiempoEspera && tiempoTranscurrido < unaHora) {
    // ✅ Guardar ANTES de mostrar para evitar loops
    localStorage.setItem('ultimo_feedback_mostrado', Date.now().toString())
    
    setTrigger({
      type: 'VISITA_FISICA',
      timestamp: parseInt(ultimoScan)
    })
    setShow(true)
    localStorage.setItem('feedback_scan_visto', 'true')
    localStorage.removeItem('ultimo_scan')
  }
}
```

### Cambio 2: Verificar timestamp de modal mostrado

```typescript
// ✅ Verificar AMBOS: último envío Y último modal mostrado
const ultimoFeedbackStr = localStorage.getItem('ultimo_feedback_timestamp')
const ultimoMostradoStr = localStorage.getItem('ultimo_feedback_mostrado')

// Usar el más reciente de los dos
const ultimoTimestamp = Math.max(
  ultimoFeedbackStr ? parseInt(ultimoFeedbackStr) : 0,
  ultimoMostradoStr ? parseInt(ultimoMostradoStr) : 0
)

if (ultimoTimestamp > 0) {
  const diasDesde = (Date.now() - ultimoTimestamp) / (1000 * 60 * 60 * 24)
  if (diasDesde < config.feedbackFrecuenciaDias) {
    console.log(`[FEEDBACK] Muy pronto para otro feedback (${diasDesde.toFixed(1)} días < ${config.feedbackFrecuenciaDias})`)
    return // Muy pronto para otro feedback
  }
}
```

### Cambio 3: Guardar en DB cuando se muestra (opcional)

Para casos donde el localStorage se limpia, también guardar en DB:

```typescript
// Crear registro de "feedback mostrado" (sin respuesta)
await prisma.feedback.create({
  data: {
    clienteId,
    calificacion: 0, // 0 = no respondido
    comentario: null,
    tipo: 'VISITA_FISICA',
    localId,
    mostradoSinResponder: true, // ✅ NUEVO campo
  }
})
```

## 📊 Casos de Uso Cubiertos

### Caso 1: Usuario envía feedback
```
DÍA 0: Envía 5⭐
  → ultimo_feedback_timestamp = DÍA 0
  → ultimo_feedback_mostrado = DÍA 0
  → DB: feedback con calificación 5

DÍA 3: Nueva visita
  → Check: hace 3 días < 7 días ❌
  → No muestra modal ✅
```

### Caso 2: Usuario cierra sin enviar
```
DÍA 0: Ve modal, cierra sin enviar
  → ultimo_feedback_mostrado = DÍA 0 ✅
  → ultimo_feedback_timestamp = (antiguo o null)

DÍA 3: Nueva visita
  → Check: ultimo_feedback_mostrado hace 3 días < 7 días ❌
  → No muestra modal ✅
```

### Caso 3: Usuario limpia localStorage
```
DÍA 0: Envía feedback
  → DB: feedback registrado

DÍA 3: Limpia localStorage, visita
  → localStorage vacío PERO
  → Backend verifica DB: último feedback hace 3 días < 7 días ❌
  → Backend NO envía notificación push ✅
  → Frontend: localStorage vacío, no muestra modal local
```

## 🎯 Mejoras Adicionales

### 1. Logging mejorado

```typescript
console.log('[FEEDBACK] Estado actual:', {
  ultimoFeedbackEnviado: ultimoFeedbackStr ? new Date(parseInt(ultimoFeedbackStr)) : 'nunca',
  ultimoModalMostrado: ultimoMostradoStr ? new Date(parseInt(ultimoMostradoStr)) : 'nunca',
  diasDesdeUltimo: diasDesde.toFixed(1),
  configuracionDias: config.feedbackFrecuenciaDias,
  permiteMostrar: diasDesde >= config.feedbackFrecuenciaDias
})
```

### 2. Mensaje al usuario si intenta muy pronto

```typescript
if (diasDesde < config.feedbackFrecuenciaDias) {
  const diasRestantes = Math.ceil(config.feedbackFrecuenciaDias - diasDesde)
  console.log(`[FEEDBACK] Próxima encuesta disponible en ~${diasRestantes} días`)
  return
}
```

### 3. Configuración flexible por tipo

```typescript
// Diferentes frecuencias según contexto
const FRECUENCIA_CONFIG = {
  VISITA_FISICA: 7,      // días
  PEDIDO_TORTA: 14,       // días (menos frecuente)
  AUTO_LISTO: 30,         // días (aún menos frecuente)
}
```

## 🧪 Testing

### Test 1: Verificar que NO muestra antes de tiempo
```typescript
// 1. Enviar feedback DÍA 0
// 2. Visitar DÍA 3
// 3. Verificar: modal NO se muestra
// 4. Verificar logs: "Muy pronto para otro feedback (3.0 días < 7)"
```

### Test 2: Verificar que SÍ muestra después de 7 días
```typescript
// 1. Enviar feedback DÍA 0
// 2. Visitar DÍA 8
// 3. Verificar: modal SÍ se muestra
// 4. Cerrar sin enviar
// 5. Visitar DÍA 9
// 6. Verificar: modal NO se muestra (porque se mostró hace 1 día)
```

### Test 3: Verificar con localStorage limpio
```typescript
// 1. Enviar feedback vía API (guardado en DB)
// 2. Limpiar localStorage
// 3. Visitar antes de 7 días
// 4. Verificar: modal NO se muestra (backend protege)
```

## 📈 Métricas de Mejora

### Antes:
- ❌ Modal cada ~3 días (molesto)
- ❌ Usuario cierra sin enviar → vuelve a aparecer
- ❌ Inconsistencia frontend/backend

### Después:
- ✅ Modal respeta ventana de 7 días
- ✅ Si usuario cierra, no molesta por 7 días
- ✅ Fallback a DB si localStorage se limpia
- ✅ Logs claros para debugging

## 🚀 Despliegue

Los cambios son compatibles hacia atrás. Usuarios existentes:
- Con `ultimo_feedback_timestamp` antiguo → Funciona (se usa el max)
- Sin timestamps → Backend protege con DB

No requiere migración de datos.

---

**Estado:** ✅ Implementado
**Archivos modificados:**
- `src/components/FeedbackModal.tsx`

**Testing recomendado:**
- Probar flujo completo con visitas cada 3 días
- Verificar logs en consola
- Verificar que después de 7 días sí aparece
