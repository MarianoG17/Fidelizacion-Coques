'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

interface CompletePhoneModalProps {
    isOpen: boolean
    userName: string | null
}

export default function CompletePhoneModal({ isOpen, userName }: CompletePhoneModalProps) {
    const router = useRouter()
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

        // Validar formato de teléfono
        const cleanPhone = phone.replace(/\D/g, '')

        // Validar longitud mínima
        if (cleanPhone.length < 8) {
            setError('El teléfono debe tener al menos 8 dígitos')
            return
        }

        // Para números argentinos de celular, verificar formato
        // Aceptamos: 1112345678 (10 dígitos), 541112345678 (12 dígitos), +5491112345678 (13 dígitos)
        if (cleanPhone.length === 10) {
            // Debe empezar con 11 o 15
            if (!cleanPhone.startsWith('11') && !cleanPhone.startsWith('15')) {
                setError('Número celular argentino debe empezar con 11 o 15. Ej: 1112345678')
                return
            }
        } else if (cleanPhone.length === 12) {
            // Formato 541112345678
            if (!cleanPhone.startsWith('5411') && !cleanPhone.startsWith('5415')) {
                setError('Número con código de país debe ser +54 11 o +54 15. Ej: 541112345678')
                return
            }
        } else if (cleanPhone.length === 13) {
            // Formato +5491112345678
            if (!cleanPhone.startsWith('54911') && !cleanPhone.startsWith('54915')) {
                setError('Número con código internacional debe ser +549 11 o +549 15. Ej: +5491112345678')
                return
            }
        } else if (cleanPhone.length < 10) {
            setError('El número es muy corto. Debe tener 10 dígitos. Ej: 1112345678')
            return
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

            // IMPORTANTE: Hacer un hard redirect para forzar a NextAuth a regenerar la sesión
            // NextAuth usa JWT y necesita consultar la DB nuevamente para obtener needsPhone: false
            // window.location.href hace un full page reload, lo que fuerza a NextAuth a:
            // 1. Validar el token de sesión
            // 2. Ejecutar el callback jwt() que consulta la DB
            // 3. Regenerar el token con los datos actualizados (needsPhone: false)
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
                    <p className="text-gray-600">
                        Para completar tu registro, necesitamos tu número de teléfono
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número de teléfono celular
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="1112345678"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            autoFocus
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Ingresá tu número celular completo (10 dígitos)<br />
                            Ejemplos válidos: <strong>1112345678</strong>, <strong>1512345678</strong>, <strong>+5491112345678</strong>
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
