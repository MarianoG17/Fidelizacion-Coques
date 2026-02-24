// Service Worker para PWA - Fidelización Zona
const CACHE_NAME = 'fidelizacion-zona-v3' // v3: Sistema auto-actualización implementado
const urlsToCache = [
    '/',
    '/pass',
    '/login',
    '/activar',
    '/local',
    '/manifest.json'
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 SW: Installing new version...')
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => {
                console.log('✅ SW: Cache populated')
                // NO hacer skipWaiting() automáticamente aquí
                // Esperar a que el usuario lo active manualmente
            })
    )
})

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
    console.log('📨 SW: Message received:', event.data)

    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('⚡ SW: Activating new version immediately...')
        self.skipWaiting()
    }
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 SW: Activating new version...')
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
            // Tomar control de todas las páginas inmediatamente
            return self.clients.claim()
        })
    )
})

// Estrategia: Network First, luego Cache
self.addEventListener('fetch', (event) => {
    // Ignorar requests que no sean http/https (ej: chrome-extension://)
    if (!event.request.url.startsWith('http')) {
        return
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Si la respuesta es válida, actualizar cache
                if (response && response.status === 200) {
                    const responseClone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone)
                    })
                }
                return response
            })
            .catch(() => {
                // Si falla la red, intentar desde cache
                return caches.match(event.request)
            })
    )
})
