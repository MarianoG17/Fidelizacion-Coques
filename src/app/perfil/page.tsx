'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PerfilData } from '@/types'
import NotificationToggle from '@/components/NotificationToggle'

export default function PerfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [perfil, setPerfil] = useState<PerfilData | null>(null)
  const [modoEdicion, setModoEdicion] = useState(false)

  // Form state
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [fechaCumpleanos, setFechaCumpleanos] = useState('')
  // Estados separados para fecha de cumpleaños (formato selector)
  const [dia, setDia] = useState('')
  const [mes, setMes] = useState('')
  const [anio, setAnio] = useState('')

  // Función para formatear teléfono de +54911... a 11...
  const formatearTelefono = (telefono: string): string => {
    // Remover +54 9 del inicio (código país + código celular)
    if (telefono.startsWith('+549')) {
      return telefono.substring(4) // Remover +549 (4 caracteres)
    }
    // Si tiene +54 pero no el 9, remover +54
    if (telefono.startsWith('+54')) {
      return telefono.substring(3) // Remover +54
    }
    // Si empieza con 549 sin el +
    if (telefono.startsWith('549')) {
      return telefono.substring(3) // Remover 549
    }
    return telefono
  }

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
      
      // Inicializar selectores de fecha si existe
      if (data.data.fechaCumpleanos) {
        const fechaSolo = data.data.fechaCumpleanos.split('T')[0]
        const [year, month, day] = fechaSolo.split('-')
        setDia(parseInt(day).toString())
        setMes(parseInt(month).toString())
        setAnio(year)
      }

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

  const handleEditar = () => {
    setModoEdicion(true)
    setError(null)
    setSuccess(false)
  }

  const handleCancelar = () => {
    setModoEdicion(false)
    // Restaurar valores originales
    if (perfil) {
      setNombre(perfil.nombre || '')
      setEmail(perfil.email || '')
      setFechaCumpleanos(perfil.fechaCumpleanos ? perfil.fechaCumpleanos.split('T')[0] : '')
      
      // Restaurar selectores
      if (perfil.fechaCumpleanos) {
        const fechaSolo = perfil.fechaCumpleanos.split('T')[0]
        const [year, month, day] = fechaSolo.split('-')
        setDia(parseInt(day).toString())
        setMes(parseInt(month).toString())
        setAnio(year)
      } else {
        setDia('')
        setMes('')
        setAnio('')
      }
    }
    setError(null)
  }

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

      // Construir fecha desde los selectores si hay datos
      if (dia && mes && anio) {
        const diaFormateado = dia.padStart(2, '0')
        const mesFormateado = mes.padStart(2, '0')
        updateData.fechaCumpleanos = `${anio}-${mesFormateado}-${diaFormateado}`
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
      setModoEdicion(false)

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

        {/* Referral Card */}
        {perfil.codigoReferido && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-sm p-6 border border-purple-100">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>🤝</span>
              Invita Amigos
            </h2>

            <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                💡 <strong>¿Cómo funciona?</strong>
              </p>
              <p className="text-sm text-gray-600">
                Cuando tu amigo se registre con tu link, ambos reciben visitas bonus. ¡Mientras más amigos invites, más rápido subís de nivel!
              </p>
            </div>

            <button
              onClick={handleShareReferralCode}
              className="w-full bg-green-500 text-white px-4 py-4 rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Compartir Link de Invitación
            </button>

            <div className="mt-4 pt-4 border-t border-purple-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Amigos invitados:
                </span>
                <span className="text-2xl font-bold text-purple-600">
                  {perfil.referidosActivados || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toggle */}
        <NotificationToggle />

        {/* Profile Information Card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              👤 Información Personal
            </h3>
            {!modoEdicion && (
              <button
                onClick={handleEditar}
                className="text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
            )}
          </div>

          {!modoEdicion ? (
            // Modo Visualización
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Teléfono
                </label>
                <p className="text-gray-800 font-medium">{formatearTelefono(perfil.telefono)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Nombre Completo
                </label>
                <p className="text-gray-800 font-medium">{perfil.nombre || 'Sin especificar'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Email
                </label>
                <p className="text-gray-800 font-medium">{perfil.email || 'Sin especificar'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Fecha de Cumpleaños
                </label>
                <p className="text-gray-800 font-medium">
                  {perfil.fechaCumpleanos
                    ? (() => {
                      // Obtener solo la fecha sin considerar zona horaria
                      const fechaSolo = perfil.fechaCumpleanos.split('T')[0]
                      const [year, month, day] = fechaSolo.split('-')
                      const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                      return fecha.toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'long'
                      })
                    })()
                    : 'Sin especificar'}
                </p>
              </div>
            </div>
          ) : (
            // Modo Edición
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Read-only: Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={formatearTelefono(perfil.telefono)}
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

              {/* Editable: Birthday con selectores separados */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Fecha de Cumpleaños (opcional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Día */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Día</label>
                    <select
                      value={dia}
                      onChange={(e) => setDia(e.target.value)}
                      className="w-full bg-white border-2 border-gray-300 rounded-lg px-2 py-2 focus:border-purple-500 focus:outline-none text-sm"
                    >
                      <option value="">-</option>
                      {Array.from({ length: 31 }, (_, i) => (i + 1).toString()).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mes */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mes</label>
                    <select
                      value={mes}
                      onChange={(e) => setMes(e.target.value)}
                      className="w-full bg-white border-2 border-gray-300 rounded-lg px-2 py-2 focus:border-purple-500 focus:outline-none text-sm"
                    >
                      <option value="">-</option>
                      {[
                        { valor: '1', nombre: 'Enero' },
                        { valor: '2', nombre: 'Febrero' },
                        { valor: '3', nombre: 'Marzo' },
                        { valor: '4', nombre: 'Abril' },
                        { valor: '5', nombre: 'Mayo' },
                        { valor: '6', nombre: 'Junio' },
                        { valor: '7', nombre: 'Julio' },
                        { valor: '8', nombre: 'Agosto' },
                        { valor: '9', nombre: 'Septiembre' },
                        { valor: '10', nombre: 'Octubre' },
                        { valor: '11', nombre: 'Noviembre' },
                        { valor: '12', nombre: 'Diciembre' },
                      ].map((m) => (
                        <option key={m.valor} value={m.valor}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Año */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Año</label>
                    <select
                      value={anio}
                      onChange={(e) => setAnio(e.target.value)}
                      className="w-full bg-white border-2 border-gray-300 rounded-lg px-2 py-2 focus:border-purple-500 focus:outline-none text-sm"
                    >
                      <option value="">-</option>
                      {Array.from(
                        { length: new Date().getFullYear() - 1930 + 1 },
                        (_, i) => (new Date().getFullYear() - i).toString()
                      ).map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  🎂 Recibí un regalo especial el día de tu cumpleaños
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelar}
                  disabled={saving}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/pass"
            className="block w-full bg-purple-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            ← Volver al Pass
          </Link>

          <button
            onClick={() => {
              localStorage.removeItem('fidelizacion_token')
              router.push('/login')
            }}
            className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando perfil...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={() => router.push('/pass')}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
        >
          Volver al Pass
        </button>
      </div>
    </div>
  )
}
