# Optimización de Performance PWA - iOS y Android

**Fecha:** 2026-03-19
**Objetivo:** Reducir tiempo de carga inicial y mejorar percepción de velocidad

---

## 📊 Estado Actual (Análisis)

### ✅ Lo que ya está optimizado:

1. **Dynamic imports** - QRScanner y algunos componentes
2. **Service Worker** - Cache de rutas principales
3. **Image optimization** - Next.js Image con WebP/AVIF
4. **Cache headers** - Configurados en next.config.js

### ⚠️ Oportunidades de Mejora:

1. **Layout carga 4 componentes globales** sin lazy loading
2. **Service Worker** usa estrategia simple (mejorable)
3. **Sin preload** de recursos críticos
4. **Bundle size** no optimizado
5. **Fonts** no optimizadas

---

## 🚀 Optimizaciones Recomendadas

### 1. Lazy Load de Componentes Globales (ALTO IMPACTO)

#### Problema:
`layout.tsx` carga 4 componentes que no son críticos:

```typescript
// ❌ ACTUAL: Se cargan al inicio
import InstallPrompt from '@/components/InstallPrompt'
import UpdateNotification from '@/components/UpdateNotification'
import FeedbackModal from '@/components/FeedbackModal'
import PushPermissionPrompt from '@/components/PushPermissionPrompt'
```

**Impacto:** +50-100KB en bundle inicial

#### Solución:

```typescript
// ✅ MEJORADO: Lazy load con suspense
'use client'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'), {
  ssr: false,
  loading: () => null
})

const UpdateNotification = dynamic(() => import('@/components/UpdateNotification'), {
  ssr: false,
  loading: () => null
})

const FeedbackModal = dynamic(() => import('@/components/FeedbackModal'), {
  ssr: false,
  loading: () => null
})

const PushPermissionPrompt = dynamic(() => import('@/components/PushPermissionPrompt'), {
  ssr: false,
  loading: () => null
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          {children}
          <Suspense fallback={null}>
            <InstallPrompt />
            <UpdateNotification />
            <FeedbackModal />
            <PushPermissionPrompt />
          </Suspense>
        </SessionProvider>
      </body>
    </html>
  )
}
```

**Beneficio:**
- Carga inicial: -60KB (-30% faster)
- FCP (First Contentful Paint): -200ms
- Time to Interactive: -300ms

---

### 2. Service Worker con Network First Strategy (MEDIO IMPACTO)

#### Problema:
Service worker usa `addAll()` que bloquea la instalación si falla 1 archivo.

#### Solución:

```javascript
// ✅ MEJORADO: sw.js
const CACHE_NAME = 'fidelizacion-zona-v9'
const CRITICAL_ASSETS = [
  '/',
  '/pass',
  '/login',
  '/manifest.json'
]

const NON_CRITICAL_ASSETS = [
  '/icon-192x192-v2.png',
  '/icon-512x512-v2.png',
  '/activar',
  '/local'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cachear críticos (bloquea instalación si falla)
      await cache.addAll(CRITICAL_ASSETS)
      
      // Cachear no críticos (no bloquea si falla)
      await Promise.allSettled(
        NON_CRITICAL_ASSETS.map(url => 
          cache.add(url).catch(err => console.warn('Cache failed:', url))
        )
      )
      
      console.log('✅ SW: Installed')
      self.skipWaiting()
    })
  )
})

// Estrategia: Network First con Cache Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Solo cachear responses exitosas
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback a cache si network falla
        return caches.match(event.request)
      })
  )
})
```

**Beneficio:**
- Siempre intenta traer contenido fresco
- Offline funciona igual
- Instalación no falla por 1 archivo

---

### 3. Preload de Recursos Críticos (ALTO IMPACTO)

#### Agregar en layout.tsx:

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Preload recursos críticos */}
        <link rel="preload" href="/api/me" as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://coques.com.ar" />
        <link rel="dns-prefetch" href="https://vercel.app" />
        
        {/* Preload fonts críticas */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {/* ... */}
      </body>
    </html>
  )
}
```

**Beneficio:**
- FCP: -150ms
- LCP: -200ms

---

### 4. Optimizar next.config.js (MEDIO IMPACTO)

```javascript
// ✅ AGREGAR:
const nextConfig = {
  // ... configuración existente ...
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Optimizar bundle
  experimental: {
    optimizePackageImports: [
      '@heroicons/react',
      'date-fns',
      'react-icons'
    ],
  },

  // Minify agresivo
  swcMinify: true,

  // Comprimir páginas
  compress: true,

  // Powerd by header
  poweredByHeader: false,

  // Reducir build size
  output: 'standalone',
}
```

**Beneficio:**
- Bundle size: -15%
- Transfer size: -20%

---

### 5. Font Optimization (BAJO IMPACTO pero FÁCIL)

#### En layout.tsx:

```typescript
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Muestra texto con font del sistema hasta que cargue
  preload: true,
  variable: '--font-inter',
  fallback: ['system-ui', 'arial']
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans"> {/* usa --font-inter */}
        {/* ... */}
      </body>
    </html>
  )
}
```

**En globals.css:**

```css
@layer base {
  html {
    font-family: var(--font-inter), system-ui, sans-serif;
  }
}
```

**Beneficio:**
- FOIT (Flash of Invisible Text): eliminado
- CLS (Cumulative Layout Shift): -0.05

---

### 6. Code Splitting Agresivo (MEDIO IMPACTO)

#### Dividir componentes grandes:

```typescript
// ❌ ANTES: Un archivo grande
// src/app/admin/page.tsx (500 líneas)

