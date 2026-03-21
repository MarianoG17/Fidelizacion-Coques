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
                className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl"
                style={{ animation: 'slideUp 0.35s ease-out forwards' }}
            >
                <style jsx>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

                <div className="bg-slate-800 px-4 pt-3 pb-6">
                {/* Drag handle — indica que es un panel deslizable */}
                <div className="flex justify-center mb-3">
                    <div className="w-10 h-1 bg-slate-600 rounded-full" />
                </div>
                    <div className="max-w-sm mx-auto">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {/* App icon placeholder */}
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl flex-shrink-0">
                                    🥐
                                </div>
                                <div>
                                    <p className="text-white font-bold text-base leading-tight">Instalá Coques</p>
                                    <p className="text-slate-400 text-xs mt-0.5">Acceso rápido desde tu pantalla de inicio</p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="text-slate-400 hover:text-white transition-colors p-1 -mt-1 -mr-1"
                                aria-label="Cerrar"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Steps */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-slate-700 rounded-xl px-4 py-3">
                                <span className="text-slate-400 text-sm font-semibold w-4 flex-shrink-0">1</span>
                                <p className="text-white text-sm flex-1">
                                    Tocá{' '}
                                    <span className="inline-flex items-center gap-1 bg-slate-600 text-blue-300 px-2 py-0.5 rounded-md text-xs font-mono mx-0.5">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Compartir
                                    </span>{' '}
                                    en la barra de Safari
                                </p>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-700 rounded-xl px-4 py-3">
                                <span className="text-slate-400 text-sm font-semibold w-4 flex-shrink-0">2</span>
                                <p className="text-white text-sm flex-1">
                                    Elegí{' '}
                                    <span className="text-blue-300 font-semibold">
                                        "Agregar a pantalla de inicio"
                                    </span>
                                </p>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-700 rounded-xl px-4 py-3">
                                <span className="text-slate-400 text-sm font-semibold w-4 flex-shrink-0">3</span>
                                <p className="text-white text-sm flex-1">
                                    Tocá <span className="text-blue-300 font-semibold">"Agregar"</span> en la esquina superior derecha
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
