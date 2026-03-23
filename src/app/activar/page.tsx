'use client'
// src/app/activar/page.tsx
// Página de registro — el cliente crea su cuenta con email y contraseña
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePasskey } from '@/hooks/usePasskey'
import { signIn } from 'next-auth/react'

function ActivarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { registrar: activarPasskey, loading: loadingPasskey, verificarSoporte } = usePasskey()

  const [paso, setPaso] = useState<'form' | 'confirmando' | 'passkey' | 'error'>('form')
  const [nombre, setNombre] = useState('')
  const [phone, setPhone] = useState('') // valor display (formateado)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [consentimiento, setConsentimiento] = useState(false)
  const [error, setError] = useState('')
  const [codigoReferido, setCodigoReferido] = useState<string | null>(null)
  const [referidorNombre, setReferidorNombre] = useState<string | null>(null)
  const [codigoInvalido, setCodigoInvalido] = useState(false)
  const [fuenteQR, setFuenteQR] = useState<string | null>(null)
  const [nivelQR, setNivelQR] = useState<string | null>(null)
  const [beneficiosNivel, setBeneficiosNivel] = useState<string[]>([])
  const [cargandoReferido, setCargandoReferido] = useState(false)
  const [soportaPasskey, setSoportaPasskey] = useState(false)
  const [passkeyError, setPasskeyError] = useState('')
  const [passkeyExitoso, setPasskeyExitoso] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Validar código de referido contra el backend
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (!ref) return

    setCargandoReferido(true)
    fetch('/api/referidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigoReferido: ref }),
    })
      .then(res => {
        if (res.ok) {
          res.json().then(d => {
            setCodigoReferido(ref)
            setReferidorNombre(d.data?.referidorNombre ?? null)
          })
        } else {
          setCodigoInvalido(true)
        }
      })
      .catch(() => {
        // Error de red — usar el código de todas formas
        setCodigoReferido(ref)
      })
      .finally(() => setCargandoReferido(false))
  }, [searchParams])

  // Leer parámetros de QR personalizado (fuente y nivel) y buscar beneficios del nivel
  useEffect(() => {
    const fuente = searchParams.get('fuente')
    const nivel = searchParams.get('nivel')
    if (fuente) setFuenteQR(fuente)
    if (nivel) {
      setNivelQR(nivel)
      fetch(`/api/public/nivel-beneficios?nombre=${encodeURIComponent(nivel)}`)
        .then((r) => r.json())
        .then((data) => { if (data.beneficios?.length) setBeneficiosNivel(data.beneficios) })
        .catch(() => {})
    }
  }, [searchParams])

  // Verificar soporte de passkey en el dispositivo
  useEffect(() => {
    verificarSoporte().then(setSoportaPasskey)
  }, [verificarSoporte])

  // Formatear teléfono — acepta hasta 15 dígitos para interior e internacionales
  // Solo aplica formato visual "XX XXXX-XXXX" para 10 dígitos (CABA/interior arg)
  function formatPhone(value: string): string {
    const hasPlus = value.trimStart().startsWith('+')
    const digits = value.replace(/\D/g, '').slice(0, 15)
    if (digits.length === 10 && !hasPlus) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`
    }
    return hasPlus ? `+${digits}` : digits
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value))
  }

  function validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    // Construir callbackUrl con los params QR para que sobrevivan el redirect de OAuth
    const params = new URLSearchParams()
    if (fuenteQR) params.set('apply_fuente', fuenteQR)
    if (nivelQR) params.set('apply_nivel', nivelQR)
    const callbackUrl = params.toString() ? `/pass?${params.toString()}` : '/pass'
    try {
      await signIn('google', { callbackUrl, redirect: true })
    } catch {
      setIsGoogleLoading(false)
    }
  }

  async function registrar() {
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    if (!email.trim()) { setError('El email es requerido'); return }
    if (!validarEmail(email)) { setError('Email inválido'); return }
    if (!password) { setError('La contraseña es requerida'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (!phone.trim()) { setError('El teléfono es requerido'); return }
    if (!consentimiento) { setError('Necesitás aceptar los términos para continuar'); return }

    setPaso('confirmando')
    setError('')

    try {
      const phoneFormatted = phone.replace(/\D/g, '')

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          nombre: nombre.trim(),
          phone: phoneFormatted,
          codigoReferido: codigoReferido || undefined,
          fuenteConocimiento: fuenteQR || undefined,
          nivelNombre: nivelQR || undefined,
        }),
      })

      if (!res.ok) {
        let errorMessage = 'Error al crear la cuenta'
        try {
          const data = await res.json()
          errorMessage = data.error || errorMessage
        } catch {
          if (res.status === 405) errorMessage = 'Método no permitido. Contacte al administrador.'
          else if (res.status === 400) errorMessage = 'Datos inválidos. Verifique su información.'
        }
        throw new Error(errorMessage)
      }

      const data = await res.json()

      if (data.data?.token) {
        // Guardar JWT en localStorage (el hook usePasskey lo leerá automáticamente)
        localStorage.setItem('fidelizacion_token', data.data.token)

        // Si el dispositivo soporta passkey, mostrar el paso de activación
        if (soportaPasskey) {
          setPaso('passkey')
        } else {
          router.push('/pass')
        }
      } else {
        throw new Error('No se recibió token de autenticación')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
      setPaso('form')
    }
  }

  async function handleActivarPasskey() {
    setPasskeyError('')
    try {
      await activarPasskey()
      // Marcar como configurado para que PasskeyPrompt no aparezca de nuevo en /pass
      localStorage.setItem('passkey_prompt_dismissed', 'true')
      localStorage.setItem('passkey_registered', 'true')
      setPasskeyExitoso(true)
      setTimeout(() => router.push('/pass'), 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo activar'
      // Si el error es de sesión (no debería pasar), redirigir igual
      if (msg.includes('sesión') || msg.includes('401')) {
        router.push('/pass')
      } else {
        setPasskeyError(msg)
      }
    }
  }

  // ── Pantalla: activación de passkey (post-registro) ─────────────────────
  if (paso === 'passkey') {
    if (passkeyExitoso) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Todo listo!</h2>
            <p className="text-gray-500">Acceso rápido activado. Redirigiendo...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Bienvenida */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">¡Cuenta creada!</h2>
            <p className="text-gray-500 text-sm">Un último paso para entrar rápido la próxima vez</p>
          </div>

          {/* Tarjeta passkey */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">👆</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">
                  Activá el acceso con huella o Face ID
                </h3>
                <p className="text-gray-500 text-sm mt-0.5">
                  Entrá sin contraseña la próxima vez
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              La próxima vez que abras la app, vas a poder entrar en un segundo con tu biometría. Sin contraseña, sin pasos extra.
            </p>

            <ul className="space-y-2 mb-6">
              {[
                'Entrás con un toque o mirando la pantalla',
                'Más seguro que una contraseña',
                'Se guarda en tu dispositivo, nunca en el servidor',
              ].map(b => (
                <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                  {b}
                </li>
              ))}
            </ul>

            {passkeyError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                <p className="text-red-700 text-sm">{passkeyError}</p>
              </div>
            )}

            <button
              onClick={handleActivarPasskey}
              disabled={loadingPasskey}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {loadingPasskey ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Activando...
                </>
              ) : (
                <>
                  <span>👆</span>
                  Activar acceso rápido
                </>
              )}
            </button>
          </div>

          <button
            onClick={() => router.push('/pass')}
            disabled={loadingPasskey}
            className="w-full text-gray-500 py-3 text-sm font-medium hover:text-gray-700 transition-colors"
          >
            Ahora no, ir a mi pase →
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario principal ─────────────────────────────────────────────────
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
          <img src="/icon-192x192-v3.png" alt="Coques" className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover" />
          <h1 className="text-2xl font-bold text-slate-800">Crear Cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">
            Acumulá beneficios y descuentos en Coques
          </p>
        </div>

        {/* Banner QR personalizado (ej: FORZA) */}
        {fuenteQR && (
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-5 mb-6 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏋️</span>
              <div>
                <p className="text-white font-bold text-lg">¡Bienvenido desde {fuenteQR}!</p>
                <p className="text-white/80 text-sm">
                  {nivelQR ? `Vas a arrancar como miembro nivel ${nivelQR.charAt(0).toUpperCase() + nivelQR.slice(1)}` : 'Registrate y empezá a acumular beneficios'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner de carga de referido */}
        {cargandoReferido && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-gray-500 text-sm">Verificando código de invitación...</p>
          </div>
        )}

        {/* Banner de referido válido */}
        {codigoReferido && referidorNombre && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 mb-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-4xl">🎁</span>
              <div className="flex-1">
                <p className="text-white font-bold text-xl mb-2">
                  ¡{referidorNombre} te invitó!
                </p>
                <p className="text-white text-sm leading-relaxed">
                  Al registrarte con este link, ambos reciben visitas bonus para subir de nivel más rápido 🚀
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner de código inválido */}
        {codigoInvalido && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <p className="text-amber-800 text-sm font-medium">
              ⚠️ El código de invitación no es válido. Podés registrarte igual, sin el bonus.
            </p>
          </div>
        )}

        {/* Beneficios visibles como incentivo */}
        {!codigoReferido && !codigoInvalido && (
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <p className="text-sm font-semibold text-blue-800 mb-2">¿Qué ganás?</p>
            <ul className="space-y-1">
              {(fuenteQR && beneficiosNivel.length > 0
                ? beneficiosNivel
                : fuenteQR
                  ? ['Beneficios exclusivos por nivel', 'Descuentos especiales en tortas y productos']
                  : ['10% de descuento en tu primera visita', 'Descuentos en tortas y productos de cafetería', 'Beneficios exclusivos según tu nivel', 'Acumulá visitas y subí de Bronce a Oro']
              ).map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-blue-700">
                  <span className="text-blue-500 mt-0.5">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || paso === 'confirmando'}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white mb-4"
        >
          {isGoogleLoading ? (
            <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          <span className="font-medium text-gray-700">
            {isGoogleLoading ? 'Redirigiendo...' : 'Registrarme con Google'}
          </span>
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">O completá el formulario</span>
          </div>
        </div>

        {/* Formulario — Enter envía el form */}
        <form
          onSubmit={(e) => { e.preventDefault(); registrar() }}
          className="space-y-4"
        >
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
              autoFocus
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
              onChange={handlePhoneChange}
              placeholder="11 1234-5678"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
              disabled={paso === 'confirmando'}
            />
            <p className="text-xs text-gray-400 mt-1">Sin el 0 ni el 15 (ej: 11 1234-5678)</p>
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
              {(error.includes('ya está registrado') || error.includes('ya existe') || error.includes('teléfono')) && (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-sm text-red-600 hover:text-red-700 underline font-medium transition-colors"
                >
                  Ir al inicio de sesión →
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={paso === 'confirmando' || !consentimiento}
            className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-opacity"
          >
            {paso === 'confirmando' ? 'Creando cuenta...' : 'Crear mi cuenta gratis'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Podés darte de baja en cualquier momento
          </p>
        </form>
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
