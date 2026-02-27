# 🚀 Plan de Optimización: Catálogo de Tortas - Reducción 50% Tiempo de Carga

> **✅ ACTUALIZACIÓN:** La optimización de imágenes (Fase 3) ha sido **IMPLEMENTADA** el 27/02/2026.
> Ver detalles en [`OPTIMIZACION-IMAGENES-WOOCOMMERCE.md`](OPTIMIZACION-IMAGENES-WOOCOMMERCE.md)

## 📊 Situación Actual (Análisis del Código)

### ✅ Optimizaciones Ya Implementadas

1. **Frontend** ([`tortas/page.tsx`](fidelizacion-zona/src/app/tortas/page.tsx))
   - ✅ Prefetching de variaciones en background (línea 128-179)
   - ✅ Lazy loading de imágenes (`loading="lazy"`)
   - ✅ Skeleton screens durante carga
   - ✅ Memoización con `useMemo`/`useCallback`
   - ✅ Optimización de selectores de Next/Image

2. **Backend** ([`api/woocommerce/tortas/route.ts`](fidelizacion-zona/src/app/api/woocommerce/tortas/route.ts))
   - ✅ Cache Next.js de 2 horas (línea 192)
   - ✅ Batch queries para SKUs (17 llamadas → 2 llamadas)
   - ✅ Lazy loading de variaciones (no en carga inicial)
   - ✅ Timeouts configurados (20-30s)

3. **PWA** ([`sw.js`](fidelizacion-zona/public/sw.js))
   - ✅ Service Worker con estrategia Network First
   - ✅ Cache de rutas principales

---

## ⚠️ Cuellos de Botella Identificados

### 1. 🐌 **API: Múltiples Llamadas HTTP** (Impacto: ALTO)
**Problema:** A pesar del caché de 2 horas, la primera carga hace:
- 1 llamada para categorías
- 1 llamada para productos (25 items)
- 2 llamadas batch para SKUs adicionales
- 1 llamada para SKU 20 (Torta Temática)

**Total:** 5 llamadas HTTP secuenciales a WooCommerce = **~2-4 segundos**

### 2. 🔄 **Service Worker: Network First** (Impacto: ALTO)
**Problema:** Estrategia "Network First" siempre espera la red antes de usar caché.
- Para tortas (que cambian poco), debería ser "Cache First"
- Usuarios recurrentes no se benefician del caché

### 3. 🖼️ **Imágenes de WooCommerce** (Impacto: ALTO) - ✅ **IMPLEMENTADO**
**Problema (RESUELTO):**
- ~~Imágenes venían directo de WooCommerce sin optimización~~
- ~~No usaba WebP/AVIF automáticamente~~
- ~~No había responsive images (srcset)~~

**Solución Implementada:**
- ✅ Cambiado `<img>` a `<Image>` de Next.js
- ✅ Conversión automática a WebP/AVIF (75-85% reducción de peso)
- ✅ Responsive images con `sizes` optimizados
- ✅ Lazy loading automático
- ✅ **Reducción esperada: 60% en tiempo de carga de imágenes**

Ver implementación completa en [`OPTIMIZACION-IMAGENES-WOOCOMMERCE.md`](OPTIMIZACION-IMAGENES-WOOCOMMERCE.md)

### 4. 💾 **Sin Cache en Cliente** (Impacto: ALTO)
**Problema:**
- No hay caché persistente en el navegador (localStorage/IndexedDB)
- Cada refresh = nueva llamada al servidor
- No aprovecha visitas repetidas del mismo usuario

### 5. ⏱️ **Sin Server-Side Rendering** (Impacto: MEDIO)
**Problema:**
- Todo el catálogo se carga client-side
- Primera pintura visual es lenta
- SEO no óptimo

---

## 🎯 Plan de Optimización (50% Reducción)

### **Fase 1: Cache Agresivo Frontend** ⚡ (Ganancia: 30-40%)

#### 1.1 Implementar Cache LocalStorage con TTL

