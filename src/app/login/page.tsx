'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [paso, setPaso] = useState<'phone' | 'otp' | 'loading'>('phone')
  const [error, setError] = useState('')

  async function solicitarOTP() {
    if (!phone) {
      setError('Ingresá tu número de celular')
      return
    }

    setPaso('loading')
    setError('')

    try {
      const phoneFormatted = phone.startsWith('+') ? phone : `+549${phone.replace(/\D/g, '')}`
      
      const res = await fetch('/api/otp/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneFormatted }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar código')
      }

      setPaso('otp')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar código')
      setPaso('phone')
    }
  }

  async function validarOTP() {
    if (!otp) {
      setError('Ingresá el código de 6 dígitos')
      return
    }

    setPaso('loading')
    setError('')

    try {
      const phoneFormatted = phone.startsWith('+') ? phone : `+549${phone.replace(/\D/g, '')}`
      
      const res = await fetch('/api/otp/validar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-api-key': process.env.NEXT_PUBLIC_LOCAL_API_KEY || '',
        },
        body: JSON.stringify({ phone: phoneFormatted, otp }),
      })

      const data = await res.json()

      if (!res.ok || !data.valido) {
        throw new Error('Código incorrecto')
      }

      // Guardar token en localStorage
      if (data.cliente?.token) {
        localStorage.setItem('fidelizacion_token', data.cliente.token)
        router.push('/pass')
      } else {
        throw new Error('No se recibió token de autenticación')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al validar código')
      setPaso('otp')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>←</span>
            <span>Volver al inicio</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Iniciar Sesión
          </h1>
          <p className="text-gray-600">
            Ingresá a tu cuenta de Fidelización Coques
          </p>
        </div>

        {/* Phone Step */}
        {paso === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Celular
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2615551234"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                Sin 0, sin 15, sin espacios
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={solicitarOTP}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Enviar Código
            </button>

            <div className="text-center">
              <a
                href="/activar"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                ¿No tenés cuenta? Registrate
              </a>
            </div>
          </div>
        )}

        {/* OTP Step */}
        {paso === 'otp' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4">
              <p className="text-sm">
                📱 Te enviamos un código de 6 dígitos al número{' '}
                <span className="font-semibold">{phone}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Verificación
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={validarOTP}
              disabled={otp.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Verificar Código
            </button>

            <button
              onClick={() => {
                setPaso('phone')
                setOtp('')
                setError('')
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800"
            >
              ← Cambiar número
            </button>
          </div>
        )}

        {/* Loading */}
        {paso === 'loading' && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Procesando...</p>
          </div>
        )}
      </div>
    </div>
  )
}
