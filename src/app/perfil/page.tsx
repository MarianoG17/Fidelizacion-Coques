'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PerfilData } from '@/types'

export default function PerfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [perfil, setPerfil] = useState<PerfilData | null>(null)

  // Form state
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [fechaCumpleanos, setFechaCumpleanos] = useState('')

  const fetchPerfil = useCallback(async () => {
    try {
      const token = localStorage.getItem('fidelizacion_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/perfil', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token')
          router.push('/login')
          return
        }
        throw new Error('Error al cargar el perfil')
      }

      const data = await response.json()
      setPerfil(data.data)

      // Initialize form fields
      setNombre(data.data.nombre || '')
      setEmail(data.data.email || '')
      setFechaCumpleanos(data.data.fechaCumpleanos ?
        data.data.fechaCumpleanos.split('T')[0] : '')

    } catch (err) {
      console.error('Error fetching perfil:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchPerfil()
  }, [fetchPerfil])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const token = localStorage.getItem('fidelizacion_token')
      if (!token) {
        router.push('/login')
        return
      }

      const updateData: any = {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase()
      }

      // Only include birthday if it was provided
      if (fechaCumpleanos) {
        updateData.fechaCumpleanos = fechaCumpleanos
      }

      const response = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar el perfil')
      }

      const data = await response.json()
      setPerfil(data.data)
      setSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      console.error('Error updating perfil:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('¡Código copiado al portapapeles!')
  }

  const handleShareReferralCode = async () => {
    if (!perfil?.codigoReferido) return

    const shareUrl = `${window.location.origin}/activar?ref=${perfil.codigoReferido}`
    const shareText = `¡Unite al programa de fidelización de Coques Bakery! 🎁\n\nUsá mi código *${perfil.codigoReferido}* y obtenemos beneficios ambos 🤝\n\n👉 ${shareUrl}`

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

  const calcularDiasDesdeRegistro = (fecha: string): number => {
    const registro = new Date(fecha)
    const hoy = new Date()
    const diff = hoy.getTime() - registro.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  if (loading) return <LoadingScreen />
  if (error && !perfil) return <ErrorScreen message={error} />
  if (!perfil) return <ErrorScreen message="No se pudo cargar el perfil" />

  const diasMiembro = calcularDiasDesdeRegistro(perfil.createdAt)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4 pb-24">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Mi Perfil</h1>
          <p className="text-gray-600 mt-2">Gestioná tu información personal</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            ✅ Perfil actualizado exitosamente
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* Level & XP Card */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">
                Nivel Actual
              </p>
              <h2 className="text-3xl font-bold mt-1">{perfil.nivel.nombre}</h2>
            </div>
            <div className="text-6xl opacity-80">
              {perfil.nivel.nombre === 'Bronce' && '🥉'}
              {perfil.nivel.nombre === 'Plata' && '🥈'}
              {perfil.nivel.nombre === 'Oro' && '🥇'}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-purple-400">
            <p className="text-sm text-purple-100">
              Miembro desde hace {diasMiembro} {diasMiembro === 1 ? 'día' : 'días'}
            </p>
          </div>
        </div>

        {/* Referral Code Card */}
        {perfil.codigoReferido && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-sm p-4 border border-purple-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span>🤝</span>
              Invita Amigos
            </h2>

            <div className="bg-white rounded-xl p-4 mb-3">
              <p className="text-xs text-gray-500 mb-2">Tu código de referido</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-purple-600 tracking-wider">
                  {perfil.codigoReferido}
                </span>
              </div>
              
              <button
                onClick={handleShareReferralCode}
                className="w-full bg-green-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartir por WhatsApp
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-700 mb-2">
                💡 <strong>¿Cómo funciona?</strong>
              </p>
              <p className="text-xs text-gray-600">
                Cuando tu amigo se registre con tu código, ambos reciben beneficios especiales. ¡Mientras más amigos invites, más recompensas obtienen!
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Referidos activados: <strong>{perfil.referidosActivados || 0}</strong>
              </span>
              <span className="text-purple-600 font-semibold">
                {(perfil.referidosActivados || 0) >= 2 ? '✅ Subiste de nivel!' : `Faltan ${2 - (perfil.referidosActivados || 0)} para subir`}
              </span>
            </div>
          </div>
        )}

        {/* Edit Profile Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            ✏️ Editar Información
          </h3>

          {/* Read-only fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              value={perfil.telefono}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              El teléfono no puede modificarse
            </p>
          </div>

          {/* Editable: Name */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Tu nombre completo"
            />
          </div>

          {/* Editable: Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>

          {/* Editable: Birthday */}
          <div>
            <label htmlFor="fechaCumpleanos" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Cumpleaños
            </label>
            <input
              type="date"
              id="fechaCumpleanos"
              value={fechaCumpleanos}
              onChange={(e) => setFechaCumpleanos(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              🎂 ¡Recibí un 20% de descuento en tortas durante la semana de tu cumpleaños!
            </p>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all shadow-md ${saving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700'
              }`}
          >
            {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
          </button>
        </form>

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            📊 Información de la Cuenta
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Estado:</span>
              <span className={`font-semibold ${perfil.estado === 'ACTIVO' ? 'text-green-600' : 'text-gray-500'
                }`}>
                {perfil.estado === 'ACTIVO' ? '✅ Activo' : '⏸️ Inactivo'}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Registro:</span>
              <span className="font-medium text-gray-800">
                {new Date(perfil.createdAt).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>

            {perfil.fechaCumpleanos && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Cumpleaños:</span>
                <span className="font-medium text-gray-800">
                  🎂 {(() => {
                    // Parse date without timezone conversion
                    const [year, month, day] = perfil.fechaCumpleanos.split('-')
                    const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                    return fecha.toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'long'
                    })
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            localStorage.removeItem('fidelizacion_token')
            router.push('/login')
          }}
          className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          🚪 Cerrar Sesión
        </button>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-lg mx-auto flex justify-around items-center py-3 px-4">
          <Link href="/pass" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-xs font-medium">Pass</span>
          </Link>

          <Link href="/logros" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-xs font-medium">Logros</span>
          </Link>

          <Link href="/historial" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">Historial</span>
          </Link>

          <Link href="/perfil" className="flex flex-col items-center gap-1 text-purple-600">
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
      <p className="mt-4 text-gray-600">Cargando perfil...</p>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-6xl mb-4">😕</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
      <p className="text-gray-600 text-center mb-6">{message}</p>
      <button
        onClick={() => router.push('/login')}
        className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
      >
        Volver al login
      </button>
    </div>
  )
}
