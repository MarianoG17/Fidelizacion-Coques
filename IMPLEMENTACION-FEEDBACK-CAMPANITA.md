# Implementación de Feedback por Notificaciones In-App (Campanita)

## Resumen
Sistema completo de solicitud de feedback mediante notificaciones in-app que aparecen en el ícono de campanita, reemplazando el sistema de modal automático.

## Flujo Completo

### 1. Cliente visita el local
- Empleado escanea QR del cliente en `/local`
- Se registra un evento VISITA en la base de datos

### 2. Cliente abre su pass
- `/api/pass` consulta la última visita y devuelve `ultimaVisita` timestamp
- `src/app/pass/page.tsx` guarda el timestamp en `localStorage('ultimo_scan')`

### 3. Generación de notificación (después de 10 minutos)
- Cuando el cliente consulta notificaciones, se ejecuta `generarNotificacionesFeedbackPendientes()`
- La función verifica:
  - ✅ Feedback habilitado en configuración
  - ✅ Transcurrieron 10+ minutos desde la última visita
  - ✅ No han pasado más de 24 horas
  - ✅ Cliente no respondió feedback en los últimos X días (frecuencia mínima)
  - ✅ No existe notificación de feedback pendiente
- Si todas las condiciones se cumplen, crea una notificación:
  ```json
  {
    "tipo": "FEEDBACK_PENDIENTE",
    "titulo": "¿Cómo estuvo tu experiencia?",
    "cuerpo": "Contanos qué te pareció tu visita a Coques...",
    "icono": "📊"
  }
  ```

### 4. Notificación aparece en campanita
- El bell icon muestra el contador de notificaciones no leídas
- La notificación aparece con el ícono 📊 cuando el usuario abre el centro de notificaciones

### 5. Usuario hace click en la notificación
- `NotificationCenter` detecta que es tipo `FEEDBACK_PENDIENTE`
- Dispara un evento custom: `window.dispatchEvent(new CustomEvent('openFeedbackModal'))`
- Cierra el centro de notificaciones
- Marca la notificación como leída

### 6. Se abre el modal de feedback
- `FeedbackModal` escucha el evento `openFeedbackModal`
- Recupera el timestamp de `localStorage('ultimo_scan')`
- Muestra el modal con 5 estrellas para calificar
- Usuario califica y opcionalmente deja comentario
- Si califica ≥ configuración mínima, muestra opción de dejar reseña en Google Maps

### 7. Envío de feedback
- POST a `/api/feedback` con `calificacion`, `comentario` y `eventoScanId`
- Guarda el feedback en la base de datos
- Marca `localStorage('ultimo_feedback_timestamp')` para control de frecuencia
- Limpia `localStorage('ultimo_scan')`

## Archivos Modificados

### 1. `src/components/FeedbackModal.tsx`
**Cambios:**
- ✅ Agregado listener para evento `openFeedbackModal` (líneas 44-58)
- ✅ Corregido envío de datos a API (campos correctos: `eventoScanId` en lugar de `tipo`/`presupuestoId`)

**Código agregado:**
```typescript
// Listener para abrir desde notificaciones
useEffect(() => {
  function handleOpenFeedback() {
    console.log('[FEEDBACK] Abriendo modal desde notificación')
    const ultimoScan = localStorage.getItem('ultimo_scan')
    if (ultimoScan) {
      setTrigger({
        type: 'VISITA_FISICA',
        timestamp: parseInt(ultimoScan)
      })
      setShow(true)
      localStorage.setItem('feedback_scan_visto', 'true')
    }
  }

  window.addEventListener('openFeedbackModal', handleOpenFeedback)
  return () => window.removeEventListener('openFeedbackModal', handleOpenFeedback)
}, [])
```

### 2. `src/components/NotificationCenter.tsx`
**Cambios:**
- ✅ Modificada función `handleNotificacionClick` para detectar tipo `FEEDBACK_PENDIENTE`
- ✅ Dispara evento custom en lugar de callback
- ✅ Removida prop `onOpenFeedback` (no necesaria con eventos custom)
- ✅ Ya tenía icono 📊 para tipo `FEEDBACK_PENDIENTE`

