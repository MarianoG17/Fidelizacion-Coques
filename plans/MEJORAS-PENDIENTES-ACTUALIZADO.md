# 🎯 Mejoras Pendientes - Actualizado al 20 Marzo 2026

**Última revisión:** 20 de Marzo 2026, 10:15 AM ART  
**Estado:** Revisado contra código actual

---

## ✅ YA IMPLEMENTADO (Confirmado)

### 1. Middleware de Admin Auth
- ✅ **Archivo:** [`src/lib/middleware/admin-auth.ts`](../src/lib/middleware/admin-auth.ts)
- ✅ **Usado en:** 39 endpoints de API admin
- ✅ **Función:** `requireAdminAuth()` con documentación JSDoc
- ✅ **Beneficio:** Eliminado código duplicado en todos los endpoints admin

### 2. Páginas de Cliente - Core
- ✅ **`/perfil`** - Editar perfil completo
  - Ver/editar nombre, email, teléfono
  - Cambiar fecha de cumpleaños
  - Ver estadísticas (visitas, nivel, días como miembro)
  - Sistema de referidos integrado
  - Archivo: [`src/app/perfil/page.tsx`](../src/app/perfil/page.tsx)

- ✅ **`/historial`** - Historial de visitas y pedidos
  - Tabs para Visitas / Pedidos
  - Agrupado por mes
  - Muestra beneficios canjeados
  - Formato con timezone Argentina
  - Archivo: [`src/app/historial/page.tsx`](../src/app/historial/page.tsx)

- ✅ **`/logros`** - Sistema de gamificación
  - Grid de logros obtenidos
  - Próximos logros a desbloquear
  - Badge "NUEVO" en no vistos
  - Barra de progreso XP
  - Marca automáticamente como vistos
  - Archivo: [`src/app/logros/page.tsx`](../src/app/logros/page.tsx)

### 3. Recuperación de Contraseña
- ✅ **`/recuperar-password`** - Solicitar reset
  - Formulario de email
  - Mensaje de confirmación
  - Archivo: [`src/app/recuperar-password/page.tsx`](../src/app/recuperar-password/page.tsx)

- ✅ **`/reset-password/[token]`** - Cambiar password
  - Validación de token
  - Formulario nueva contraseña
  - Archivo: [`src/app/reset-password/[token]/page.tsx`](../src/app/reset-password/[token]/page.tsx)

### 4. Sistema de Presupuestos - Staff
- ✅ **`/local/presupuestos`** - Lista para staff
- ✅ **`/local/presupuestos/[codigo]`** - Ver/confirmar
- ✅ **`/local/presupuestos/[codigo]/editar`** - Editar

### 5. Navegación Bottom Bar
- ✅ Links a `/pass`, `/logros`, `/historial`, `/perfil`
- ✅ Implementado en todas las páginas principales

### 6. Timezone Fix
- ✅ Timestamps ahora muestran hora de Argentina correctamente
- ✅ Arreglado en métricas admin
- ✅ Arreglado en historial cliente

---

## 🔴 PENDIENTE CRÍTICO - Sistema de Presupuestos Cliente

### Problema
**Backend completo ✅** | **Staff UI completa ✅** | **Cliente UI 0% ❌**

El cliente puede GUARDAR presupuestos desde [`/carrito`](../src/app/carrito/page.tsx:259) pero **NO puede acceder a ellos después**. Es un feature crítico 50% implementado.

### Falta Implementar

#### 1. `/presupuestos` - Lista de Presupuestos del Cliente
**Esfuerzo:** 2 horas | **Prioridad:** 🔴 P0 URGENTE

```typescript
// Nueva página: src/app/presupuestos/page.tsx
// Similar a /local/presupuestos pero:
// - Filtrado automático por clienteId del token
// - UI más simple (sin opciones de staff)
// - Vista de cliente, no admin

Features necesarios:
- Tabs: Pendientes | Completos | Confirmados
- Cards con código, estado, total, fecha
- Badge con número de pendientes
- Botón "Ver detalle" → /presupuestos/[codigo]
```

#### 2. `/presupuestos/[codigo]` - Vista Cliente
**Esfuerzo:** 1.5 horas | **Prioridad:** 🔴 P0 URGENTE

```typescript
// Nueva página: src/app/presupuestos/[codigo]/page.tsx
// Vista CLIENTE (más simple que la de staff)

Mostrar:
- Código y estado (badge con color)
- Lista de productos con add-ons
- Total con descuentos
- Fechas de creación y entrega
- Notas del cliente

Acciones según estado:
if (PENDIENTE || COMPLETO):
  - Botón "Contactar para confirmar" (WhatsApp/Teléfono)
  - Botón "Cancelar presupuesto"
  
if (CONFIRMADO):
  - Mensaje: "Presupuesto confirmado"
  - Número de pedido WooCommerce
  - NO mostrar opciones de edición
```

