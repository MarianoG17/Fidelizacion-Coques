'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function PushPermissionPrompt() {
    const { data: session, status } = useSession()
    const [showPrompt, setShowPrompt] = useState(false)
    const [isSubscribing, setIsSubscribing] = useState(false)

    useEffect(() => {
        // Solo mostrar si el usuario está autenticado
        if (status !== 'authenticated' || !session?.user?.id) return

        // Verificar si el navegador soporta push notifications
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('🔕 Push notifications not supported')
            return
        }

        // Verificar el estado actual del permiso
        checkNotificationPermission()
    }, [status, session])

    async function checkNotificationPermission() {
        const permission = Notification.permission

        if (permission === 'default') {
            // Esperar un poco antes de mostrar el prompt (mejor UX)
            setTimeout(() => {
                setShowPrompt(true)
            }, 5000) // Mostrar después de 5 segundos
        } else if (permission === 'granted') {
            // Ya tiene permiso, verificar si está suscrito
            checkExistingSubscription()
        }
        // Si es 'denied', no hacemos nada
    }

    async function checkExistingSubscription() {
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (!subscription) {
                // Tiene permiso pero no está suscrito, suscribir automáticamente
                await subscribeToPush()
            } else {
                console.log('✅ Already subscribed to push notifications')
            }
        } catch (error) {
            console.error('Error checking subscription:', error)
        }
    }

    async function handleEnableNotifications() {
        setIsSubscribing(true)

        try {
            // Solicitar permiso
            const permission = await Notification.requestPermission()

            if (permission === 'granted') {
                await subscribeToPush()
                setShowPrompt(false)
            } else {
                console.log('🔕 Notification permission denied')
                setShowPrompt(false)
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error)
        } finally {
            setIsSubscribing(false)
        }
    }

    async function subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready

            // Obtener la VAPID public key desde las variables de entorno
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidPublicKey) {
                throw new Error('VAPID public key not configured')
            }

            // Convertir base64 a Uint8Array
            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

            // Suscribirse al push manager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey as BufferSource
            })

            console.log('✅ Push subscription created:', subscription)

            // Enviar la suscripción al servidor
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            })

            if (!response.ok) {
                throw new Error('Failed to save subscription')
            }

            console.log('✅ Push subscription saved to server')
        } catch (error) {
            console.error('Error subscribing to push:', error)
        }
    }

    function handleDismiss() {
        setShowPrompt(false)
        // Guardar en localStorage que el usuario rechazó para no molestar de nuevo pronto
        localStorage.setItem('pushPromptDismissed', Date.now().toString())
    }

    // Helper para convertir VAPID key
    function urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/')

        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }

    if (!showPrompt) return null

    return (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
            <div className="max-w-sm mx-auto bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-5 text-white">
                <div className="flex items-start gap-4">
                    {/* Icono de campana */}
                    <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                    </div>

                    <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">
                            🎉 ¡Activa las Notificaciones!
                        </h3>
                        <p className="text-sm text-purple-100 mb-4">
                            Recibe avisos cuando tu auto esté listo, nuevos beneficios disponibles, y ofertas especiales.
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleEnableNotifications}
                                disabled={isSubscribing}
                                className="flex-1 bg-white text-purple-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubscribing ? 'Activando...' : 'Activar'}
                            </button>
                            <button
                                onClick={handleDismiss}
                                disabled={isSubscribing}
                                className="px-4 py-2.5 text-white hover:bg-white hover:bg-opacity-10 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Ahora no
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.5s ease-out;
                }
            `}</style>
        </div>
    )
}
