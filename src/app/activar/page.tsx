'use client'
// src/app/activar/page.tsx
// Página de registro — el cliente crea su cuenta con email y contraseña
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ActivarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [paso, setPaso] = useState<'form' | 'confirmando' | 'listo' | 'error'>('form')
  const [nombre, setNombre] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [consentimiento, setConsentimiento] = useState(false)
  const [error, setError] = useState('')
  const [codigoReferido, setCodigoReferido] = useState<string | null>(null)

  // Detectar código de referido en la URL
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setCodigoReferido(ref)
    }
  }, [searchParams])

  function validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  function validarPassword(password: string): boolean {
    return password.length >= 6
  }

  async function registrar() {
    // Validaciones
    if (!nombre.trim()) {
      setError('El nombre es requerido')
      return
    }
    if (!email.trim()) {
      setError('El email es requerido')
      return
    }
    if (!validarEmail(email)) {
      setError('Email inválido')
      return
    }
    if (!password) {
      setError('La contraseña es requerida')
      return
    }
    if (!validarPassword(password)) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (!phone.trim()) {
      setError('El teléfono es requerido')
      return
    }
    if (!consentimiento) {
      setError('Necesitás aceptar los términos para continuar')
      return
    }

    setPaso('confirmando')
    setError('')

    try {
      // Solo números, sin prefijo +549
      const phoneFormatted = phone.replace(/\D/g, '')
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          nombre: nombre.trim(),
          phone: phoneFormatted,
          codigoReferido: codigoReferido || undefined, // Enviar código de referido si existe
        }),
      })

      // Check response status first
      if (!res.ok) {
        // Try to parse error message from response
        let errorMessage = 'Error al crear la cuenta'
        try {
          const data = await res.json()
          errorMessage = data.error || errorMessage
        } catch (e) {
          // If JSON parsing fails, check status code
          if (res.status === 405) {
            errorMessage = 'Método no permitido. Contacte al administrador.'
          } else if (res.status === 400) {
            errorMessage = 'Datos inválidos. Verifique su información.'
          }
        }
        throw new Error(errorMessage)
      }

      const data = await res.json()

      // Guardar token en localStorage
      if (data.data?.token) {
        localStorage.setItem('fidelizacion_token', data.data.token)
        setPaso('listo')
        setTimeout(() => router.push('/pass'), 1500)
      } else {
        throw new Error('No se recibió token de autenticación')
      }
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
        {/* Botón Volver */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Volver</span>
        </button>

        {/* Logo / marca */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">☕</div>
          <h1 className="text-2xl font-bold text-slate-800">Crear Cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">
            Acumulá beneficios en Coques y el Lavadero
          </p>
        </div>

        {/* Banner de referido si hay código */}
        {codigoReferido && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 mb-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-4xl">🎁</span>
              <div className="flex-1">
                <p className="text-white font-bold text-xl mb-2">
                  ¡Tu amigo te invitó!
                </p>
                <p className="text-white text-sm leading-relaxed">
                  Al registrarte con este link, ambos reciben visitas bonus para subir de nivel más rápido 🚀
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Beneficios visibles como incentivo */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-800 mb-2">
            {codigoReferido ? '¡Y además ganás!' : '¿Qué ganás?'}
          </p>
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tu nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="¿Cómo te llamás?"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
              disabled={paso === 'confirmando'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
              disabled={paso === 'confirmando'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
                disabled={paso === 'confirmando'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={paso === 'confirmando'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="11 1234-5678"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
              disabled={paso === 'confirmando'}
            />
            <p className="text-xs text-gray-400 mt-1">Sin el 0 ni el 15 (ej: 1112345678)</p>
          </div>

          {/* Consentimiento */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentimiento}
              onChange={(e) => setConsentimiento(e.target.checked)}
              className="mt-1 w-5 h-5 rounded accent-slate-800"
              disabled={paso === 'confirmando'}
            />
            <span className="text-sm text-gray-600">
              Acepto recibir comunicaciones sobre mis beneficios. Mis datos no se compartirán con terceros.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-700 text-sm font-medium mb-2">{error}</p>
              {(error.includes('ya está registrado') || error.includes('ya existe')) && (
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-red-600 hover:text-red-700 underline font-medium transition-colors"
                >
                  Ir al inicio de sesión →
                </button>
              )}
            </div>
          )}

          <button
            onClick={registrar}
            disabled={paso === 'confirmando' || !consentimiento}
            className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-opacity"
          >
            {paso === 'confirmando' ? 'Creando cuenta...' : 'Crear mi cuenta gratis'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Podés darte de baja en cualquier momento
          </p>
        </div>
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
