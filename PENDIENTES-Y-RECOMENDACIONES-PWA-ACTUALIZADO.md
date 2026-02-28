# 📱 Pendientes y Recomendaciones PWA - ACTUALIZADO

**Fecha:** 27 de Febrero 2026  
**Revisión de:** Documentación completa del proyecto

---

## ✅ YA IMPLEMENTADO (Confirmado)

### Core Funcionalidad
- ✅ **Sistema de Sesiones de Mesa con UI Visual** (Feb 13, 2026)
  - Vista del salón con mesas (verde/rojo)
  - Modal de mesa con beneficios
  - Auto-liberación con cron job
  - Archivos: [`VistaSalon.tsx`](src/app/local/components/VistaSalon.tsx), [`MesaModal.tsx`](src/app/local/components/MesaModal.tsx)

- ✅ **Sistema de Pedidos Staff** (Feb 21, 2026)
  - Tomar pedidos para clientes sin cuenta
  - Modo staff en catálogo de tortas
  - Integración con WooCommerce
  - Archivo: [`/local/tomar-pedido/page.tsx`](src/app/local/tomar-pedido/page.tsx)

- ✅ **Panel Admin de Beneficios**
  - CRUD completo de beneficios
  - Asignación a niveles
  - Archivos: [`/admin/beneficios/page.tsx`](src/app/admin/beneficios/page.tsx)

- ✅ **Sistema de Logros Automáticos**
  - Evaluación automática después de eventos
  - 13 tipos de logros configurados
  - Archivo: [`src/lib/logros.ts`](src/lib/logros.ts)

### PWA
- ✅ **PWA Instalable**
  - Service Worker configurado
  - Manifest.json dual (clientes + staff)
  - Auto-actualización con banner
  - Archivos: [`sw.js`](public/sw.js), [`UpdateNotification.tsx`](src/components/UpdateNotification.tsx)

- ✅ **Instalación Dual**
  - App para clientes (Coques Bakery - azul)
  - App para staff (Coques Staff - violeta)
  - Scopes separados funcionando

- ✅ **Prompt de Instalación para Clientes** (28 de Febrero 2026)
  - Banner bottom con instrucciones iOS/Android
  - Captura evento beforeinstallprompt
  - Dismissible con localStorage (24 horas)
  - Integrado en layout principal
  - Archivo: [`InstallPrompt.tsx`](src/components/InstallPrompt.tsx)

## 🔴 PENDIENTES DE ALTA PRIORIDAD

### 1. Sistema de Presupuestos para Clientes
**Estado:** Backend existe ✅ | Frontend para STAFF existe ✅ | Frontend para CLIENTE 0% ❌
**Esfuerzo:** 3-4 horas
**Impacto:** 🔥 ALTO - Funcionalidad incompleta

**Situación actual:**
- ✅ Botón "Guardar como Presupuesto" en [`/carrito`](src/app/carrito/page.tsx) **funciona**
- ✅ Al guardar, genera código único (ej: PRE-12ABC34-5DEF67)
- ✅ Modal muestra el código generado
- ✅ Staff puede ver presupuestos en [`/local/presupuestos`](src/app/local/presupuestos/page.tsx)
- ❌ **Cliente NO tiene forma de acceder a sus presupuestos guardados**
- ❌ El modal solo tiene botón "Ver presupuesto" que va a `/local/presupuestos/CODIGO` (solo para staff)

**Problema:**
Un cliente guarda un presupuesto pero no puede volver a accederlo después. Solo puede consultarlo si staff le pasa el link directo.

**Solución - Páginas a crear:**

#### A) `/presupuestos` - Lista de Presupuestos del Cliente
**Funcionalidad:**
- Mostrar todos los presupuestos del cliente logueado
- Tabs para filtrar: "Pendientes" | "Completos" | "Confirmados"
- Card por cada presupuesto con:
  - Código
  - Estado (badge con color)
  - Fecha de creación
  - Total
  - Productos principales
  - Botón "Ver detalle"
- Botón flotante "+" para crear nuevo presupuesto (ir a `/tortas`)

**API necesaria:**
```typescript
GET /api/presupuestos?clienteId={id}
// Ya existe pero necesita filtro por cliente autenticado
```

