'use client'

import { useEffect, useState } from 'react'

export default function UpdateNotification() {
    const [showUpdate, setShowUpdate] = useState(false)
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return
        }

        // Detectar nuevo Service Worker esperando
        const detectUpdate = async () => {
            const reg = await navigator.serviceWorker.getRegistration()
            if (!reg) return

            setRegistration(reg)

            // Si ya hay un SW esperando, mostrar notificación inmediatamente
            if (reg.waiting) {
                setShowUpdate(true)
            }

            // Escuchar cuando un nuevo SW entre en estado "waiting"
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing
                if (!newWorker) return

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Hay un nuevo SW listo para activarse
                        setShowUpdate(true)
                    }
                })
            })
        }

        // Escuchar mensajes del Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                setShowUpdate(true)
            }
        })

        // Verificar actualizaciones al cargar
        detectUpdate()

        // Verificar periódicamente cada 60 segundos
        const interval = setInterval(() => {
            navigator.serviceWorker.getRegistration().then((reg) => {
                reg?.update()
            })
        }, 60000)

        return () => clearInterval(interval)
    }, [])

    const handleUpdate = () => {
        if (!registration?.waiting) return

        // Enviar mensaje al SW esperando para que haga skipWaiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })

        // Escuchar cuando el nuevo SW tome control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Recargar la página para usar el nuevo SW
            window.location.reload()
        })
    }

    const handleDismiss = () => {
        setShowUpdate(false)
    }

    if (!showUpdate) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-in slide-in-from-bottom-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl p-4 flex items-center justify-between max-w-md mx-auto border border-blue-500/50">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Nueva versión disponible</p>
                        <p className="text-xs text-blue-100 mt-0.5">
                            Actualiza para obtener las mejoras
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                    <button
                        onClick={handleDismiss}
                        className="text-blue-100 hover:text-white px-2 py-1 rounded text-sm transition-colors"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                    <button
                        onClick={handleUpdate}
                        className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-md hover:shadow-lg active:scale-95"
                    >
                        Actualizar
                    </button>
                </div>
            </div>
        </div>
    )
}
