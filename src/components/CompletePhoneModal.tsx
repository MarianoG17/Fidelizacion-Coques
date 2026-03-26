'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface CompletePhoneModalProps {
    isOpen: boolean
    userName: string | null
}

export default function CompletePhoneModal({ isOpen, userName }: CompletePhoneModalProps) {
    const router = useRouter()
    const { update } = useSession()
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!phone.trim()) {
            setError('El teléfono es requerido')
            return
        }

        // Validar formato de teléfono - FLEXIBILIZADO para aceptar interior e internacionales
        const cleanPhone = phone.replace(/[^\d+]/g, '')

        // Validación mínima: al menos 8 dígitos
        const digitsOnly = cleanPhone.replace(/\D/g, '')
        if (digitsOnly.length < 8) {
            setError('El teléfono debe tener al menos 8 dígitos')
            return
        }

        // Validación máxima: no más de 15 dígitos (estándar internacional E.164)
        if (digitsOnly.length > 15) {
            setError('El teléfono no puede tener más de 15 dígitos')
            return
        }

        // Validación específica para formatos comunes (ayuda al usuario pero no bloquea)
        // Si tiene 10 dígitos sin + y no empieza con código válido argentino, dar hint
        if (digitsOnly.length === 10 && !cleanPhone.startsWith('+')) {
            // Verificar si podría ser un número del interior sin código de área completo
            const startsWithValidCode = /^(11|15|2[2-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])/.test(digitsOnly)
            if (!startsWithValidCode) {
                setError('Para CABA: 11 XXXX-XXXX. Para interior: incluí código de área (ej: 341, 3456). Para internacional: usá +código')
                return
            }
        }

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/complete-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone.trim() })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error al actualizar teléfono')
            }

            console.log('[CompletePhoneModal] Teléfono actualizado exitosamente:', data)

            // Guardar nuevo token JWT con estado actualizado
            if (data.token) {
                localStorage.setItem('fidelizacion_token', data.token)
            }

            // Forzar que NextAuth actualice el JWT en cookie (needsPhone: false)
            // Esto garantiza que cuando recargue la página, la sesión ya esté actualizada
            console.log('[CompletePhoneModal] Actualizando sesión de NextAuth...')
            await update()

            // Hard redirect para limpiar todo el estado de React
            console.log('[CompletePhoneModal] Redirigiendo para actualizar sesión...')
            window.location.href = '/pass'
        } catch (e) {
            console.error('[CompletePhoneModal] Error:', e)
            setError(e instanceof Error ? e.message : 'Error al actualizar teléfono')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        ¡Bienvenido{userName ? `, ${userName}` : ''}!
                    </h2>
                    {/* ✅ UX Quick Win #1: Explicar por qué se necesita teléfono */}
                    <p className="text-gray-700 mb-3">
                        🎉 ¡Casi listo! Para enviarte tu código QR y notificaciones de beneficios, necesitamos tu teléfono.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                        <p className="text-sm text-blue-700 font-semibold mb-2">
                            📱 Lo usaremos para:
                        </p>
                        <ul className="text-sm text-blue-600 space-y-1">
                            <li>• Enviarte tu pase digital</li>
                            <li>• Notificarte beneficios disponibles</li>
                            <li>• Contactarte sobre tu auto en el lavadero</li>
                        </ul>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número de teléfono
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+54 9 11 1234-5678"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            autoFocus
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Ingresá tu número completo (mínimo 8 dígitos)<br />
                            <strong>CABA:</strong> 1112345678 o +5491112345678<br />
                            <strong>Interior:</strong> 3456268265 o +543456268265<br />
                            <strong>Internacional:</strong> +1234567890
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Completando registro...
                            </span>
                        ) : (
                            'Completar Registro'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
