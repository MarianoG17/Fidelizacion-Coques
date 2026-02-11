'use client'
// src/app/activar/page.tsx
// Página de onboarding — el cliente activa su cuenta con consentimiento explícito
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ActivarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteId = searchParams.get('id')

  const [paso, setPaso] = useState<'form' | 'confirmando' | 'listo' | 'error'>('form')
  const [nombre, setNombre] = useState('')
  const [phone, setPhone] = useState('')
  const [consentimiento, setConsentimiento] = useState(false)
  const [error, setError] = useState('')

  async function activar() {
    if (!consentimiento) {
      setError('Necesitás aceptar los términos para continuar')
      return
    }
    if (!phone && !clienteId) {
      setError('Ingresá tu número de celular')
      return
    }

    setPaso('confirmando')
    setError('')

    try {
      let id = clienteId

      // Si no hay clienteId en URL, crear el cliente primero
      if (!id) {
        const phoneFormatted = phone.startsWith('+') ? phone : `+549${phone.replace(/\D/g, '')}`
        const createRes = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneFormatted, nombre, fuenteOrigen: 'AUTOREGISTRO' }),
        })
        const createJson = await createRes.json()
        id = createJson.data?.id
      }

      if (!id) throw new Error('No se pudo crear el cliente')

      // Activar con consentimiento
      const activarRes = await fetch(`/api/clientes/${id}/activar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const activarJson = await activarRes.json()

      if (!activarRes.ok) throw new Error(activarJson.error || 'Error al activar')

      // Guardar token en localStorage
      localStorage.setItem('fidelizacion_token', activarJson.data.token)

      setPaso('listo')
      setTimeout(() => router.push('/pass'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
      setPaso('form')
    }
  }

  if (paso === 'listo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Bienvenido!</h2>
          <p className="text-gray-500">Redirigiendo a tu pass...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-6">
      <div className="w-full max-w-sm">
        {/* Logo / marca */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">☕</div>
          <h1 className="text-2xl font-bold text-slate-800">Fidelización Zona</h1>
          <p className="text-gray-500 text-sm mt-1">
            Acumulá beneficios en Coques y el Lavadero
          </p>
        </div>

        {/* Beneficios visibles como incentivo */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-800 mb-2">¿Qué ganás?</p>
          <ul className="space-y-1">
            {[
              'Café gratis mientras lavamos tu auto',
              'Beneficios exclusivos por nivel',
              'Notificaciones cuando tu auto está listo',
            ].map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-blue-700">
                <span className="text-blue-500 mt-0.5">✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Formulario */}
        {!clienteId && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tu nombre (opcional)
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="¿Cómo te llamás?"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tu celular
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11 1234-5678"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
              />
              <p className="text-xs text-gray-400 mt-1">Sin el 0 ni el 15 (ej: 1112345678)</p>
            </div>
          </>
        )}

        {/* Consentimiento */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={consentimiento}
            onChange={(e) => setConsentimiento(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-slate-800"
          />
          <span className="text-sm text-gray-600">
            Acepto recibir comunicaciones sobre mis beneficios y el estado de mi auto. Mis datos
            no se compartirán con terceros.
          </span>
        </label>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={activar}
          disabled={paso === 'confirmando' || !consentimiento}
          className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-opacity"
        >
          {paso === 'confirmando' ? 'Activando...' : 'Activar mi cuenta gratis'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Podés darte de baja en cualquier momento
        </p>
      </div>
    </div>
  )
}

export default function ActivarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Cargando...</div>
      </div>
    }>
      <ActivarContent />
    </Suspense>
  )
}
