// Service Worker para PWA - Fidelización Zona
const CACHE_NAME = 'fidelizacion-zona-v1'
const urlsToCache = [
    '/',
    '/pass',
    '/login',
    '/activar',
    '/manifest.json'
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    )
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName)
                    }
                })
            )
        })
    )
})

// Estrategia: Network First, luego Cache
self.addEventListener('fetch', (event) => {
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
