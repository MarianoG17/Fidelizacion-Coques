// src/components/PasskeyPrompt.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePasskey } from '@/hooks/usePasskey'

interface PasskeyPromptProps {
    /** Mostrar solo si el usuario no tiene passkeys registradas */
    autoHide?: boolean
}

/**
 * Banner para promover la activación de passkeys (biometría)
 * Se muestra en el perfil del usuario después del login
 */
export default function PasskeyPrompt({ autoHide = true }: PasskeyPromptProps) {
    const [dismissed, setDismissed] = useState(false)
    const [hasPasskey, setHasPasskey] = useState(false)
    const { registrar, loading, error, verificarSoporte } = usePasskey()
    const [soportaBiometria, setSoportaBiometria] = useState(false)

    // Verificar si ya fue descartado o si ya tiene passkeys
    useEffect(() => {
        // Verificar si fue descartado manualmente
        const wasDismissed = localStorage.getItem('passkey_prompt_dismissed') === 'true'
        setDismissed(wasDismissed)

        // Verificar soporte de biometría
        verificarSoporte().then(setSoportaBiometria)

        // Si autoHide, verificar si ya tiene passkeys registradas
        if (autoHide) {
            // Esto lo determinaríamos con una llamada al servidor, pero por ahora
            // asumimos que no tiene si está viendo el prompt
            // En una implementación completa, harías: GET /api/auth/passkey/list
        }
    }, [autoHide, verificarSoporte])

    // ✅ NUEVO: Descartar automáticamente si hay error de sesión expirada
    useEffect(() => {
        if (error && error.includes('sesión')) {
            console.log('[PASSKEY PROMPT] ⚠️ Sesión expirada detectada - descartando prompt automáticamente')
            // Descartar para esta sesión (el usuario será redirigido al login)
            setDismissed(true)
        }
    }, [error])

    // No mostrar si:
    // - Fue descartado manualmente
    // - No soporta biometría
    // - Ya tiene passkey (si autoHide está activo)
    if (dismissed || !soportaBiometria || (autoHide && hasPasskey)) {
        return null
    }

    async function handleActivate() {
        try {
            await registrar()

            // Mostrar mensaje de éxito
            alert('✅ Biometría activada exitosamente\n\nLa próxima vez podrás ingresar con tu huella o Face ID')

            // Ocultar el banner
            setDismissed(true)
            localStorage.setItem('passkey_prompt_dismissed', 'true')
        } catch (err) {
            // El error ya se maneja en el hook
        }
    }

    function handleDismiss() {
        setDismissed(true)
        localStorage.setItem('passkey_prompt_dismissed', 'true')
    }

    function handleNotNow() {
        // Solo ocultar en esta sesión (no guardar en localStorage)
        setDismissed(true)
    }

    return (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-start gap-4">
                {/* Icono */}
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🔐</span>
                    </div>
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Activá el acceso rápido
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Usá tu huella digital o Face ID para ingresar en segundos. Es más seguro y rápido que recordar contraseñas.
                    </p>

                    {/* Beneficios */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                            <span className="text-green-600">✓</span>
                            <span>Login en 1 segundo</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                            <span className="text-green-600">✓</span>
                            <span>Más seguro</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                            <span className="text-green-600">✓</span>
                            <span>Sin contraseñas</span>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">
                            {error}
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleActivate}
                            disabled={loading}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Activando...</span>
                                </>
                            ) : (
                                <>
                                    <span>👆</span>
                                    <span>Activar Ahora</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleNotNow}
                            disabled={loading}
                            className="bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 transition-colors touch-manipulation"
                        >
                            Ahora no
                        </button>

                        <button
                            onClick={handleDismiss}
                            disabled={loading}
                            className="text-gray-500 hover:text-gray-700 active:text-gray-900 px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation"
                        >
                            No volver a mostrar
                        </button>
                    </div>
                </div>

                {/* Botón cerrar (alternativo) - Más grande para iOS */}
                <button
                    onClick={handleNotNow}
                    disabled={loading}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors p-2 -mr-2 -mt-2 touch-manipulation"
                    aria-label="Cerrar"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