#### 3. Navegación
**Esfuerzo:** 15 min

```typescript
// En /pass/page.tsx agregar:
<Link href="/presupuestos">
  <button className="...">
    📋 Mis Presupuestos
    {presupuestosPendientes > 0 && (
      <span className="badge">{presupuestosPendientes}</span>
    )}
  </button>
</Link>
```

#### 4. API Update
**Esfuerzo:** 30 min

```typescript
// Modificar: src/app/api/presupuestos/route.ts
// Para que:
// - Si viene header Authorization (cliente) → filtrar por clienteId
// - Si viene x-admin-key → mostrar todos (ya funciona)
```

**Total:** ~4 horas | **Impacto:** ⭐⭐⭐⭐⭐ CRÍTICO

---

## 🟡 QUICK WINS - Alto Impacto, Bajo Esfuerzo

### 1. Mensaje Bienvenida PRE_REGISTRADO
**Esfuerzo:** 15 min | **Archivo:** [`src/app/pass/page.tsx`](../src/app/pass/page.tsx)

**Estado actual:** Cliente ve "Nivel: Ninguno" sin explicación

**Agregar:**
```typescript
{pass.estado === 'PRE_REGISTRADO' && (
  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
    <div className="flex items-start gap-3">
      <span className="text-3xl">👋</span>
      <div>
        <h3 className="font-semibold text-blue-900 mb-1">
          ¡Bienvenido a Coques Bakery!
        </h3>
        <p className="text-sm text-blue-700">
          Mostrá este código QR en tu próxima visita para activar 
          tu cuenta y comenzar a acumular beneficios.
        </p>
      </div>
    </div>
  </div>
)}
```

---

### 2. Web Share API para Referidos
**Esfuerzo:** 45 min | **Archivo:** [`src/app/perfil/page.tsx`](../src/app/perfil/page.tsx)

**Estado actual:** Tiene función `handleShareReferralCode` básica (línea 187)

**Mejorar:**
```typescript
async function handleShareReferralCode() {
  if (!perfil?.codigoReferido) return
  
  const mensaje = `¡Unite a Coques Bakery! 🥤☕

Usá mi código ${perfil.codigoReferido} al registrarte y obtené:
✅ Agua gratis con tu almuerzo
✅ Descuentos en cafetería  
✅ Sistema de niveles con recompensas

Registrate: ${window.location.origin}/activar?ref=${perfil.codigoReferido}`

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Unite a Coques Bakery',
        text: mensaje,
        url: `${window.location.origin}/activar?ref=${perfil.codigoReferido}`
      })
      // Analytics
      gtag?.('event', 'share', { method: 'native_share' })
    } catch (err) {
      // Usuario canceló
    }
  } else {
    // Fallback: copiar
    navigator.clipboard.writeText(`${window.location.origin}/activar?ref=${perfil.codigoReferido}`)
    alert('¡Enlace copiado! Compartilo con tus amigos')
  }
}
```

---

### 3. Indicador Visual de OTP
**Esfuerzo:** 30 min | **Archivo:** [`src/app/pass/page.tsx`](../src/app/pass/page.tsx)

**Ubicación:** Debajo del código OTP (alrededor línea 500-600)

**Agregar:**
```typescript
<div className="mt-2 flex items-center justify-center gap-2 text-xs">
  <div className={`flex items-center gap-1 ${
    countdown < 10 ? 'text-red-500' : 'text-green-600'
  }`}>
    <span className={countdown < 10 ? 'animate-pulse' : ''}>
      {countdown < 10 ? '🔄' : '✓'}
    </span>
    <span>
      {countdown < 10 ? 'Actualizando...' : `Válido por ${countdown}s`}
    </span>
  </div>
</div>
```

---

### 4. Explicar Período de Visitas
**Esfuerzo:** 20 min | **Archivo:** [`src/app/pass/page.tsx`](../src/app/pass/page.tsx)

**Ubicación:** Sección de progreso de nivel

**Agregar tooltip o texto explicativo:**
```typescript
<p className="text-xs text-gray-500 mt-1">
  visitas en los últimos {desglose?.periodoDias || 30} días
</p>
<p className="text-xs text-gray-400 flex items-center gap-1">
  <span>💡</span>
  <span>Las visitas más antiguas se descuentan automáticamente</span>
</p>
```

