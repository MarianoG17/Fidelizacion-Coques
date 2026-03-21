// Service Worker para PWA - Fidelización Zona
// ✅ OPTIMIZACIÓN: v9 con estrategia mejorada
const CACHE_NAME = 'fidelizacion-zona-v10'
const ICON_VERSION = 'v10'

// Recursos críticos (bloquean instalación si fallan)
const CRITICAL_ASSETS = [
    '/',
    '/pass',
    '/login',
    '/manifest.json'
]

// Recursos no críticos (no bloquean instalación)
const NON_CRITICAL_ASSETS = [
    `/icon-192x192-v2.png?v=${ICON_VERSION}`,
    `/icon-512x512-v2.png?v=${ICON_VERSION}`,
    '/activar',
    '/local'
]

// ✅ OPTIMIZACIÓN: Instalación mejorada sin bloqueos
self.addEventListener('install', (event) => {
    console.log('🔧 SW: Installing v10...')
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Cachear críticos (bloquea si falla)
            await cache.addAll(CRITICAL_ASSETS)
            console.log('✅ SW: Critical assets cached')
            
            // Cachear no críticos (no bloquea si falla)
            await Promise.allSettled(
                NON_CRITICAL_ASSETS.map(url => 
                    cache.add(url).catch(err => console.warn('⚠️ SW: Failed to cache:', url))
                )
            )
            console.log('✅ SW: Non-critical assets cached')
            
            // Activar inmediatamente (más rápido)
            self.skipWaiting()
        })
    )
})

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('⚡ SW: Activating new version immediately...')
        self.skipWaiting()
    }
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 SW: Activating v10...')
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ SW: Deleting old cache:', cacheName)
                        return caches.delete(cacheName)
                    }
                })
            )
        }).then(() => {
            console.log('✅ SW: Activation complete')
            return self.clients.claim()
        })
    )
})

// ✅ OPTIMIZACIÓN: Network First con timeout y cache fallback inteligente
self.addEventListener('fetch', (event) => {
    // Ignorar requests que no sean http/https
    if (!event.request.url.startsWith('http')) {
        return
    }

    // Solo cachear GET requests
    if (event.request.method !== 'GET') {
        return
    }

    // No cachear rutas de API — tienen su propia estrategia de caché en Next.js
    // y servir datos viejos del SW puede mostrar nivel/beneficios desactualizados
    if (event.request.url.includes('/api/')) {
        return
    }

    event.respondWith(
        // Intentar red primero con timeout de 3 segundos
        Promise.race([
            fetch(event.request).then(response => {
                // Solo cachear responses exitosas
                if (response && response.status === 200) {
                    const responseClone = response.clone()
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone)
                    })
                }
                return response
            }),
            // Timeout de 3 segundos para network
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Network timeout')), 3000)
            )
        ])
        .catch(() => {
            // Fallback a cache si network falla o timeout
            return caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    console.log('📦 SW: Serving from cache:', event.request.url)
                    return cachedResponse
                }
                // Si no está en cache y es una navegación, devolver página offline
                if (event.request.mode === 'navigate') {
                    return caches.match('/')
                }
                throw new Error('No cached response available')
            })
        })
    )
})

// Push notification handler
self.addEventListener('push', (event) => {
    if (!event.data) return

    const data = event.data.json()
    const options = {
        body: data.body || 'Nuevo mensaje de Coques',
        icon: '/icon-192x192-v2.png',
        badge: '/icon-192x192-v2.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'notification',
        data: data.data || {},
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Coques', options)
    )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    )
})
