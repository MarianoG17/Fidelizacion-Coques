// src/components/ConnectionStatus.tsx
'use client'
import { useState, useEffect } from 'react'

/**
 * Componente que muestra el estado de conexión a internet
 * Aparece cuando se pierde o recupera la conexión
 */
export default function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(true)
    const [showBanner, setShowBanner] = useState(false)

    useEffect(() => {
        // Inicializar con estado actual
        setIsOnline(navigator.onLine)

        const handleOnline = () => {
            console.log('[ConnectionStatus] Conexión restaurada')
            setIsOnline(true)
            setShowBanner(true)
            // Ocultar banner de éxito después de 3 segundos
            setTimeout(() => setShowBanner(false), 3000)
        }

        const handleOffline = () => {
            console.log('[ConnectionStatus] Conexión perdida')
            setIsOnline(false)
            setShowBanner(true)
            // No ocultamos el banner offline automáticamente
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
            className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-3 text-center text-white font-semibold text-sm transition-all duration-300 ${isOnline
                    ? 'bg-green-600 shadow-lg animate-slide-down'
                    : 'bg-red-600 shadow-lg'
                }`}
            style={{
                animation: isOnline ? 'slideDown 0.3s ease-out' : 'none'
            }}
        >
            <div className="flex items-center justify-center gap-2">
                {isOnline ? (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Conexión restaurada</span>
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Sin conexión a internet</span>
                    </>
                )}
            </div>
        </div>
    )
}