---

### 5. Eliminar `normalizarTelefono` Duplicada
**Esfuerzo:** 10 min | **Archivo:** [`src/app/api/woocommerce/webhook/route.ts`](../src/app/api/woocommerce/webhook/route.ts)

**Acción:**
```typescript
// Línea ~1-5: Agregar import
import { normalizarTelefono } from '@/lib/phone'

// Líneas ~108-128: Eliminar función duplicada
// (ya existe en /lib/phone.ts)
```

---

## 🟢 FUNCIONALIDADES NUEVAS - Alto Valor

### 1. Notificaciones Push
**Esfuerzo:** 5-6 horas | **Impacto:** ⭐⭐⭐⭐⭐ MUY ALTO

**Estado:** Backend parcialmente listo (campo `pushSub` existe en Cliente)

**Falta:**
- Setup Firebase Cloud Messaging
- Componente `PushNotificationPrompt`
- Solicitar permiso después de 2da visita
- Enviar notificaciones en eventos clave:
  - Auto listo en lavadero
  - Cambio de nivel
  - Beneficios nuevos disponibles
  - Cumpleaños

**Casos de uso:**
```typescript
// En /api/estados-auto cuando auto listo
if (estado === 'LISTO' && cliente.pushToken) {
  await enviarNotificacionPush(cliente.pushToken, {
    title: '🚗 Tu auto está listo',
    body: 'Podés pasar a retirarlo',
    data: { url: '/pass' }
  })
}
```

**Retorno esperado:** Retención +300%

---

### 2. Modal de Feedback Post-Visita
**Esfuerzo:** 2-3 horas | **Impacto:** ⭐⭐⭐⭐⭐ MUY ALTO

**Estado:** Backend existe (API `/api/feedback`), falta UI

**Falta:**
- Componente `FeedbackModal` 
- Trigger: 10-15 min después de escanear QR
- Si ≥4 ⭐ → Redirigir a Google Maps
- Si ≤3 ⭐ → Campo de comentarios

**Implementación:**
```typescript
// Guardar timestamp al escanear
localStorage.setItem('ultimo_escaneo', Date.now())

// Verificar cada minuto
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

**Beneficio:** Mejora reputación online y obtiene feedback valioso

---

### 3. Sistema de Referidos - UI Completa en /pass
**Esfuerzo:** 2-3 horas | **Impacto:** ⭐⭐⭐⭐⭐ MUY ALTO

**Estado:** 
- Backend completo ✅
- UI en `/perfil` básica ✅
- **Falta:** Sección prominente en `/pass` con Web Share

**Agregar en [`/pass/page.tsx`](../src/app/pass/page.tsx):**
```typescript
<div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 mb-4">
  <h3 className="font-bold text-gray-800 mb-2">🎁 Invita amigos y gana</h3>
  
  {/* Código con botón compartir */}
  <div className="flex items-center gap-2 mb-3">
    <code className="flex-1 bg-white px-4 py-3 rounded-lg font-mono text-lg font-bold">
      {pass.codigoReferido}
    </code>
    <button onClick={compartirCodigo} className="bg-purple-600 text-white px-6 py-3 rounded-lg">
      📲 Compartir
    </button>
  </div>
  
  {/* Explicación beneficios */}
  <div className="grid grid-cols-2 gap-2">
    <div className="bg-purple-100 rounded-lg p-2">
      <p className="text-xs text-purple-600">Vos ganás:</p>
      <p className="text-sm font-bold">+1 visita</p>
    </div>
    <div className="bg-blue-100 rounded-lg p-2">
      <p className="text-xs text-blue-600">Tu amigo:</p>
      <p className="text-sm font-bold">Bienvenida</p>
    </div>
  </div>
  
  {/* Progreso y lista de referidos */}
  {pass.referidosActivados > 0 && (
    <div className="mt-3">
      <p className="text-sm">Referidos: <strong>{pass.referidosActivados}</strong></p>
      {/* Lista de amigos referidos */}
    </div>
  )}
</div>
```

**Beneficio:** Crecimiento viral 200-300%

---

## 🔵 OPTIMIZACIONES - Performance

### 1. Lazy Loading con Next.js Image
**Esfuerzo:** 1 hora | **Prioridad:** Media

**Reemplazar `<img>` por `<Image>` en:**
- [`/tortas/page.tsx`](../src/app/tortas/page.tsx) - Catálogo de productos
- Cualquier otro lugar con imágenes

```typescript
import Image from 'next/image'

<Image
  src={producto.imagen}
  alt={producto.nombre}
  width={300}
  height={300}
  loading="lazy"
  className="..."