**Código modificado:**
```typescript
function handleNotificacionClick(notif: Notificacion) {
  // Marcar como leída
  if (!notif.leida) {
    marcarComoLeida(notif.id)
  }

  // Si es feedback pendiente, disparar evento para abrir modal
  if (notif.tipo === 'FEEDBACK_PENDIENTE') {
    console.log('[NOTIF] Disparando evento openFeedbackModal')
    window.dispatchEvent(new CustomEvent('openFeedbackModal'))
    onClose()
    return
  }

  // Si tiene URL, navegar
  if (notif.url) {
    router.push(notif.url)
    onClose()
  }
}
```

### 3. `src/app/api/notificaciones/route.ts`
**Estado:** ✅ Ya implementado
- Ya tiene función `generarNotificacionesFeedbackPendientes()` (líneas 8-118)
- Ya se llama en GET endpoint (línea 141)

**Lógica de generación:**
```typescript
async function generarNotificacionesFeedbackPendientes(clienteId: string) {
  // 1. Obtener configuración
  const config = await prisma.configuracionApp.findFirst()
  if (!config?.feedbackHabilitado) return

  // 2. Buscar última visita
  const ultimaVisita = await prisma.eventoScan.findFirst({
    where: { clienteId, tipoEvento: 'VISITA' },
    orderBy: { timestamp: 'desc' }
  })
  
  if (!ultimaVisita) return

  // 3. Verificar ventana de tiempo (10 min - 24 horas)
  const tiempoTranscurrido = Date.now() - ultimaVisita.timestamp.getTime()
  const tiempoMinimo = config.feedbackTiempoVisitaMinutos * 60 * 1000
  const tiempoMaximo = 24 * 60 * 60 * 1000
  
  if (tiempoTranscurrido < tiempoMinimo || tiempoTranscurrido > tiempoMaximo) {
    return
  }

  // 4. Verificar si ya respondió feedback recientemente
  const ultimoFeedback = await prisma.feedback.findFirst({
    where: { clienteId },
    orderBy: { creadoEn: 'desc' }
  })
  
  if (ultimoFeedback) {
    const diasDesde = (Date.now() - ultimoFeedback.creadoEn.getTime()) / (1000*60*60*24)
    if (diasDesde < config.feedbackFrecuenciaDias) return
  }

  // 5. Verificar si ya existe notificación pendiente
  const notifExistente = await prisma.notificacion.findFirst({
    where: {
      clienteId,
      tipo: 'FEEDBACK_PENDIENTE',
      leida: false,
      creadoEn: { gte: new Date(Date.now() - 24*60*60*1000) }
    }
  })
  
  if (notifExistente) return

  // 6. Crear notificación
  await prisma.notificacion.create({
    data: {
      clienteId,
      titulo: '¿Cómo estuvo tu experiencia?',
      cuerpo: 'Contanos qué te pareció tu visita a Coques...',
      icono: '📊',
      tipo: 'FEEDBACK_PENDIENTE',
      url: null,
      metadata: { visitaId: ultimaVisita.id }
    }
  })
}
```

### 4. `src/app/api/pass/route.ts`
**Estado:** ✅ Ya implementado
- Consulta `ultimaVisita` timestamp (líneas 54-66)
- Lo incluye en respuesta (línea 114)

### 5. `src/app/pass/page.tsx`
**Estado:** ✅ Ya implementado
- Guarda timestamp en localStorage cuando detecta nueva visita (líneas 88-98)

### 6. `src/app/admin/feedback/page.tsx`
**Estado:** ✅ Ya creado
- Página completa para visualizar feedbacks recibidos
- Estadísticas: total, promedio, distribución positivos/neutros/negativos
- Filtros por estrellas
- Lista con datos del cliente, comentario, fecha, estado Google Maps

### 7. `src/app/api/admin/feedback/route.ts`
**Estado:** ✅ Ya creado
- GET endpoint para admin
- Devuelve todos los feedbacks con datos de cliente y local

### 8. `src/app/admin/page.tsx`
**Estado:** ✅ Ya modificado
- Agregado tab "📊 Feedbacks" en el panel admin

## Configuración Requerida

Las siguientes configuraciones se obtienen de `ConfiguracionApp`:

| Campo | Descripción | Valor por defecto |
|-------|-------------|-------------------|
| `feedbackHabilitado` | Activar/desactivar sistema | `true` |
| `feedbackTiempoVisitaMinutos` | Minutos de espera después de visita | `10` |
| `feedbackFrecuenciaDias` | Días mínimos entre feedbacks | `7` |
| `feedbackMinEstrellas` | Estrellas mínimas para sugerir Google Maps | `4` |
| `googleMapsUrl` | URL para dejar reseña en Google | - |

## Ventajas vs Sistema Anterior