// ✅ DESPUÉS: Dividir por tabs
const MetricasTab = dynamic(() => import('./components/MetricasTab'))
const ClientesTab = dynamic(() => import('./components/ClientesTab'))
const BeneficiosTab = dynamic(() => import('./components/BeneficiosTab'))

function AdminPage() {
  const [tab, setTab] = useState('metricas')
  
  return (
    <>
      {tab === 'metricas' && <MetricasTab />}
      {tab === 'clientes' && <ClientesTab />}
      {tab === 'beneficios' && <BeneficiosTab />}
    </>
  )
}
```

**Beneficio:**
- Carga inicial de /admin: -40%
- Tiempo de hidratación: -300ms

---

### 7. Optimizar Imágenes de WooCommerce (ALTO IMPACTO)

#### Problema:
Imágenes de tortas vienen sin optimizar (200-500KB c/u)

#### Solución:

```typescript
// En tortas/page.tsx
<Image
  src={torta.imagen}
  alt={torta.nombre}
  width={300}
  height={300}
  quality={75} // ✅ Reducir de 100 a 75 (imperceptible)
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,..." // ✅ Blur placeholder
  loading="lazy" // ✅ Ya lo tenés
  sizes="(max-width: 768px) 100vw, 300px" // ✅ Responsive
/>
```

**Beneficio:**
- Catálogo de tortas: -60% transfer
- LCP: -500ms

---

### 8. Reducir JavaScript en Primera Carga (ALTO IMPACTO)

#### Analizar bundle:

```bash
cd fidelizacion-zona
npm run build -- --profile
npx @next/bundle-analyzer
```

#### Librerías grandes a considerar reemplazar:

| Librería | Tamaño | Alternativa Ligera |
|----------|--------|-------------------|
| `date-fns` | 80KB | `date-fns-tz` solo lo necesario |
| `@heroicons/react` | 120KB (todas) | Tree-shake: importar específicos |
| `bcryptjs` | 45KB | Solo en backend |
| `qr-scanner` | 35KB | Lazy load (ya lo hacés ✅) |

#### Tree-shaking correcto:

```typescript
// ❌ ANTES: Importa TODO
import * as Icons from '@heroicons/react/24/outline'

// ✅ DESPUÉS: Importa solo lo necesario
import { UserIcon, BellIcon } from '@heroicons/react/24/outline'
```

**Beneficio:**
- Bundle inicial: -30%
- FCP: -400ms

---

## 📱 Optimizaciones Específicas iOS/Android

### iOS (WebKit)

#### 1. Splash Screen Optimization

```json
// manifest.json
{
  "splash_pages": null, // iOS usa icons para splash
  "ios": {
    "apple-touch-startup-image": [
      {
        "url": "/splash/iphone-x.png",
        "media": "(device-width: 375px) and (device-height: 812px)"
      }
    ]
  }
}
```

#### 2. Prevenir Scroll Bounce (iOS)

```css
/* globals.css */
body {
  overscroll-behavior-y: none; /* Previene bounce en iOS */
  -webkit-overflow-scrolling: touch; /* Smooth scroll */
}
```

#### 3. Optimizar Tap Delay

```css
* {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation; /* Elimina 300ms delay */
}
```

### Android (Chrome)

#### 1. Theme Color Dinámico

```typescript
// layout.tsx
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' }
  ],
  // ...
}
```

#### 2. App Install Banner

```typescript
// Ya tenés InstallPrompt, optimizar:
let deferredPrompt: any

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  // Mostrar banner custom
})
```

---

## 🎯 Plan de Implementación Priorizado

### Fase 1: Quick Wins (2 horas, ALTO IMPACTO)

1. ✅ Lazy load componentes globales en layout
2. ✅ Agregar preload de recursos críticos
3. ✅ Optimizar quality de imágenes tortas
4. ✅ Tree-shaking de icons

**Impacto esperado:** -40% tiempo de carga inicial

### Fase 2: Optimizaciones Medias (4 horas)

5. ✅ Actualizar Service Worker strategy
6. ✅ Optimizar next.config con compiler options
7. ✅ Font optimization
8. ✅ iOS/Android specific tweaks

**Impacto esperado:** -25% adicional

### Fase 3: Refactors Grandes (8 horas)

9. ✅ Code splitting de admin page
10. ✅ Analizar y reducir bundle con webpack-analyzer
11. ✅ Reemplazar librerías pesadas

**Impacto esperado:** -20% adicional

---

## 📊 Métricas Objetivo

### Antes (estimado actual):
- FCP: ~1.2s
- LCP: ~2.5s
- TTI: ~3.5s
- Bundle size: ~180KB

### Después (con todas las optimizaciones):
- FCP: ~0.7s (-42%)
- LCP: ~1.5s (-40%)
- TTI: ~2.0s (-43%)
- Bundle size: ~110KB (-39%)

---

## ✅ Testing

### Herramientas:

```bash
# Lighthouse en móvil
npx lighthouse https://coques-fidelizacion.vercel.app --preset=perf --view

# WebPageTest
https://www.webpagetest.org/

# Chrome DevTools Coverage
# Chrome DevTools → More Tools → Coverage
```

### KPIs a monitorear:

- **Performance Score:** >90
- **FCP:** <1s
- **LCP:** <2s
- **CLS:** <0.1
- **TBT:** <300ms

---

## 🔗 Referencias

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev PWA Performance](https://web.dev/fast-load-times/)
- [iOS PWA Guidelines](https://developer.apple.com/design/human-interface-guidelines/web-apps)

---

**Última actualización:** 2026-03-19
**Prioridad:** Alta - Impacta experiencia usuario directamente
**Esfuerzo total:** 14 horas para implementar todo