/>
```

---

### 2. Cache con SWR
**Esfuerzo:** 2 horas | **Prioridad:** Media

**Instalar:**
```bash
npm install swr
```

**Crear hook personalizado:**
```typescript
// src/hooks/useBeneficiosDisponibles.ts
import useSWR from 'swr'

export function useBeneficiosDisponibles() {
  const { data, error, mutate } = useSWR(
    '/api/pass/beneficios-disponibles',
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      refreshInterval: 30000,
    }
  )
  
  return {
    beneficios: data?.data.disponibles || [],
    usados: data?.data.usados || [],
    loading: !error && !data,
    error,
    refresh: mutate
  }
}
```

---

## 🟣 PWA AVANZADO

### 1. App Badges
**Esfuerzo:** 1.5 horas | **Prioridad:** Media

**Implementar:**
```typescript
// Actualizar badge cuando hay logros nuevos
if ('setAppBadge' in navigator) {
  const logrosNuevos = await fetch('/api/logros/no-vistos')
    .then(r => r.json())
  
  if (logrosNuevos.count > 0) {
    navigator.setAppBadge(logrosNuevos.count)
  } else {
    navigator.clearAppBadge()
  }
}
```

**Soporte:** Chrome/Edge Android ✅ | iOS Safari ❌

---

### 2. Modo Offline Mejorado
**Esfuerzo:** 3 horas | **Prioridad:** Baja

**Mejorar [`public/sw.js`](../public/sw.js):**
- Cachear rutas críticas: `/pass`, `/perfil`, `/historial`, `/logros`
- Background Sync para acciones offline
- Página offline personalizada con QR cached

---

## 📊 RESUMEN DE PRIORIDADES

### 🔴 P0 - Implementar URGENTE (4-5 horas)
1. Sistema Presupuestos Cliente (4h)
2. Quick Wins Pack (1.5h)
   - Mensaje PRE_REGISTRADO (15min)
   - Web Share API (45min)
   - Indicador OTP (30min)

**Total:** ~5.5 horas | **ROI:** ⭐⭐⭐⭐⭐

---

### 🟡 P1 - Alta Prioridad (7-9 horas)
3. Notificaciones Push (5-6h)
4. Modal Feedback (2-3h)
5. Referidos UI en /pass (2-3h)

**Total:** ~9-12 horas | **ROI:** ⭐⭐⭐⭐⭐

---

### 🟢 P2 - Performance (3-4 horas)
6. Lazy Loading (1h)
7. Cache SWR (2h)
8. Code Splitting (1h)

**Total:** ~4 horas | **ROI:** ⭐⭐⭐⭐

---

### 🟣 P3 - PWA Pro (4-5 horas)
9. App Badges (1.5h)
10. Offline mejorado (3h)
11. Analytics PWA (2h)

**Total:** ~6.5 horas | **ROI:** ⭐⭐⭐

---

## ✅ PLAN DE ACCIÓN RECOMENDADO

### Esta Semana (Prioridad P0)
```
DÍA 1 (4 horas):
- Sistema Presupuestos Cliente completo
  └─ /presupuestos (2h)
  └─ /presupuestos/[codigo] (1.5h)
  └─ Navegación + API update (30min)

DÍA 2 (1.5 horas):
- Quick Wins
  └─ Mensaje PRE_REGISTRADO (15min)
  └─ Web Share API mejorada (45min)  
  └─ Indicador OTP (30min)
```

### Próxima Semana (Prioridad P1)
```
SPRINT 2:
- Notificaciones Push (2 días)
- Modal Feedback (1 día)
- Referidos UI completa (1 día)
```

---

## 🎯 MÉTRICAS DE ÉXITO

### Después de P0 (Presupuestos + Quick Wins)
- ✅ Feature presupuestos 100% funcional
- ✅ Reducción confusión nuevos usuarios: -80%
- ✅ Viralidad referidos: +50%
- ✅ UX mejorada notablemente

### Después de P1 (Push + Feedback + Referidos)
- ✅ Retención: +300%
- ✅ Viralidad: +200%
- ✅ Reputación online mejorada
- ✅ Engagement: +250%

### Después de P2-P3 (Performance + PWA)
- ✅ Tiempo de carga: -40%
- ✅ Re-engagement: +150%
- ✅ PWA nivel profesional

---

**Última actualización:** 20 de Marzo 2026, 10:15 AM  
**Próxima revisión:** Después de implementar P0  
**Documentos relacionados:** ANALISIS-MEJORAS-CONSOLIDADO.md