---

#### B) `/presupuestos/[codigo]` - Ver Presupuesto (Vista Cliente)
**Funcionalidad:**
- Vista simplificada del presupuesto (más simple que la de staff)
- Mostrar:
  - Código y estado
  - Productos con add-ons
  - Total con descuentos
  - Fecha de creación
  - Fecha/hora de entrega (si está configurada)
  - Notas del cliente
- Si está PENDIENTE o COMPLETO:
  - Botón "Modificar" → Redirige a edición (ver punto C)
  - Botón "Cancelar presupuesto"
- Si está CONFIRMADO:
  - Mostrar número de pedido WooCommerce
  - Mensaje "Este presupuesto ya fue confirmado y se convirtió en pedido"

**Diferencia con vista de staff:**
- Cliente NO puede confirmar el presupuesto (solo staff)
- Cliente NO ve "notas internas"
- Vista más amigable, menos técnica

---

#### C) `/presupuestos/[codigo]/editar` - Editar Presupuesto (Cliente)
**Funcionalidad:**
- Permitir modificar datos del presupuesto
- Editable:
  - Fecha de entrega
  - Hora de entrega
  - Notas adicionales
  - ❌ NO editar productos (para eso debe crear nuevo presupuesto)
- Botón "Guardar cambios"
- Botón "Volver sin guardar"

**Alternativa:**
Si es muy complejo permitir edición, al menos permitir:
- Ver el presupuesto
- Botón "Crear nueva versión" que copia los productos al carrito

---

**Integración con navegación:**
- Agregar botón "📋 Presupuestos" en [`/pass`](src/app/pass/page.tsx)
- Agregar shortcut en manifest.json para clientes
- Badge con número de presupuestos pendientes

---

### 2. Frontend de Cliente - Otras Páginas Faltantes
**Esfuerzo:** 4-6 horas total  
**Estado:** Backend parcialmente listo | Frontend 0%

#### A) `/perfil` - Editar Perfil
**Falta crear:**
- Ver y editar nombre, email
- Cambiar contraseña
- Ingresar/actualizar fecha de cumpleaños
- Ver estadísticas (visitas totales, XP, nivel)

**API a crear:**
- `GET /api/perfil` - Obtener datos del perfil
- `PATCH /api/perfil` - Actualizar nombre, email, cumpleaños
- `POST /api/perfil/cambiar-password` - Cambiar contraseña

---

#### B) `/historial` - Historial de Visitas
**Falta crear:**
- Lista de todas las visitas con fecha/hora
- Filtros por local (cafetería/lavadero)
- Mostrar beneficios aplicados en cada visita
- Paginación si hay muchas visitas

**API a crear:**
- `GET /api/historial` - Obtener historial completo con filtros

---

#### C) `/logros` - Sistema de Gamificación
**Estado:** Backend existe ✅ | Frontend 0% ❌

**Falta crear:**
- Grid de logros obtenidos (con fecha)
- Logros disponibles próximos a obtener
- Barra de progreso de XP
- Badge "NUEVO" en logros no vistos
- Animación al obtener logro nuevo

**API necesaria:**
- `GET /api/logros` - Listar logros obtenidos y disponibles
- `PATCH /api/logros/marcar-vistos` - Marcar logros como vistos

**Ya existe:** 13 logros configurados en BD, evaluación automática funcionando

---

### 2. Sistema de Referidos - UI
**Estado:** Backend 90% ✅ | Frontend 0% ❌  
**Esfuerzo:** 2-3 horas  
**Impacto:** 🔥 MUY ALTO - Crecimiento viral

**Falta implementar:**
- Sección en [`/pass`](src/app/pass/page.tsx) con código de referido
- Botón "Compartir" que abra WhatsApp con mensaje pre-llenado
- Lista de amigos referidos (nombre, fecha de activación)
- Contador visual "X/2 para subir de nivel"
- Badge cuando alcanza objetivo

**Backend ya listo:**
- ✅ Códigos únicos generados (`codigoReferido`)
- ✅ Campo `referidoPorId` en tabla Cliente
- ✅ Contador `referidosActivados`
- ✅ API `/api/referidos` funcionando

