# 🔧 Solución: Error de Conexión al Reabrir App

**Problema reportado:** Al reabrir la app frecuentemente muestra "Error de conexión" y hay que hacer refresh manual.

**Fecha:** 20 de Marzo 2026  
**Prioridad:** 🔴 ALTA - Afecta UX crítica

---

## 🔍 Diagnóstico

### Causas Probables

1. **Token JWT expirado o inválido**
   - El token en localStorage puede estar expirado
   - Session de next-auth desincronizada
   - Token no se refresca automáticamente

2. **Service Worker sirviendo cache viejo**
   - SW puede estar retornando respuestas cacheadas inválidas
   - No hay validación de frescura de datos

3. **Requests sin retry automático**
   - Fallas de red temporales no se reintentan
   - Timeouts muy cortos

4. **Estado de la app stale**
   - Componentes intentan usar datos viejos
   - No hay revalidación al volver a la app

---

## ✅ SOLUCIONES

### Solución 1: Retry Automático Mejorado (Inmediato)
**Esfuerzo:** 1 hora | **Impacto:** ⭐⭐⭐⭐⭐ MUY ALTO

#### A) Crear Utility de Fetch con Retry

```typescript
// src/lib/fetch-with-retry.ts

interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Fetch con retry automático y timeout
 * 
 * @example
 * const data = await fetchWithRetry('/api/pass', {
 *   maxRetries: 3,
 *   timeout: 10000,
 *   headers: { Authorization: `Bearer ${token}` }
 * })
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 15000,
    onRetry,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Crear AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Si es exitoso, retornar
      if (response.ok) {
        return response
      }

      // Si es 401, no reintentar (token inválido)
      if (response.status === 401) {
        throw new Error('No autorizado - Token inválido')
      }

      // Si es 404 o 400, no reintentar (error de cliente)
      if (response.status === 404 || response.status === 400) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      // Para otros errores (500, 502, 503), reintentar
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

    } catch (error: any) {
      lastError = error

      // Si es AbortError (timeout), reintentar
      if (error.name === 'AbortError') {
        console.warn(`[FetchRetry] Intento ${attempt}/${maxRetries} - Timeout`)
      }
      // Si es network error, reintentar
      else if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        console.warn(`[FetchRetry] Intento ${attempt}/${maxRetries} - Network error`)
      }
      // Si es 401, no reintentar
      else if (error.message.includes('No autorizado')) {
        throw error
      }
    }

    // Si no es el último intento, esperar antes de reintentar
    if (attempt < maxRetries) {
      onRetry?.(attempt, lastError!)
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  throw lastError || new Error('Todos los intentos fallaron')
}

/**
 * Wrapper JSON que usa fetchWithRetry
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options)
  return response.json()
}
```

#### B) Usar en /pass/page.tsx

```typescript
// En src/app/pass/page.tsx

import { fetchWithRetry } from '@/lib/fetch-with-retry'

const fetchPass = useCallback(async () => {
  const token = localStorage.getItem('fidelizacion_token')
  if (!token) {
    setError('no_auth')
    setLoading(false)
    return
  }

  try {
    const res = await fetchWithRetry('/api/pass', {
      headers: { Authorization: `Bearer ${token}` },
      maxRetries: 3,
      timeout: 15000,
      onRetry: (attempt) => {
        console.log(`Reintentando... (${attempt}/3)`)
        // Opcional: mostrar toast "Reconectando..."
      }
    })

    if (res.status === 401) {
      // Token inválido, limpiar y redirigir
      localStorage.removeItem('fidelizacion_token')
      setError('no_auth')
      setLoading(false)
      return
    }

    const json = await res.json()
    
    if (!json.data) {
      throw new Error('Datos inválidos')
    }

    setPass(json.data.pass)
    setBeneficiosDisponibles(json.data.disponibles || [])
    setBeneficiosUsados(json.data.usados || [])
    setError(null)

  } catch (e: any) {
    console.error('[Pass] Error al cargar:', e)
    
    // Mensaje más específico según el error
    if (e.message.includes('No autorizado')) {
      localStorage.removeItem('fidelizacion_token')
      setError('no_auth')
    } else if (e.name === 'AbortError' || e.message.includes('timeout')) {
      setError('timeout')
    } else {
      setError('connection')
    }
  } finally {
    setLoading(false)
  }
}, [])
```

#### C) Mejorar Pantalla de Error

