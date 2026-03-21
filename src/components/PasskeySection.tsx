'use client'

import { useState, useEffect } from 'react'
import { usePasskey } from '@/hooks/usePasskey'

export default function PasskeySection() {
    const { registrar, loading, error, verificarSoporte } = usePasskey()
    const [soporta, setSoporta] = useState(false)
    const [activado, setActivado] = useState(false)
    const [mensajeExito, setMensajeExito] = useState(false)

    useEffect(() => {
        verificarSoporte().then(setSoporta)
        // Usar passkey_registered (no passkey_prompt_dismissed que se setea también al descartar el banner)
        const yaActivado = localStorage.getItem('passkey_registered') === 'true'
        setActivado(yaActivado)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    if (!soporta) return null

    async function handleActivar() {
        try {
            // Siempre resetear antes de registrar para evitar conflictos con credenciales previas
            const token = localStorage.getItem('fidelizacion_token')
            const headers: Record<string, string> = {}
            if (token) headers['Authorization'] = `Bearer ${token}`
            await fetch('/api/auth/passkey/reset', { method: 'POST', headers })

            await registrar()
            localStorage.setItem('passkey_prompt_dismissed', 'true')
            localStorage.setItem('passkey_registered', 'true')
            setActivado(true)
            setMensajeExito(true)
            setTimeout(() => setMensajeExito(false), 3000)
        } catch {
            // error ya manejado en el hook
        }
    }

    return (
        <div className="bg-slate-900 rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">👆</span>
                    <div>
                        <p className="text-white font-semibold text-sm">Huella / Face ID</p>
                        <p className="text-slate-400 text-xs">
                            {activado ? 'Ingresá sin contraseña' : 'Activá el acceso biométrico'}
                        </p>
                    </div>
                </div>

                {mensajeExito ? (
                    <span className="text-green-400 text-sm font-semibold">✓ Activado</span>
                ) : (
                    <button
                        onClick={handleActivar}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                        {loading ? 'Activando...' : activado ? 'Re-registrar' : 'Activar'}
                    </button>
                )}
            </div>

            {error && (
                <p className="text-red-400 text-xs mt-2">{error}</p>
            )}
        </div>
    )
}