**Texto sugerido para WhatsApp:**
```
¡Unite a Coques Bakery! 🥤☕

Usá mi código {CODIGO} al registrarte y obtené beneficios exclusivos:
✅ Agua gratis con tu almuerzo
✅ Descuentos en cafetería
✅ Acumula puntos

Registrate acá: https://coques.com?ref={CODIGO}
```

---

### 3. Recuperación de Contraseña
**Estado:** No implementado ❌  
**Esfuerzo:** 3-4 horas  
**Impacto:** 🔥 ALTO - Reducir fricción

**Falta implementar:**

#### A) `/recuperar-password` - Solicitar Reset
- Input de email
- Botón "Enviar enlace de recuperación"
- Mensaje de confirmación

#### B) `/reset-password/[token]` - Cambiar Password
- Validar token de URL
- Input de nueva contraseña
- Confirmar nueva contraseña
- Actualizar password

#### C) APIs
- `POST /api/auth/recuperar-password`
  - Recibe email
  - Genera token único con expiración
  - Envía email con link usando Resend
  
- `POST /api/auth/reset-password`
  - Valida token
  - Verifica que no haya expirado
  - Actualiza password con bcrypt

**Campos ya existen en BD:**
- ✅ `resetPasswordToken` (String)
- ✅ `resetPasswordExpires` (DateTime)

