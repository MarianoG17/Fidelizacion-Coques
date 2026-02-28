'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [showIOSInstructions, setShowIOSInstructions] = useState(false)
    const [showBanner, setShowBanner] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)

    useEffect(() => {
        // Verificar si ya está instalada
        const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://')

        setIsStandalone(isInStandaloneMode)

        if (isInStandaloneMode) {
            return // Ya está instalada, no mostrar nada
        }

        // Verificar si ya se cerró el banner previamente
        const bannerDismissed = localStorage.getItem('installBannerDismissed')
        const dismissedTime = bannerDismissed ? parseInt(bannerDismissed) : 0
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)

        // Detectar iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
        const isIOSSafari = isIOS && /(Safari)/.test(navigator.userAgent) && !(window as any).chrome

        if (isIOSSafari) {
            // Para iOS Safari, mostrar instrucciones después de 3 segundos si no se descartó recientemente
            if (dismissedTime < oneDayAgo) {
                setTimeout(() => setShowIOSInstructions(true), 3000)
            }
        }

        // Capturar el evento beforeinstallprompt (Android/Chrome/Edge)
        const handler = (e: Event) => {
            e.preventDefault()
            console.log('[PWA] beforeinstallprompt capturado')
            setDeferredPrompt(e as BeforeInstallPromptEvent)

            // Mostrar banner después de 3 segundos si no se descartó recientemente
            if (dismissedTime < oneDayAgo) {
                setTimeout(() => setShowBanner(true), 3000)
            }
        }

        window.addEventListener('beforeinstallprompt', handler)

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        console.log('[PWA] Mostrando prompt de instalación')
        deferredPrompt.prompt()

        const { outcome } = await deferredPrompt.userChoice
        console.log('[PWA] User choice:', outcome)

        if (outcome === 'accepted') {
            setShowBanner(false)
            localStorage.setItem('installBannerDismissed', Date.now().toString())
        }

        setDeferredPrompt(null)
    }

    const handleDismiss = () => {
        setShowBanner(false)
        setShowIOSInstructions(false)
        localStorage.setItem('installBannerDismissed', Date.now().toString())
    }

    // Si ya está instalada, no mostrar nada
    if (isStandalone) return null

    // Banner para Android/Chrome (cuando el evento esté disponible)
    if (showBanner && deferredPrompt) {
        return (
            <div
                className="fixed bottom-0 left-0 right-0 z-50 p-4 shadow-2xl"
                style={{
                    background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(59, 130, 246))',
                    animation: 'slideUp 0.3s ease-out forwards'
                }}
            >
                <style jsx>{`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 text-white">
                        <div className="text-3xl">📱</div>
                        <div>
                            <p className="font-bold text-base sm:text-lg">¡Instalá Coques Bakery en tu celular!</p>
                            <p className="text-sm sm:text-base opacity-90">Acceso rápido, funciona offline y recibí notificaciones</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleInstallClick}
                            className="bg-white text-purple-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold hover:bg-purple-50 transition-all whitespace-nowrap text-sm sm:text-base shadow-lg"
                        >
                            Instalar App
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Banner de instrucciones para iOS Safari
    if (showIOSInstructions) {
        return (
            <div
                className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 shadow-2xl"
                style={{
                    background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(99, 102, 241))',
                    animation: 'slideUp 0.3s ease-out forwards'
                }}
            >
                <style jsx>{`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
                <div className="max-w-lg mx-auto text-white">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="text-2xl sm:text-3xl">📱</div>
                            <div>
                                <p className="font-bold text-sm sm:text-base leading-tight">Instalá la App de Coques</p>
                                <p className="text-xs sm:text-sm opacity-90 mt-0.5">Tus puntos y beneficios siempre a mano</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0 text-lg sm:text-xl"
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-xl p-3 sm:p-4 space-y-2.5">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-white bg-opacity-25 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base">
                                1
                            </div>
                            <p className="text-xs sm:text-sm leading-relaxed">
                                Tocá <span className="inline-flex items-center px-2 py-0.5 bg-white bg-opacity-20 rounded-md font-medium mx-1">□↑</span> abajo
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-white bg-opacity-25 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base">
                                2
                            </div>
                            <p className="text-xs sm:text-sm leading-relaxed">
                                Seleccioná <span className="font-semibold">"Agregar a Inicio"</span>
                            </p>
                        </div>

                        <div className="pt-2 border-t border-white border-opacity-20">
                            <p className="text-xs opacity-90 text-center">
                                ✨ Acceso rápido como app nativa
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