**Archivo:** `src/lib/cache.ts` (NUEVO)

```typescript
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class FrontendCache {
  private static readonly PREFIX = 'fz_cache_'

  static set<T>(key: string, data: T, ttlMinutes: number = 120): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000
      }
      localStorage.setItem(
        `${this.PREFIX}${key}`,
        JSON.stringify(entry)
      )
    } catch (error) {
      console.warn('Cache write failed:', error)
    }
  }

  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${this.PREFIX}${key}`)
      if (!item) return null

      const entry: CacheEntry<T> = JSON.parse(item)
      const now = Date.now()

      // Verificar si expiró
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key)
        return null
      }

      return entry.data
    } catch (error) {
      console.warn('Cache read failed:', error)
      return null
    }
  }

  static delete(key: string): void {
    localStorage.removeItem(`${this.PREFIX}${key}`)
  }

  static clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.PREFIX))
      .forEach(key => localStorage.removeItem(key))
  }
}
```

#### 1.2 Usar Cache en Carga de Tortas

**Modificar:** `src/app/tortas/page.tsx`

```typescript
async function cargarTortas() {
  setLoading(true)
  setError(null)

  // 🚀 PASO 1: Intentar cache primero
  const cached = FrontendCache.get<Producto[]>('tortas_catalogo')
  if (cached) {
    console.log('[Cache] ✓ Catálogo cargado desde cache local')
    setProductos(cached)
    setLoading(false)
    
    // Actualizar en background (stale-while-revalidate)
    fetch('/api/woocommerce/tortas')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.products) {
          FrontendCache.set('tortas_catalogo', data.products, 120)
          setProductos(data.products)
        }
      })
      .catch(console.error)
    
    return
  }

  // 🐌 PASO 2: Si no hay cache, cargar de red
  try {
    const response = await fetch('/api/woocommerce/tortas')
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al cargar tortas')
    }

    if (data.success) {
      setProductos(data.products || [])
      // Guardar en cache
      FrontendCache.set('tortas_catalogo', data.products || [], 120)
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error desconocido')
  } finally {
    setLoading(false)
  }
}
```

**Ganancia esperada:** 2-3 segundos en visitas repetidas = **40% mejora**

---

### **Fase 2: Service Worker Cache-First** ⚡ (Ganancia: 20-30%)

#### 2.1 Estrategia Híbrida en Service Worker

**Modificar:** `public/sw.js`

```javascript
// Estrategia Cache First para recursos estáticos y API de tortas
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http')) {
        return
    }

    const url = new URL(event.request.url)

    // 🚀 CACHE FIRST para API de tortas (cambian poco)
    if (url.pathname.includes('/api/woocommerce/tortas')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[SW] ✓ Serving tortas from cache')
                    
                    // Actualizar cache en background
                    fetch(event.request)
                        .then((response) => {
                            if (response && response.status === 200) {
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, response.clone())
                                })
                            }
                        })
                        .catch(() => {})
                    
                    return cachedResponse
                }

                // Si no hay cache, fetch normal
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone()
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone)
                        })
                    }
                    return response
                })
            })
        )
        return
    }

    // 🔄 NETWORK FIRST para el resto (datos dinámicos)
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone)
                    })
                }
                return response
            })
            .catch(() => {
                return caches.match(event.request)
            })
    )
})
```

**Ganancia esperada:** 1-2 segundos en visitas repetidas = **25% mejora**

---

### **Fase 3: Optimización de Imágenes** 🖼️ (Ganancia: 10-15%)

#### 3.1 Usar Next/Image para Optimización Automática

**Modificar:** `src/app/tortas/page.tsx` (líneas 605-614)

```typescript
// ❌ ANTES: img nativa
{producto.imagen ? (
  <div className="relative h-64 bg-gray-100">
    <img
      src={producto.imagen}
      alt={producto.nombre}
      loading="lazy"
      className="w-full h-full object-cover"
    />
  </div>
) : (...)}