**Requiere configurar:**
- Cuenta de [Resend](https://resend.com) (gratis hasta 3000 emails/mes)
- Variable de entorno: `RESEND_API_KEY`
- Instalar: `npm install resend`

---

### 4. Modales de UX

#### A) Modal de Feedback Post-Visita
**Estado:** Backend existe ✅ | Modal 0% ❌  
**Esfuerzo:** 2 horas  
**Impacto:** 🔥 ALTO - Reputación online

**Falta implementar:**
- Modal que aparece después de 10-15 minutos del escaneo
- Selector de estrellas (1-5) con animación
- Si ≥4 estrellas: Botón "Dejar reseña en Google Maps"
- Si ≤3 estrellas: Campo "¿Qué podemos mejorar?"
- Timer en localStorage para control

**Backend ya listo:**
- ✅ API `/api/feedback` (POST, GET, PATCH)
- ✅ Otorga logro "Crítico Positivo" automáticamente
- ✅ Link de Google Maps: https://maps.app.goo.gl/n6q5HNELZuwDyT556

**Trigger sugerido:**
```typescript
// Guardar en localStorage después de escaneo
localStorage.setItem('ultimo_escaneo', Date.now())

// Verificar cada minuto si pasaron 10 minutos
useEffect(() => {
  const interval = setInterval(() => {
    const ultimo = localStorage.getItem('ultimo_escaneo')
    if (ultimo && Date.now() - parseInt(ultimo) > 10 * 60 * 1000) {
      setMostrarFeedback(true)
      localStorage.removeItem('ultimo_escaneo')
    }
  }, 60000)
  return () => clearInterval(interval)
}, [])
```

---

#### B) Modal de Cumpleaños
**Estado:** Campo existe ✅ | Modal 0% ❌  
**Esfuerzo:** 1.5 horas  
**Impacto:** MEDIO - Personalización

**Falta implementar:**
- Modal que aparece UNA VEZ después del registro
- Título: "🎂 ¿Cuándo es tu cumpleaños?"
- Selector de fecha (solo día y mes)
- Texto explicativo: "Obtené 20% OFF en tortas durante tu semana de cumpleaños"
- Botón "Guardar" y "Ahora no" (recordar después)

**Backend ya listo:**
- ✅ Campo `fechaCumpleanos` en tabla Cliente
- ✅ Lógica de descuento ya configurada para nivel Oro

**Control de aparición:**
```typescript
// Mostrar solo si:
// 1. fechaCumpleanos es null
// 2. No hay flag en localStorage 'birthday_modal_skipped'
```

---

## 🟡 PENDIENTES DE MEDIA PRIORIDAD

### 5. Migraciones Pendientes
**Esfuerzo:** 5 minutos  
**Impacto:** CRÍTICO para nuevas funcionalidades

**Ejecutar:**
```bash
cd fidelizacion-zona
npx prisma migrate deploy
```

**Migración pendiente:**
- `20260213_add_nuevas_funcionalidades` - Agrega campos de referidos, cumpleaños, feedback, logros

**Alternativa:** Ejecutar SQL manual en Neon SQL Editor

---

### 6. Edición de Productos en Carrito
**Estado:** Hook listo ✅ | UI 0% ❌  
**Esfuerzo:** 2-3 horas  
**Documentación:** [`PENDIENTE-EDICION-CARRITO.md`](PENDIENTE-EDICION-CARRITO.md)

**Falta implementar:**
- Hacer productos del carrito clickeables
- Modal de edición con add-ons y campos de texto
- Recalcular precio al guardar cambios
- Función para recargar datos del producto desde WooCommerce

**Workaround temporal:** Eliminar producto y volver a agregarlo (funciona pero no es óptimo)

---

## 💡 RECOMENDACIONES NUEVAS PARA PWA

### **Nivel 1: Máximo Impacto (Recomendado fuertemente)**

#### 1. Notificaciones Push 🔔
**Esfuerzo:** 3-4 horas | **Impacto:** ⭐⭐⭐⭐⭐ MUY ALTO

**Qué notificar:**
- 🚗 "Tu auto está listo en el lavadero"
- 🎉 "¡Felicitaciones! Subiste a nivel Plata"
- 🎁 "Tenés un beneficio nuevo disponible"
- ⏰ "Tu beneficio vence hoy, aprovechalo"
- 📅 "Evento especial: Noche de Jazz este viernes"
- 🎂 "¡Es tu semana de cumpleaños! 20% OFF en tortas"

**Implementación:**
1. Configurar Firebase Cloud Messaging (gratis)
2. Pedir permiso al usuario después de 2da visita
3. Guardar token push en `Cliente.pushSub` (campo ya existe)
4. Desde backend: `npm install web-push`
5. Enviar notificaciones en eventos clave

**Ventajas:**
- ✅ Aumenta retención 3-5x
- ✅ Re-engagement automático
- ✅ Gratis (no requiere app nativa)
- ✅ Funciona perfecto en Android
- ⚠️ iOS: limitado pero mejorando cada año

**Ejemplo de uso:**
```typescript
// En /api/eventos cuando auto está listo
if (evento.tipo === 'AUTO_LISTO') {
  await enviarNotificationPush(cliente.pushSub, {
    title: '🚗 Tu auto está listo',
    body: 'Podés retirarlo cuando quieras',
    url: '/pass'
  })
}
```

---

#### 2. Banner de Instalación Proactivo ✅
**Estado:** ✅ IMPLEMENTADO (28 de Febrero 2026)
**Archivo:** [`InstallPrompt.tsx`](src/components/InstallPrompt.tsx)

**Funcionalidades implementadas:**
- ✅ Banner gradient bottom con diseño atractivo
- ✅ Captura evento `beforeinstallprompt` (Android/Chrome)
- ✅ Instrucciones manuales para iOS Safari
- ✅ Detección si ya está instalado (standalone mode)
- ✅ Dismissible con localStorage (no se muestra por 24 horas)
- ✅ Aparece después de 3 segundos de carga
- ✅ Integrado en [`layout.tsx`](src/app/layout.tsx) para todos los clientes

**Mejoras futuras sugeridas:**
- Triggers más inteligentes basados en nivel del usuario
- Contador de dismissals para re-mostrar después de X días
- A/B testing del copy del banner

---

#### 3. Web Share API para Referidos 📲
**Esfuerzo:** 1 hora | **Impacto:** ⭐⭐⭐⭐ ALTO

**Uso:** Botón de compartir que abre el menú nativo del sistema

**Implementación:**
```typescript
async function compartirCodigo() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Unite a Coques Bakery',
        text: `Usá mi código ${codigoReferido} y obtené beneficios exclusivos`,
        url: `https://coques.com/?ref=${codigoReferido}`
      })
      
      // Analytics
      gtag('event', 'share', { method: 'native_share' })
    } catch (err) {
      // Usuario canceló
    }
  } else {
    // Fallback: copiar al portapapeles
    navigator.clipboard.writeText(`https://coques.com/?ref=${codigoReferido}`)
    alert('¡Enlace copiado!')
  }
}
```

**Ventajas:**
- ✅ Abre WhatsApp, Instagram, Telegram, etc.
- ✅ UX nativa del sistema
- ✅ Más fácil que copiar/pegar
- ✅ Tracking de shares en analytics

**Soporte:** Chrome/Edge Android ✅ | Safari iOS ✅ | Desktop Chrome ✅

---

### **Nivel 2: UX Mejorada**

#### 4. Modo Offline Mejorado 📡
**Esfuerzo:** 3 horas | **Impacto:** ⭐⭐⭐ MEDIO

**Mejoras al Service Worker actual:**

1. **Cachear más rutas estratégicamente:**
   ```javascript
   const URLS_CRITICAS = [
     '/pass',         // QR del cliente
     '/perfil',       // Datos del usuario
     '/historial',    // Últimas visitas
     '/logros',       // Gamificación
   ]
   ```

2. **Queue de acciones offline:**
   - Guardar beneficios canjeados en IndexedDB
   - Sincronizar cuando vuelve conexión
   - Usar Background Sync API

3. **Página offline personalizada:**
   ```
   ╔═══════════════════════════════╗
   ║  📡 Sin conexión              ║
   ║                               ║
   ║  No te preocupes, tu QR      ║
   ║  sigue funcionando:           ║
   ║                               ║
   ║  [QR Code desde cache]       ║
   ║                               ║
   ║  Últimas visitas:            ║
   ║  • 25/02 - Cafetería         ║
   ║  • 20/02 - Lavadero          ║
   ║                               ║
   ║  Se sincronizará cuando      ║
   ║  vuelva la conexión          ║
   ╚═══════════════════════════════╝
   ```

**Ventajas:**
- ✅ App usable sin internet
- ✅ QR siempre disponible
- ✅ Mejor experiencia en zonas con mala señal

---

#### 5. App Badges 🔴
**Esfuerzo:** 1.5 horas | **Impacto:** ⭐⭐⭐ MEDIO

**Concepto:** Mostrar número en el ícono de la PWA instalada

**Ejemplos de uso:**
- Badge "1" = Un logro nuevo sin ver
- Badge "2" = Dos beneficios disponibles hoy
- Badge "!" = Pedido de torta listo para retirar

**Implementación:**
```typescript
// Actualizar badge cuando hay logros nuevos
if ('setAppBadge' in navigator) {
  const logrosNuevos = await fetch('/api/logros/no-vistos').then(r => r.json())
  if (logrosNuevos.count > 0) {
    navigator.setAppBadge(logrosNuevos.count)
  } else {
    navigator.clearAppBadge()
  }
}
```

**Ventajas:**
- ✅ Llamada de atención visual
- ✅ Aumenta re-engagement
- ✅ Funciona incluso con app cerrada

**Soporte:** Chrome/Edge Android ✅ | iOS Safari ❌ (por ahora)

---

### **Nivel 3: Analytics y Optimización**

#### 6. Analytics de PWA 📊
**Esfuerzo:** 2 horas | **Impacto:** ⭐⭐⭐⭐ ESTRATÉGICO

**Métricas a trackear:**

**Instalación:**
```typescript
gtag('event', 'pwa_installed', {
  platform: navigator.userAgent,
  source: 'install_prompt',
  nivel_cliente: cliente.nivel.nombre
})
```

**Uso:**
```typescript
gtag('event', 'pwa_session_start', {
  is_standalone: window.matchMedia('(display-mode: standalone)').matches,
  referrer: document.referrer
})
```

**Engagement:**
```typescript
gtag('event', 'notification_permission', {
  permission: Notification.permission,
  nivel: cliente.nivel.nombre
})
```

**Beneficios:**
- ✅ Entender comportamiento de usuarios PWA vs web
- ✅ Optimizar prompts de instalación
- ✅ Medir ROI de notificaciones push
- ✅ Detectar problemas de UX

---

#### 7. Performance Monitoring
**Esfuerzo:** 2 horas | **Impacto:** ⭐⭐⭐ MEDIO

**Core Web Vitals:**
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

**Implementar:**
```typescript
import { getCLS, getFID, getLCP } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getLCP(console.log)
```

**Enviar a analytics:**
```typescript
function sendToAnalytics({ name, delta, id }) {
  gtag('event', name, {
    value: Math.round(name === 'CLS' ? delta * 1000 : delta),
    metric_id: id,
  })
}
```

---

### **Nivel 4: Features Avanzadas (Futuro)**

#### 8. Share Target API 🎯
**Esfuerzo:** 2-3 horas | **Impacto:** ⭐⭐⭐⭐ INNOVADOR

**Concepto:** Que tu PWA aparezca en el menú "Compartir" del sistema

**Caso de uso:**
1. Cliente ve foto de torta en Instagram
2. Toca "Compartir" → Aparece "Coques Bakery"
3. App recibe la imagen
4. Autocompleta formulario de presupuesto con la imagen adjunta

**Implementación en manifest:**
```json
{
  "share_target": {
    "action": "/tortas/nuevo-pedido",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "description",
      "files": [{
        "name": "imagen",
        "accept": ["image/*"]
      }]
    }
  }
}
```

**Ventajas:**
- ✅ UX innovadora y diferenciadora
- ✅ Reduce fricción para pedir tortas personalizadas
- ✅ Integración profunda con el sistema

**Soporte:** Chrome/Edge Android ✅ | iOS Safari ❌

---

## 📋 PRIORIZACIÓN RECOMENDADA

### Sprint 1: Frontend Cliente Core (1-1.5 semanas)
1. ✅ **Sistema de Presupuestos para Clientes** (URGENTE - 3-4h)
   - `/presupuestos` - Lista de presupuestos
   - `/presupuestos/[codigo]` - Ver presupuesto
   - `/presupuestos/[codigo]/editar` - Editar presupuesto
2. ✅ `/perfil` - Editar perfil
3. ✅ `/historial` - Historial de visitas
4. ✅ `/logros` - Ver logros con badges
5. ✅ Sistema de Referidos UI en `/pass`

**Resultado:** Cliente tiene acceso completo a presupuestos y puede ver su progreso

---

### Sprint 2: UX y Recuperación (4-5 días)
6. ✅ Recuperación de contraseña (ambas páginas + emails)
7. ✅ Modal de Feedback post-visita
8. ✅ Modal de Cumpleaños
9. ✅ Edición de productos en carrito

**Resultado:** UX completa sin fricciones

---

### Sprint 3: PWA Engagement (3-4 días)
10. ✅ Notificaciones Push (setup completo)
11. ✅ Banner de Instalación Proactivo
12. ✅ Web Share API para Referidos
13. ✅ Modo Offline Mejorado
14. ✅ App Badges

**Resultado:** PWA de nivel profesional con engagement alto

---

### Sprint 4: Analytics y Optimización (2-3 días)
15. ✅ Analytics de PWA completo
16. ✅ Performance Monitoring
17. ✅ Testing completo en dispositivos reales
18. ✅ Documentación de usuario final

**Resultado:** PWA optimizada y medible

---

## 🎯 Quick Wins (Implementar YA)

| Feature | Esfuerzo | Impacto | ROI |
|---------|----------|---------|-----|
| **Presupuestos para Clientes** | 3-4h | Muy Alto | ⭐⭐⭐⭐⭐ |
| **Web Share API** | 1h | Alto | ⭐⭐⭐⭐⭐ |
| **Banner Instalación** | 2h | Muy Alto | ⭐⭐⭐⭐⭐ |
| **Modal Cumpleaños** | 1.5h | Medio | ⭐⭐⭐⭐ |
| **Sistema Referidos UI** | 2h | Muy Alto | ⭐⭐⭐⭐⭐ |
| **App Badges** | 1.5h | Medio | ⭐⭐⭐⭐ |

**Total: 11-12 horas para ganar features de máximo impacto**

---

## 📊 Comparación: Hoy vs Con Todas las Mejoras

### PWA Actual (Hoy)
- ✅ Instalable
- ✅ Offline básico
- ✅ Auto-actualización
- ✅ Dual install (clientes/staff)
- ❌ Sin notificaciones
- ❌ Sin promoción de instalación
- ❌ Offline limitado
- ❌ Sin analytics específico

**Score:** 75/100 ⭐⭐⭐⭐

---

### PWA Mejorada (Con todas las implementaciones)
- ✅ Instalable + Banner proactivo
- ✅ Offline completo con sync
- ✅ Auto-actualización inteligente
- ✅ Dual install optimizada
- ✅ Push notifications estratégicas
- ✅ Web Share API
- ✅ App badges dinámicos
- ✅ Analytics completo
- ✅ Performance monitoreada
- ✅ UX nativa avanzada

**Score:** 98/100 ⭐⭐⭐⭐⭐

---

## 💰 ROI Estimado

### Inversión de Tiempo
- **Presupuestos Cliente (URGENTE):** 3-4 horas
- **Frontend Cliente Restante:** 10-12 horas
- **PWA Engagement:** 8-10 horas
- **Analytics:** 4-5 horas
- **Total:** 25-31 horas (~3-4 días full-time)

### Retorno Esperado
- **Retención:** +300% (por notificaciones push)
- **Instalaciones:** +150% (por banner proactivo)
- **Viralidad:** +200% (por Web Share + referidos)
- **Engagement:** +250% (por badges y offline)
- **Reducción de soporte:** -40% (recuperación de password)

### ROI
**Cada hora invertida en PWA = 15-25 horas de valor en retención de usuarios**

---

## 🚀 Cómo Empezar Ahora

### Opción A: Arreglar Presupuestos (URGENTE - 3-4 horas)
```
"El sistema de presupuestos está incompleto. Los clientes pueden guardar presupuestos
desde /carrito pero NO pueden acceder a ellos después. Necesito implementar:

