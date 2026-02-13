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
      const token = localStorage.getItem('token')
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
      const token = localStorage.getItem('token')
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
    
    const shareText = `¡Unite al programa Fidelización Zona! Usá mi código ${perfil.codigoReferido} al registrarte y empezá con beneficios desde el primer día 🎉`
    
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(perfil.codigoReferido)
        }
      }
    } else {
      copyToClipboard(perfil.codigoReferido)
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
              {perfil.totalXp !== undefined && (
                <p className="text-purple-100 mt-2">
                  ⭐ {perfil.totalXp} XP acumulados
                </p>
              )}
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
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              🎁 Código de Referido
            </h3>
            
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">Tu código único:</p>
              <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border-2 border-purple-200">
                <span className="text-2xl font-bold text-purple-600">
                  {perfil.codigoReferido}
                </span>
                <button
                  onClick={() => copyToClipboard(perfil.codigoReferido!)}
                  className="bg-purple-100 text-purple-600 px-3 py-1 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>

            <button
              onClick={handleShareReferralCode}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-md"
            >
              📤 Compartir Código
            </button>

            {perfil.referidosActivados !== undefined && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Has referido a <span className="font-bold text-purple-600">{perfil.referidosActivados}</span> {perfil.referidosActivados === 1 ? 'persona' : 'personas'}
                </p>
                {perfil.referidosActivados < 2 && (
                  <p className="text-xs text-gray-500 mt-1">
                    ¡Referí a {2 - perfil.referidosActivados} más para subir de nivel!
                  </p>
                )}
              </div>
            )}
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
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all shadow-md ${
              saving
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
              <span className={`font-semibold ${
                perfil.estado === 'ACTIVO' ? 'text-green-600' : 'text-gray-500'
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
                  🎂 {new Date(perfil.fechaCumpleanos).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'long'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            localStorage.removeItem('token')
            router.push('/login')
          }}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
        >
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
