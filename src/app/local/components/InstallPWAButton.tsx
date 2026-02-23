'use client'
// src/app/local/components/InstallPWAButton.tsx
import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWAButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstallable, setIsInstallable] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Detectar si la app ya está instalada
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
            return
        }

        // Capturar el evento beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault()
            console.log('[PWA] beforeinstallprompt capturado')
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setIsInstallable(true)
        }

        window.addEventListener('beforeinstallprompt', handler)

        // Detectar si es Android
        const isAndroid = /Android/i.test(navigator.userAgent)
        if (isAndroid) {
            // En Android, siempre mostrar el botón aunque no se capture el evento
            // porque el usuario puede instalar manualmente desde el menú
            setIsInstallable(true)
        }

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstallClick = async () => {
        console.log('[PWA] Botón de instalación clicked')

        if (deferredPrompt) {
            // Si tenemos el prompt capturado, usarlo
            console.log('[PWA] Mostrando prompt de instalación')
            deferredPrompt.prompt()

            const { outcome } = await deferredPrompt.userChoice
            console.log('[PWA] User choice:', outcome)

            if (outcome === 'accepted') {
                setIsInstalled(true)
            }

            setDeferredPrompt(null)
            setIsInstallable(false)
        } else {
            // Si no tenemos el prompt, mostrar instrucciones manuales
            console.log('[PWA] Mostrando instrucciones manuales')
            alert(
                'Para instalar la app:\n\n' +
                '1. Toca el menú de Chrome (⋮) arriba a la derecha\n' +
                '2. Selecciona "Agregar a pantalla principal" o "Instalar aplicación"\n' +
                '3. Confirma la instalación\n\n' +
                'La app aparecerá en tu pantalla principal'
            )
        }
    }

    // No mostrar nada si ya está instalada
    if (isInstalled) {
        return null
    }

    // No mostrar en desktop
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
        return null
    }

    // Solo mostrar en móvil y si es instalable
    if (!isInstallable) {
        return null
    }

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <button
                onClick={handleInstallClick}
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-semibold hover:scale-105 transition-transform"
            >
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
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                </svg>
                <span>Instalar App</span>
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                </svg>
            </button>

            {/* Tooltip informativo */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                ¡Instala la app para acceso rápido!
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
            </div>
        </div>
    )
}