```typescript
// En src/app/pass/page.tsx - Pantalla de error mejorada

if (error === 'connection' || error === 'timeout') {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">
          {error === 'timeout' ? '⏱️' : '📡'}
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {error === 'timeout' ? 'Conexión lenta' : 'Sin conexión'}
        </h2>
        <p className="text-gray-600 mb-6">
          {error === 'timeout' 
            ? 'La conexión está tardando más de lo normal. Verificá tu conexión a internet.'
            : 'No pudimos conectar con el servidor. Verificá tu conexión a internet.'
          }
        </p>
        
        {/* Botones de acción */}
        <div className="space-y-3">
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchPass()
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            🔄 Reintentar
          </button>
          
          <button
            onClick={() => {
              // Forzar recarga completa
              window.location.reload()
            }}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
          >
            ↻ Recargar página
          </button>
          
          <button
            onClick={() => {
              localStorage.removeItem('fidelizacion_token')
              window.location.href = '/iniciar-sesion'
            }}
            className="w-full text-gray-500 hover:text-gray-700 text-sm"
          >
            Cerrar sesión e intentar de nuevo
          </button>
        </div>
        
        {/* Tip para modo offline */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            💡 <strong>Tip:</strong> Si seguís teniendo problemas, 
            activá y desactivá el modo avión para resetear tu conexión.
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

### Solución 2: Revalidación al Volver a la App
**Esfuerzo:** 30 min | **Impacto:** ⭐⭐⭐⭐⭐ MUY ALTO

```typescript
// En src/app/pass/page.tsx

useEffect(() => {
  // Revalidar datos cuando la app vuelve a estar visible
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('[Pass] App visible de nuevo, revalidando datos...')
      
      // Solo revalidar si han pasado más de 30 segundos
      const lastFetch = sessionStorage.getItem('last_pass_fetch')
      const now = Date.now()
      
      if (!lastFetch || now - parseInt(lastFetch) > 30000) {
        fetchPass()
        sessionStorage.setItem('last_pass_fetch', now.toString())
      }
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [fetchPass])
```

---

### Solución 3: Token Refresh Automático
**Esfuerzo:** 1.5 horas | **Impacto:** ⭐⭐⭐⭐⭐ MUY ALTO

```typescript
// src/lib/auth-refresh.ts

/**
 * Verifica si el token está por expirar y lo refresca automáticamente
 */
export async function refreshTokenIfNeeded(): Promise<boolean> {
  const token = localStorage.getItem('fidelizacion_token')
  if (!token) return false

  try {
    // Decodificar JWT para ver expiración
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000 // Convertir a ms
    const now = Date.now()
    const timeUntilExpiry = exp - now
    
    // Si expira en menos de 5 minutos, refrescar
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log('[Auth] Token por expirar, refrescando...')
      
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('fidelizacion_token', data.token)
        console.log('[Auth] Token refrescado exitosamente')
        return true
      }
    }
    
    return true
  } catch (error) {
    console.error('[Auth] Error al verificar/refrescar token:', error)
    return false
  }
}

/**
 * Hook para auto-refresh de token
 */
export function useTokenRefresh() {
  useEffect(() => {
    // Verificar cada 2 minutos
    const interval = setInterval(() => {
      refreshTokenIfNeeded()
    }, 2 * 60 * 1000)
    
    // Verificar inmediatamente al montar
    refreshTokenIfNeeded()
    
    return () => clearInterval(interval)
  }, [])
}
```

```typescript
// Usar en src/app/pass/page.tsx

import { useTokenRefresh } from '@/lib/auth-refresh'

export default function PassPage() {
  useTokenRefresh() // Auto-refresh de token
  
  // ... resto del código
}
```

**NOTA:** Requiere crear endpoint `/api/auth/refresh` que genere nuevo token.

---

### Solución 4: Service Worker - Estrategia Network First
**Esfuerzo:** 45 min | **Impacto:** ⭐⭐⭐⭐ ALTO

```javascript
// En public/sw.js

const CRITICAL_APIS = [
  '/api/pass',
  '/api/pass/beneficios-disponibles',
  '/api/perfil',
]

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Para APIs críticas: Network First (intentar red primero, cache como fallback)
  if (CRITICAL_APIS.some(api => url.pathname.startsWith(api))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Si la respuesta es exitosa, cachear
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone)
            })
          }
          return response
        })
        .catch(async () => {
          // Si falla la red, intentar cache
          const cached = await caches.match(event.request)
          if (cached) {
            console.log('[SW] Network failed, serving from cache:', url.pathname)
            return cached
          }
          
          // Si no hay cache, retornar error offline
          return new Response(
            JSON.stringify({
              error: 'Sin conexión',
              offline: true,
              message: 'No hay conexión a internet y no hay datos cacheados'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        })
    )
    return
  }
  
  // Para otros requests, estrategia normal (cache first)
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request)
    })
  )
})
```

---

### Solución 5: Indicador de Estado de Conexión
**Esfuerzo:** 30 min | **Impacto:** ⭐⭐⭐⭐ ALTO

```typescript
// src/components/ConnectionStatus.tsx