// ✅ DESPUÉS: Next/Image con optimización
{producto.imagen ? (
  <div className="relative h-64 bg-gray-100">
    <Image
      src={producto.imagen}
      alt={producto.nombre}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover"
      loading="lazy"
      quality={75}
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,..."
    />
  </div>
) : (...)}
```

#### 3.2 Configurar Optimización de Imágenes Remotas

**Modificar:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ayres.solutions', // Tu dominio de WooCommerce
        port: '',
        pathname: '/wp-content/uploads/**',
      },
    ],
    formats: ['image/webp', 'image/avif'], // Formatos modernos
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24 horas
  },
}

module.exports = nextConfig
```

**Ganancia esperada:** Reducción 40-60% tamaño imágenes = **15% mejora velocidad**

---

### **Fase 4: API Caching con Headers HTTP** 🔧 (Ganancia: 10%)

#### 4.1 Agregar Headers de Cache Agresivos

**Modificar:** `src/app/api/woocommerce/tortas/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const cacheTime = 7200 // 2 horas

  try {
    // ... tu código actual ...

    const response = NextResponse.json({
      success: true,
      categoria: { ...tortasCategory },
      count: productsWithVariations.length,
      products: productsWithVariations,
    })

    // 🚀 Agregar headers de cache agresivos
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=7200, stale-while-revalidate=3600'
    )
    response.headers.set('CDN-Cache-Control', 'public, max-age=7200')
    response.headers.set('Vercel-CDN-Cache-Control', 'max-age=7200')

    return response
  } catch (error) {
    // ...
  }
}
```

**Ganancia esperada:** Caché en CDN de Vercel = **10% mejora**

---

### **Fase 5: Pre-rendering Parcial (ISR)** ⚡ (Ganancia: 15-20%)

#### 5.1 Convertir a Static Site Generation con Revalidación

**Modificar:** `src/app/tortas/page.tsx`

```typescript
// Agregar al final del archivo, fuera del componente
export const revalidate = 7200 // 2 horas en segundos

// Generar página estática en build time
export async function generateStaticParams() {
  return [{}] // Generar la página principal
}

// Pre-fetch data en servidor
export async function generateMetadata() {
  return {
    title: 'Tortas Clásicas | Coques Bakery',
    description: 'Descubrí nuestra selección de tortas artesanales',
  }
}
```

**Ganancia esperada:** Primera carga pre-renderizada = **20% mejora**

---

## 📈 Resumen de Ganancias Esperadas

| Optimización | Ganancia | Dificultad | Prioridad |
|--------------|----------|------------|-----------|
| **1. Frontend Cache (LocalStorage)** | 40% | Baja | 🔥 ALTA |
| **2. Service Worker Cache-First** | 25% | Media | 🔥 ALTA |
| **3. Next/Image Optimization** | 15% | Baja | ⚠️ MEDIA |
| **4. API HTTP Headers** | 10% | Baja | ⚠️ MEDIA |
| **5. ISR Pre-rendering** | 20% | Media | 💡 BAJA |

### **Total Potencial: 50-60% de Mejora** ✅

---

## 🚀 Orden de Implementación Recomendado

### **Sprint 1: Quick Wins** (2-4 horas) - Ganancia: 50%
1. ✅ Implementar `FrontendCache` (1h)
2. ✅ Modificar `cargarTortas()` para usar cache (30min)
3. ✅ Actualizar Service Worker a Cache-First (1h)
4. ✅ Agregar HTTP headers de cache en API (15min)

**Resultado:** De ~4-5s → ~2s en carga inicial, ~0.5s en visitas repetidas

### **Sprint 2: Optimización Imágenes** (3-5 horas) - Ganancia: 15%
1. ✅ Configurar Next/Image domains (15min)
2. ✅ Reemplazar `<img>` por `<Image>` (2h)
3. ✅ Testing en diferentes dispositivos (1h)

**Resultado:** Reducción adicional de 0.5-1s

### **Sprint 3: ISR (Opcional)** (4-6 horas) - Ganancia: 20%
1. ✅ Convertir a Server Component con ISR
2. ✅ Testing y ajustes
3. ✅ Deploy y monitoreo

