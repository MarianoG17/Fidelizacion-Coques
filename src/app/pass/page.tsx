'use client'
// src/app/pass/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PassData, NIVEL_COLORS, ESTADO_AUTO_LABELS, ESTADO_AUTO_COLORS } from '@/types'
import { formatearPatenteDisplay } from '@/lib/patente'
import CuestionarioOptional from './components/CuestionarioOptional'
import CompletePhoneModal from '@/components/CompletePhoneModal'

const REFRESH_INTERVAL = 5000 // refrescar OTP cada 5 segundos

interface BeneficioDisponible {
  id: string
  nombre: string
  tipo: string
  descuento: number | null
  icono: string
  descripcion: string
  maxPorDia: number
  usosHoy: number
  disponible: boolean
  yaUsado?: boolean
  expirado?: boolean
}

interface NivelData {
  id: string
  nombre: string
  orden: number
  descripcionBeneficios: string | null
  visitasRequeridas: number
  esNivelActual: boolean
  beneficios: Array<{
    id: string
    nombre: string
    descripcion: string
    tipo: string
    descuento: number | null
  }>
}

interface NivelesResponse {
  niveles: NivelData[]
  nivelActual: string
  totalVisitas: number
  progreso: {
    proximoNivel: string
    visitasActuales: number
    visitasRequeridas: number
    visitasFaltantes: number
  } | null
}