1. Página /presupuestos - Lista de presupuestos del cliente logueado
2. Página /presupuestos/[codigo] - Ver detalle del presupuesto (vista cliente)
3. Página /presupuestos/[codigo]/editar - Editar presupuesto (o al menos modificar fecha/notas)
4. Botón 'Presupuestos' en /pass para acceder
5. Actualizar modal del carrito para que el botón 'Ver presupuesto' lleve a /presupuestos/CODIGO

Backend ya existe. Solo falta frontend para clientes."
```

### Opción B: Quick Wins (9-10 horas)
```
"Implementá los 5 Quick Wins pendientes del documento PENDIENTES-Y-RECOMENDACIONES-PWA-ACTUALIZADO.md:
1. Sistema de Presupuestos para Clientes (3-4h) - URGENTE
2. Web Share API para referidos (1h)
3. Modal de cumpleaños (1.5h)
4. Sistema de referidos UI en /pass (2h)
5. App badges para notificaciones (1.5h)

Nota: Banner de instalación YA ESTÁ IMPLEMENTADO ✅"
```

### Opción C: Sprint Completo 1 (1-1.5 semanas)
```
"Implementá Sprint 1 completo del documento PENDIENTES-Y-RECOMENDACIONES-PWA-ACTUALIZADO.md:
Sistema de Presupuestos para clientes + páginas /perfil, /historial, /logros y sistema de referidos UI"
```

### Opción C: Solo Notificaciones Push (4 horas)
```
"Implementá notificaciones push completas según PENDIENTES-Y-RECOMENDACIONES-PWA-ACTUALIZADO.md,
incluyendo Firebase setup, permisos, y notificaciones para auto listo y cambios de nivel"
```

---

## ⚡ Configuraciones Requeridas

### Para Notificaciones Push
1. Cuenta de Firebase (gratis)
2. Configurar Firebase Cloud Messaging
3. Agregar credentials en Vercel

### Para Emails (Recuperación)
1. Cuenta de Resend (gratis hasta 3000/mes)
2. Verificar dominio
3. Variable: `RESEND_API_KEY`
4. Instalar: `npm install resend`

### Para Analytics
1. Google Analytics 4 property
2. GA_MEASUREMENT_ID en variables de entorno
3. Instalar: `npm install web-vitals`

---

**Última actualización:** 27 de febrero de 2026  
**Próxima revisión:** Después de completar Sprint 1  
**Documentos relacionados:** NUEVAS-FUNCIONALIDADES-RESUMEN.md, IMPLEMENTACION-SESIONES-MESAS.md, ESTADO-PEDIDOS-STAFF.md