**Resultado:** Primera carga <1s

---

## 🧪 Testing y Monitoreo

### Herramientas de Medición

1. **Chrome DevTools**
   ```javascript
   // Network tab → Throttling: Fast 3G
   // Performance tab → Record
   ```

2. **Lighthouse**
   ```bash
   npx lighthouse https://tu-dominio.com/tortas --view
   ```

3. **Web Vitals**
   ```typescript
   // Agregar en tortas/page.tsx
   useEffect(() => {
     if (typeof window !== 'undefined' && 'performance' in window) {
       const perfData = performance.getEntriesByType('navigation')[0]
       console.log('[Performance] Load time:', perfData.duration)
     }
   }, [])
   ```

### Métricas Objetivo

| Métrica | Actual | Objetivo | Mejora |
|---------|--------|----------|--------|
| **First Contentful Paint** | ~2s | <1s | 50% |
| **Largest Contentful Paint** | ~4s | <2s | 50% |
| **Time to Interactive** | ~5s | <2.5s | 50% |
| **Tamaño Transferido** | ~1.5MB | <800KB | 47% |

---

## 📋 Checklist de Implementación

### Fase 1: Frontend Cache
- [ ] Crear `src/lib/cache.ts`
- [ ] Modificar `cargarTortas()` en `tortas/page.tsx`
- [ ] Testing en Chrome DevTools
- [ ] Verificar localStorage en Application tab

### Fase 2: Service Worker
- [ ] Modificar `public/sw.js`
- [ ] Incrementar `CACHE_NAME` version
- [ ] Testing con Network offline
- [ ] Verificar cache hits en Console

### Fase 3: Imágenes
- [ ] Configurar `next.config.js`
- [ ] Reemplazar todos los `<img>` por `<Image>`
- [ ] Generar blur placeholders
- [ ] Testing en mobile

### Fase 4: API Headers
- [ ] Agregar headers en `tortas/route.ts`
- [ ] Verificar en Network tab (Response Headers)
- [ ] Testing con curl

### Fase 5: Deploy
- [ ] Commit cambios
- [ ] Push a GitHub
- [ ] Monitorear deploy en Vercel
- [ ] Testing en producción

---

## ⚡ Optimizaciones Adicionales (Futuro)

### 1. **Compresión Brotli/Gzip**
Vercel lo hace automáticamente, pero verificar:
```bash
curl -H "Accept-Encoding: gzip" -I https://tu-dominio.com/api/woocommerce/tortas
```

### 2. **CDN para Imágenes de WooCommerce**
- Usar Cloudflare Images o similar
- Pre-procesar imágenes en build time

### 3. **GraphQL en lugar de REST**
- Reducir over-fetching
- Una sola query para todo

### 4. **Redis Cache en API**
- Caché persistente en servidor
- Shared cache entre requests

### 5. **Bundle Analysis**
```bash
npm install @next/bundle-analyzer
npm run build -- --analyze
```

---

## 🎯 Resultado Final Esperado

### Antes (Actual)
- **Primera carga:** 4-5 segundos
- **Visitas repetidas:** 3-4 segundos
- **Tamaño transferido:** ~1.5MB

### Después (Con Fases 1-4)
- **Primera carga:** 2-2.5 segundos ⚡ **50% mejora**
- **Visitas repetidas:** 0.5-1 segundo ⚡ **75% mejora**
- **Tamaño transferido:** ~800KB ⚡ **47% mejora**

---

## 📚 Referencias

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Service Worker Strategies](https://web.dev/service-worker-caching-and-http-caching/)
- [Web Vitals](https://web.dev/vitals/)
- [ISR (Incremental Static Regeneration)](https://nextjs.org/docs/app/building-your-application/data-fetching/revalidating)

---

**Fecha:** Febrero 2026  
**Objetivo:** Reducir tiempo de carga del catálogo en 50%  
**Estado:** Plan diseñado, listo para implementación