export default function PassPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [pass, setPass] = useState<PassData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(30)
  const [showShareCopied, setShowShareCopied] = useState(false)
  const [beneficiosDisponibles, setBeneficiosDisponibles] = useState<BeneficioDisponible[]>([])
  const [beneficiosUsados, setBeneficiosUsados] = useState<BeneficioDisponible[]>([])
  const [nivelesData, setNivelesData] = useState<NivelesResponse | null>(null)
  const [showPhoneModal, setShowPhoneModal] = useState(false)

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

  const fetchBeneficios = useCallback(async () => {
    const token = localStorage.getItem('fidelizacion_token')
    if (!token) return

    try {
      const res = await fetch('/api/pass/beneficios-disponibles', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setBeneficiosDisponibles(json.data.disponibles || [])
        setBeneficiosUsados(json.data.usados || [])
      }
    } catch (err) {
      console.error('Error al cargar beneficios:', err)
    }
  }, [])

  const fetchNiveles = useCallback(async () => {
    const token = localStorage.getItem('fidelizacion_token')
    if (!token) return

    try {
      const res = await fetch('/api/pass/niveles', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setNivelesData(json.data)
      }
    } catch (err) {
      console.error('Error al cargar niveles:', err)
    }
  }, [])

  // Bloquear navegación hacia atrás para clientes
  useEffect(() => {
    // Agregar entrada al historial para prevenir volver atrás
    window.history.pushState(null, '', window.location.href)

    const handlePopState = () => {
      // Volver a agregar entrada al historial
      window.history.pushState(null, '', window.location.href)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Manejar autenticación con NextAuth (Google OAuth)
  useEffect(() => {
    console.log('[PASS] sessionStatus:', sessionStatus)
    console.log('[PASS] session:', session)

    if (sessionStatus === 'loading') {
      console.log('[PASS] Session loading...')
      return
    }

    if (sessionStatus === 'authenticated' && session?.user) {
      console.log('[PASS] Session authenticated!')
      const needsPhone = (session.user as any).needsPhone
      console.log('[PASS] needsPhone:', needsPhone)

      // Si necesita completar teléfono, mostrar modal
      if (needsPhone) {
        console.log('[PASS] Showing phone modal')
        setShowPhoneModal(true)
        setLoading(false)
        return
      }

      // Si ya tiene sesión de NextAuth pero no tiene token local, generarlo
      const token = localStorage.getItem('fidelizacion_token')
      console.log('[PASS] Token en localStorage:', token ? 'existe' : 'no existe')

      if (!token) {
        console.log('[PASS] Generando token...')
        // Generar token JWT para el sistema existente
        fetch('/api/auth/session-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
          .then(res => {
            console.log('[PASS] Response status:', res.status)
            return res.json()
          })
          .then(data => {
            console.log('[PASS] Response data:', data)
            if (data.token) {
              localStorage.setItem('fidelizacion_token', data.token)
              console.log('[PASS] Token guardado, fetching data...')
              fetchPass()
              fetchBeneficios()
              fetchNiveles()
            } else {
              console.error('[PASS] No token in response')
              setError('Error: No se recibió token')
              setLoading(false)
            }
          })
          .catch(err => {
            console.error('[PASS] Error generando token:', err)
            setError('Error de autenticación')
            setLoading(false)
          })
        return
      } else {
        console.log('[PASS] Token exists, fetching data...')
        fetchPass()
        fetchBeneficios()
        fetchNiveles()
      }
    } else if (sessionStatus === 'unauthenticated') {
      console.log('[PASS] Session unauthenticated, checking localStorage token...')
      const token = localStorage.getItem('fidelizacion_token')
      if (!token) {
        console.log('[PASS] No token found, redirecting to login')
        // Solo si no hay token en localStorage
        setError('no_auth')
        setLoading(false)
      }
    }
  }, [session, sessionStatus, fetchPass, fetchBeneficios, fetchNiveles])

  // Refresco periódico del OTP y beneficios
  useEffect(() => {
    const token = localStorage.getItem('fidelizacion_token')
    if (!token || showPhoneModal) return

    fetchPass()
    fetchBeneficios()
    fetchNiveles()
    const interval = setInterval(() => {
      fetchPass()
      fetchBeneficios()
    }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchPass, fetchBeneficios, fetchNiveles, showPhoneModal])

  // ⚡ PREFETCH ELIMINADO: Con cache de 30min y batch queries,
  // la primera carga es suficientemente rápida
  // El prefetch solo agrega complejidad innecesaria

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
    const shareText = `¡Unite al programa de fidelización de Coques Bakery! 🎁\n\nRegistrate con mi link y ambos obtenemos beneficios 🤝\n\n👉 ${shareUrl}`

    // Preferir WhatsApp si está disponible en móvil
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (isMobile) {
      // Abrir WhatsApp directamente
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
      window.open(whatsappUrl, '_blank')
    } else if (navigator.share) {
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

  const getNivelIcon = (nombreNivel: string): string => {
    const iconos: Record<string, string> = {
      'Bronce': '🥉',
      'Plata': '🥈',
      'Oro': '🥇',
      'Platino': '💎',
    }
    return iconos[nombreNivel] || '⭐'
  }

  if (loading) return <LoadingScreen />
  if (error === 'no_auth') return <NoAuthScreen />
  if (error) return <ErrorScreen message={error} />
  if (!pass) return null

  const nivelColor = pass.nivel ? NIVEL_COLORS[pass.nivel.nombre] || '#6b7280' : '#6b7280'

  // Mostrar modal de completar teléfono si es necesario
  if (showPhoneModal) {
    return (
      <>
        <CompletePhoneModal
          isOpen={true}
          userName={session?.user?.name || null}
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Completando registro...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4 pb-24">
      {/* Header */}
      <div className="w-full max-w-sm">
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
            </div>
          )}
        </div>

        {/* Progreso al próximo nivel */}
        {nivelesData?.progreso && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4 mb-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getNivelIcon(nivelesData.progreso.proximoNivel)}</span>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Próximo nivel</p>
                  <p className="text-sm font-bold text-purple-700">{nivelesData.progreso.proximoNivel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Te faltan</p>
                <p className="text-xl font-bold text-purple-700">{nivelesData.progreso.visitasFaltantes}</p>
                <p className="text-xs text-gray-600">visitas</p>
              </div>
            </div>
            {/* Barra de progreso */}
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    (nivelesData.progreso.visitasActuales / nivelesData.progreso.visitasRequeridas) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-center text-gray-500 mt-1">
              {nivelesData.progreso.visitasActuales} / {nivelesData.progreso.visitasRequeridas} visitas
            </p>
          </div>
        )}


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

        {/* Cuestionario Opcional */}
        <CuestionarioOptional
          fechaCumpleanos={pass.fechaCumpleanos}
          fuenteConocimiento={pass.fuenteConocimiento}
          onComplete={() => {
            fetchPass()
            fetchBeneficios()
          }}
        />

        {/* Botón destacado de Tortas */}
        <Link href="/tortas">
          <div className="bg-gradient-to-r from-orange-400 to-pink-400 rounded-2xl shadow-lg p-6 mb-4 cursor-pointer hover:shadow-xl transition-all transform hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🍰</span>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Realizá tu pedido
                  </h3>
                  <p className="text-white/90 text-sm">
                    Pedí tu torta favorita online
                  </p>
                </div>
              </div>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

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

        {/* Beneficios Disponibles Hoy */}
        {(beneficiosDisponibles.length > 0 || beneficiosUsados.length > 0) && (
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl shadow-sm p-4 mb-4 border border-green-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span>🎁</span>
              Tus Beneficios de Hoy
            </h2>

            {/* Beneficios disponibles */}
            {beneficiosDisponibles.length > 0 && (
              <div className="space-y-2 mb-3">
                {beneficiosDisponibles.map((beneficio) => (
                  <div
                    key={beneficio.id}
                    className="bg-white rounded-xl p-4 shadow-sm border-2 border-green-200"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{beneficio.icono}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-800">{beneficio.nombre}</p>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                            Disponible
                          </span>
                        </div>
                        {beneficio.descripcion && (
                          <p className="text-sm text-gray-600 mb-2">{beneficio.descripcion}</p>
                        )}
                        {beneficio.tipo === 'DESCUENTO' && beneficio.descuento && (
                          <div className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                            {Math.round(beneficio.descuento * 100)}% OFF
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Beneficios usados */}
            {beneficiosUsados.length > 0 && (
              <div className="space-y-2">
                {beneficiosUsados.map((beneficio) => (
                  <div
                    key={beneficio.id}
                    className="bg-white/60 rounded-xl p-4 border border-gray-200 opacity-75"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl grayscale">{beneficio.icono}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-600">{beneficio.nombre}</p>
                          {beneficio.yaUsado ? (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">
                              ✓ Usado
                            </span>
                          ) : beneficio.expirado ? (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-semibold">
                              ⏰ Expirado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">
                              ✓ Usado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {beneficio.yaUsado
                            ? `Beneficio de uso único ya utilizado`
                            : beneficio.expirado
                              ? `Beneficio expirado · Disponible solo hasta las 19:00`
                              : `Ya usado hoy · ${beneficio.usosHoy}/${beneficio.maxPorDia} canje${beneficio.maxPorDia > 1 ? 's' : ''}`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {beneficiosDisponibles.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-xs text-center text-gray-600">
                  💡 Mostrá tu QR al staff para aplicar estos beneficios
                </p>
              </div>
            )}
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