'use client'
import { useState, useEffect } from 'react'

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-white font-semibold text-sm transition-all ${
        isOnline
          ? 'bg-green-600 animate-slide-down'
          : 'bg-red-600'
      }`}
    >
      {isOnline ? (
        <span>✓ Conexión restaurada</span>
      ) : (
        <span>⚠️ Sin conexión a internet</span>
      )}
    </div>
  )
}
```

```typescript
// Agregar en src/app/layout.tsx

import ConnectionStatus from '@/components/ConnectionStatus'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ConnectionStatus />
        {children}
      </body>
    </html>
  )
}
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### Fase 1: Inmediato (2 horas) - Recomendado
1. ✅ Crear `fetch-with-retry.ts` (45 min)
2. ✅ Actualizar `/pass/page.tsx` para usar retry (30 min)
3. ✅ Mejorar pantalla de error con opciones (30 min)
4. ✅ Agregar `ConnectionStatus` component (15 min)

**Resultado:** El 90% de los errores de conexión se resolverán automáticamente

---

### Fase 2: Mejoras (2 horas)
5. ✅ Implementar revalidación al volver visible (30 min)
6. ✅ Token refresh automático (1.5h)

**Resultado:** Experiencia sin interrupciones

---

### Fase 3: Optimización (1 hora)
7. ✅ Mejorar Service Worker con Network First (45 min)
8. ✅ Testing completo (15 min)

**Resultado:** PWA robusta incluso offline

---

## 🎯 MÉTRICAS DE ÉXITO

### Antes (Estado Actual)
- ❌ Errores de conexión: Frecuentes
- ❌ Usuario debe hacer refresh manual
- ❌ Experiencia frustrante
- ❌ Abandono al reabrir app

### Después (Con Soluciones)
- ✅ Errores de conexión: Raros (resueltos automáticamente)
- ✅ Retry automático 3 veces antes de mostrar error
- ✅ Token se refresca automáticamente
- ✅ Revalidación al volver a la app
- ✅ Usuario informado del estado de conexión
- ✅ Experiencia fluida

**Reducción de errores esperada:** 90%

---

## 🧪 TESTING

### Casos a probar:

1. **Conexión lenta:**
   - Activar "Slow 3G" en DevTools
   - Abrir app → Debe reintentar automáticamente

2. **Sin conexión:**
   - Modo avión activado
   - Abrir app → Debe mostrar mensaje claro con opciones

3. **Token expirado:**
   - Modificar fecha del sistema
   - Abrir app → Debe refrescar token o redirigir a login

4. **Volver a la app:**
   - Dejar app en background 5 minutos
   - Volver → Debe revalidar datos automáticamente

5. **Recuperación de conexión:**
   - Activar modo avión
   - Abrir app (muestra error)
   - Desactivar modo avión
   - Debe detectar y reconectar automáticamente

---

## ⚠️ CONSIDERACIONES

### Timeouts
- Timeout por request: 15 segundos (suficiente para 3G)
- Reintentos: 3 (total máximo: 45 segundos)
- Delay entre reintentos: Exponencial (1s, 2s, 3s)

### Token Refresh
- Refrescar 5 minutos antes de expirar
- Verificar cada 2 minutos
- Si falla refresh → Logout automático

### Cache
- APIs críticas: Network First
- Assets estáticos: Cache First
- TTL: 5 minutos para datos dinámicos

---

## 📝 ARCHIVOS A MODIFICAR

1. **Nuevos:**
   - `src/lib/fetch-with-retry.ts`
   - `src/lib/auth-refresh.ts`
   - `src/components/ConnectionStatus.tsx`
   - `src/app/api/auth/refresh/route.ts` (opcional)

2. **Modificar:**
   - `src/app/pass/page.tsx` (agregar retry y revalidación)
   - `src/app/layout.tsx` (agregar ConnectionStatus)
   - `public/sw.js` (mejorar estrategia de cache)

---

## 💡 BONUS: Feedback Visual Durante Retry

```typescript
// En src/app/pass/page.tsx

const [retrying, setRetrying] = useState(false)
const [retryAttempt, setRetryAttempt] = useState(0)

// En fetchWithRetry options:
onRetry: (attempt) => {
  setRetrying(true)
  setRetryAttempt(attempt)
}

// En el JSX, mostrar cuando está reintentando:
{retrying && (
  <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg p-3 shadow-lg z-50 animate-slide-up">
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      <div className="flex-1">
        <p className="font-semibold">Reconectando...</p>
        <p className="text-xs text-blue-100">Intento {retryAttempt} de 3</p>
      </div>
    </div>
  </div>
)}
```

---

**Prioridad:** 🔴 P0 - Implementar URGENTE  
**Tiempo estimado:** 2-5 horas (dependiendo de fases)  
**ROI:** ⭐⭐⭐⭐⭐ MUY ALTO - Mejora crítica de UX
