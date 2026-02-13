'use client'
// src/app/pass/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PassData, NIVEL_COLORS, ESTADO_AUTO_LABELS, ESTADO_AUTO_COLORS } from '@/types'
import { formatearPatenteDisplay } from '@/lib/patente'

const REFRESH_INTERVAL = 5000 // refrescar OTP cada 5 segundos

export default function PassPage() {
  const router = useRouter()
  const [pass, setPass] = useState<PassData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(30)
  const [showShareCopied, setShowShareCopied] = useState(false)

  const fetchPass = useCallback(async () => {
    const token = localStorage.getItem('fidelizacion_token')
    if (!token) {
      setError('no_auth')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/pass', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        setError('no_auth')
        return
      }
      const json = await res.json()
      setPass(json.data)
      setCountdown(json.data.otp.tiempoRestante)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  // Refresco periódico del OTP
  useEffect(() => {
    fetchPass()
    const interval = setInterval(fetchPass, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchPass])

  // Countdown visual
  useEffect(() => {
    if (!pass) return
    setCountdown(pass.otp.tiempoRestante)
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? pass.otp.tiempoRestante : c - 1))
    }, 1000)
    return () => clearInterval(tick)
  }, [pass?.otp.token])

  const handleShareReferralCode = async () => {
    if (!pass?.codigoReferido) return

    const shareUrl = `${window.location.origin}/activar?ref=${pass.codigoReferido}`
    const shareText = `¡Unite al programa de fidelización de Coques! Usá mi código: ${pass.codigoReferido}\n${shareUrl}`

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch (err) {
        // Usuario canceló o error, copiar al clipboard
        copyToClipboard(shareUrl)
      }
    } else {
      copyToClipboard(shareUrl)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setShowShareCopied(true)
    setTimeout(() => setShowShareCopied(false), 2000)
  }

  if (loading) return <LoadingScreen />
  if (error === 'no_auth') return <NoAuthScreen />
  if (error) return <ErrorScreen message={error} />
  if (!pass) return null

  const nivelColor = pass.nivel ? NIVEL_COLORS[pass.nivel.nombre] || '#6b7280' : '#6b7280'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4 pb-24">
      {/* Header */}
      <div className="w-full max-w-sm">
        {/* Header con Volver y Logout */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => (window.location.href = '/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Volver</span>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('fidelizacion_token')
              window.location.href = '/login'
            }}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Salir</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Hola, {pass.nombre} 👋</h1>
          {pass.nivel && (
            <div className="mt-2">
              <span
                className="inline-block px-3 py-1 rounded-full text-white text-sm font-semibold"
                style={{ backgroundColor: nivelColor }}
              >
                {pass.nivel.nombre}
              </span>
              {pass.totalXp > 0 && (
                <p className="text-xs text-gray-500 mt-1">{pass.totalXp} XP acumulados</p>
              )}
            </div>
          )}
        </div>

        {/* Card del QR */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex flex-col items-center">
            {/* QR */}
            <div className="relative mb-3">
              <img
                src={pass.otp.qrDataUrl}
                alt="QR de validación"
                className="w-56 h-56 rounded-xl"
              />
            </div>

            {/* Countdown debajo del QR */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="bg-slate-800 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold">
                {countdown}
              </div>
              <span className="text-slate-600 text-sm">segundos restantes</span>
            </div>

            {/* Código numérico para fallback manual */}
            <div className="w-full">
              <p className="text-xs text-center text-gray-400 mb-1">Código manual</p>
              <div className="bg-gray-100 rounded-xl p-3 text-center">
                <span className="text-3xl font-mono font-bold tracking-[0.3em] text-slate-800">
                  {pass.otp.token}
                </span>
              </div>
              <p className="text-xs text-center text-gray-400 mt-1">
                Se actualiza automáticamente cada 30 segundos
              </p>
            </div>
          </div>
        </div>

        {/* Beneficios del Nivel */}
        {pass.nivel?.descripcionBeneficios && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span>⭐</span>
              Tus Beneficios {pass.nivel.nombre}
            </h2>
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {pass.nivel.descripcionBeneficios}
            </div>
          </div>
        )}

        {/* Sección de Referidos */}
        {pass.codigoReferido && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-sm p-4 mb-4 border border-purple-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span>🤝</span>
              Invita Amigos
            </h2>

            <div className="bg-white rounded-xl p-4 mb-3">
              <p className="text-xs text-gray-500 mb-1">Tu código de referido</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-purple-600 tracking-wider">
                  {pass.codigoReferido}
                </span>
                <button
                  onClick={handleShareReferralCode}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
                >
                  Compartir
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Referidos activados: <strong>{pass.referidosActivados}</strong>
              </span>
              <span className="text-purple-600 font-semibold">
                {pass.referidosActivados >= 2 ? '✅ Subiste de nivel!' : `Faltan ${2 - pass.referidosActivados} para subir`}
              </span>
            </div>

            {showShareCopied && (
              <div className="mt-2 text-center text-sm text-green-600 font-semibold">
                ✓ Link copiado al portapapeles
              </div>
            )}
          </div>
        )}

        {/* Autos del cliente */}
        {pass.autos && pass.autos.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Mis autos
            </h2>
            <div className="space-y-2">
              {pass.autos.map((auto) => (
                <div
                  key={auto.id}
                  className={`rounded-2xl p-4 ${auto.estadoActual && auto.estadoActual.estado !== 'ENTREGADO'
                      ? 'bg-white border-2 shadow-sm'
                      : 'bg-gray-50 border border-gray-200'
                    }`}
                  style={
                    auto.estadoActual && auto.estadoActual.estado !== 'ENTREGADO'
                      ? { borderColor: ESTADO_AUTO_COLORS[auto.estadoActual.estado] }
                      : {}
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-800 text-lg">
                          {formatearPatenteDisplay(auto.patente)}
                        </p>
                        {auto.estadoActual && auto.estadoActual.estado !== 'ENTREGADO' && (
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: ESTADO_AUTO_COLORS[auto.estadoActual.estado] }}
                          />
                        )}
                      </div>
                      {(auto.marca || auto.modelo) && (
                        <p className="text-sm text-gray-600">
                          {[auto.marca, auto.modelo].filter(Boolean).join(' ')}
                        </p>
                      )}
                      {auto.alias && (
                        <p className="text-xs text-gray-500 italic mt-1">{auto.alias}</p>
                      )}
                    </div>
                    {auto.estadoActual && auto.estadoActual.estado !== 'ENTREGADO' && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">En lavadero</p>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: ESTADO_AUTO_COLORS[auto.estadoActual.estado] }}
                        >
                          {ESTADO_AUTO_LABELS[auto.estadoActual.estado]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Beneficios activos */}
        {pass.beneficiosActivos.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Beneficios disponibles
            </h2>
            <div className="space-y-2">
              {pass.beneficiosActivos.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-green-100"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{b.nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Mostrá este código al empleado
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logros recientes no vistos */}
        {pass.logrosRecientes && pass.logrosRecientes.length > 0 && (
          <Link href="/logros">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl shadow-sm p-4 mb-4 border border-yellow-200 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{pass.logrosRecientes[0].icono}</div>
                  <div>
                    <p className="font-semibold text-gray-800">¡Nuevo logro desbloqueado!</p>
                    <p className="text-sm text-gray-600">{pass.logrosRecientes[0].nombre}</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Fidelización Zona · {pass.phone}
        </p>
      </div>

      {/* Navegación inferior fija */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-lg mx-auto flex justify-around items-center py-3 px-4">
          <Link href="/pass" className="flex flex-col items-center gap-1 text-purple-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
            <span className="text-xs font-medium">Pass</span>
          </Link>

          <Link href="/logros" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-xs font-medium">Logros</span>
          </Link>

          <Link href="/historial" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">Historial</span>
          </Link>

          <Link href="/perfil" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Cargando tu pass...</p>
      </div>
    </div>
  )
}

function NoAuthScreen() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir automáticamente a login
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <div className="text-5xl mb-4">🔄</div>
        <p className="text-gray-600">Redirigiendo a inicio de sesión...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-gray-600">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-slate-800 underline text-sm"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
