// Service Worker para PWA - Fidelización Zona
const CACHE_NAME = 'fidelizacion-zona-v5' // v5: Iconos PNG actualizados
const urlsToCache = [
    '/',
    '/pass',
    '/login',
    '/activar',
    '/local',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
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

// ========================================
// PUSH NOTIFICATIONS
// ========================================

// Recibir notificación push
self.addEventListener('push', (event) => {
    console.log('📬 SW: Push notification received')

    let notificationData = {
        title: 'Coques Bakery',
        body: 'Nueva notificación',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: { url: '/pass' }
    }

    // Parsear datos del push
    if (event.data) {
        try {
            const payload = event.data.json()
            notificationData = {
                title: payload.title || notificationData.title,
                body: payload.body || notificationData.body,
                icon: payload.icon || notificationData.icon,
                badge: payload.badge || notificationData.badge,
                data: payload.data || notificationData.data,
                tag: payload.tag,
                requireInteraction: payload.requireInteraction || false
            }
        } catch (e) {
            console.error('❌ SW: Error parsing push data:', e)
            notificationData.body = event.data.text()
        }
    }

    // Mostrar notificación
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            data: notificationData.data,
            requireInteraction: notificationData.requireInteraction,
            vibrate: [200, 100, 200], // Patrón de vibración
            actions: notificationData.data.actions || []
        }).then(() => {
            console.log('✅ SW: Notification displayed')
        })
    )
})

// Click en notificación
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ SW: Notification clicked')

    event.notification.close()

    // Obtener URL de destino
    const urlToOpen = event.notification.data?.url || '/pass'

    // Abrir o enfocar la app
    event.waitUntil(
        self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Buscar si ya hay una ventana abierta con la app
            for (const client of clientList) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    console.log('✅ SW: Focusing existing window and navigating to:', urlToOpen)
                    return client.focus().then(() => {
                        if ('navigate' in client) {
                            return client.navigate(urlToOpen)
                        }
                    })
                }
            }

            // Si no hay ventana abierta, abrir una nueva
            if (self.clients.openWindow) {
                console.log('✅ SW: Opening new window:', urlToOpen)
                return self.clients.openWindow(urlToOpen)
            }
        })
    )
})

// Cierre de notificación
self.addEventListener('notificationclose', (event) => {
    console.log('🔕 SW: Notification closed by user')
    // Aquí podríamos enviar analytics si fuera necesario
})
