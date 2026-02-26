'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

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
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-2xl animate-slide-up">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="text-3xl">📱</div>
                        <div>
                            <p className="font-bold text-base sm:text-lg">¡Instalá Coques Bakery en tu celular!</p>
                            <p className="text-sm sm:text-base text-purple-100">Acceso rápido, funciona offline y recibí notificaciones</p>
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
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Banner de instrucciones para iOS Safari
    if (showIOSInstructions) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-2xl animate-slide-up">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="text-3xl">📱</div>
                            <div>
                                <p className="font-bold text-base sm:text-lg">¡Instalá Coques Bakery en tu iPhone!</p>
                                <p className="text-sm text-blue-100">Acceso rápido desde tu pantalla de inicio</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                        <p className="font-semibold mb-2 text-sm sm:text-base">Seguí estos pasos:</p>
                        <ol className="space-y-2 text-sm sm:text-base">
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-yellow-300 flex-shrink-0">1.</span>
                                <span>Tocá el botón <strong className="inline-flex items-center px-1.5 py-0.5 bg-white/20 rounded text-yellow-300">Compartir <span className="ml-1">□↑</span></strong> en la barra inferior</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-yellow-300 flex-shrink-0">2.</span>
                                <span>Deslizá hacia abajo y tocá <strong className="text-yellow-300">"Agregar a pantalla de inicio"</strong></span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-yellow-300 flex-shrink-0">3.</span>
                                <span>Confirmá tocando <strong className="text-yellow-300">"Agregar"</strong> arriba a la derecha</span>
                            </li>
                        </ol>
                        <p className="mt-3 text-xs sm:text-sm text-blue-100 italic">
                            💡 La app aparecerá en tu pantalla de inicio como cualquier otra app
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