### Antes (Modal Automático)
- ❌ Modal se mostraba automáticamente si cumplía condiciones
- ❌ Podía interrumpir al usuario en medio de otra acción
- ❌ Requería polling cada minuto para detectar ventana de tiempo
- ❌ No había registro visible de la solicitud si el usuario cerraba el modal

### Ahora (Notificación In-App)
- ✅ Usuario tiene control: ve la notificación y decide cuándo responder
- ✅ No interrumpe: la notificación espera en la campanita
- ✅ Sin polling: se genera cuando el usuario consulta notificaciones
- ✅ Persistente: queda visible hasta que el usuario la marque como leída
- ✅ Experiencia menos intrusiva y más amigable
- ✅ Consistente con el resto del sistema de notificaciones

## Testing Local

Para probar el flujo completo:

1. **Configurar feedback:**
   - Asegurar que `feedbackHabilitado = true` en la DB
   - Ajustar `feedbackTiempoVisitaMinutos = 1` para testing rápido

2. **Simular visita:**
   - Ir a `/local`
   - Escanear QR de un cliente de prueba
   - El cliente abre `/pass` → se guarda timestamp en localStorage

3. **Esperar tiempo configurado:**
   - Esperar 1 minuto (o el tiempo configurado)

4. **Consultar notificaciones:**
   - Hacer click en campanita
   - Debería aparecer notificación "¿Cómo estuvo tu experiencia?" con 📊

5. **Abrir modal:**
   - Click en la notificación
   - Debería abrirse FeedbackModal con estrellas

6. **Calificar:**
   - Seleccionar estrellas (ej: 5)
   - Opcional: agregar comentario
   - Enviar
   - Si >= 4 estrellas, muestra botón para Google Maps

7. **Verificar en admin:**
   - Ir a `/admin`
   - Tab "📊 Feedbacks"
   - Debería aparecer el feedback recién creado

## Próximos Pasos

- [ ] Deploy a producción
- [ ] Monitorear logs para confirmar generación de notificaciones
- [ ] Ajustar tiempos si es necesario (`feedbackTiempoVisitaMinutos`, `feedbackFrecuenciaDias`)
- [ ] Considerar agregar notificaciones push nativas en el futuro (opcional)

## Notas Técnicas

### Por qué Custom Events en lugar de Props
- ✅ FeedbackModal está en el layout global, no tiene acceso directo a NotificationCenter
- ✅ Evita prop drilling a través de múltiples niveles
- ✅ Desacopla componentes: NotificationCenter no necesita conocer FeedbackModal
- ✅ Más mantenible y escalable

### localStorage Keys Usadas
- `ultimo_scan`: Timestamp de la última visita escaneada
- `feedback_scan_visto`: Flag para indicar que ya se mostró el feedback para ese scan
- `ultimo_feedback_timestamp`: Timestamp del último feedback enviado (control de frecuencia)

### Logs de Debugging
- `[PASS] Nuevo scan detectado: <fecha>` - Cuando se guarda nueva visita
- `[FEEDBACK] Verificando condiciones...` - En generación de notificación
- `[FEEDBACK] Creando notificación de feedback` - Cuando se crea la notificación
- `[NOTIF] Disparando evento openFeedbackModal` - Al hacer click en notificación
- `[FEEDBACK] Abriendo modal desde notificación` - Cuando se abre el modal

## Resumen de Cambios por Archivo

| Archivo | Status | Cambios |
|---------|--------|---------|
| `src/components/FeedbackModal.tsx` | ✅ Modificado | + Listener de evento custom, fix envío API |
| `src/components/NotificationCenter.tsx` | ✅ Modificado | + Dispatch de evento, - prop onOpenFeedback |
| `src/app/api/notificaciones/route.ts` | ✅ Creado anteriormente | Ya tiene generación de FEEDBACK_PENDIENTE |
| `src/app/api/pass/route.ts` | ✅ Modificado anteriormente | Ya devuelve ultimaVisita |
| `src/app/pass/page.tsx` | ✅ Modificado anteriormente | Ya guarda timestamp en localStorage |
| `src/app/admin/feedback/page.tsx` | ✅ Creado | Nueva página de visualización |
| `src/app/api/admin/feedback/route.ts` | ✅ Creado | Endpoint para admin |
| `src/app/admin/page.tsx` | ✅ Modificado | + Tab Feedbacks |

---

**Fecha de implementación:** 2026-03-01  
**Estado:** ✅ Completo y listo para deploy
