'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface ConfiguracionApp {
  id: string
  feedbackHabilitado: boolean
  feedbackTiempoVisitaMinutos: number
  feedbackDiasPedidoTorta: number
  feedbackFrecuenciaDias: number
  feedbackMinEstrellas: number
  googleMapsUrl: string
  pushHabilitado: boolean
  pushAutoListo: boolean
  pushNuevoNivel: boolean
  pushBeneficioDisponible: boolean
  pushBeneficioVence: boolean
  pushCumpleanos: boolean
}

export default function ConfiguracionPage() {
  const searchParams = useSearchParams()
  const adminKey = searchParams.get('key') || ''

  const [config, setConfig] = useState<ConfiguracionApp | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  useEffect(() => {
    if (!adminKey) {
      setError('Falta admin key')
      setCargando(false)
      return
    }
    fetchConfig()
  }, [adminKey])

  async function fetchConfig() {
    try {
      const res = await fetch('/api/admin/configuracion', {
        headers: { 'x-admin-key': adminKey }
      })
      
      if (!res.ok) {
        throw new Error('Error al cargar configuración')
      }

      const data = await res.json()
      setConfig(data.config)
    } catch (err) {
      setError('Error al cargar la configuración')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return

    setGuardando(true)
    setError('')
    setExito(false)

    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'PATCH',
        headers: {
          'x-admin-key': adminKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (!res.ok) {
        throw new Error('Error al guardar')
      }

      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch (err) {
      setError('Error al guardar la configuración')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  async function handleTestPush() {
    if (!confirm('¿Enviar notificación de prueba a tu dispositivo?\n\nAsegurate de tener la PWA instalada y permisos activados.')) {
      return
    }

    try {
      const res = await fetch('/api/admin/test-push', {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey,
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()
      
      if (data.success) {
        alert('✅ Notificación enviada! Revisa tu dispositivo.')
      } else {
        alert('❌ ' + data.message)
      }
    } catch (err) {
      alert('Error al enviar notificación de prueba')
      console.error(err)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando configuración...</div>
      </div>
    )
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    )
  }

  if (!config) return null

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">⚙️ Configuración</h1>
            <p className="text-slate-400 mt-2">Sistema de feedback y notificaciones push</p>
          </div>
          <button
            onClick={handleTestPush}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            🔔 Test Push
          </button>
        </div>

        {exito && (
          <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg mb-6">
            ✅ Configuración guardada exitosamente
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sistema de Feedback */}
          <div className="bg-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">📊 Sistema de Feedback</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.feedbackHabilitado}
                  onChange={(e) => setConfig({...config, feedbackHabilitado: e.target.checked})}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">Habilitado</span>
              </label>
            </div>
            
            <div className="space-y-4 opacity-100">
              <div>
                <label className="block text-slate-300 mb-2">
                  ⏰ Tiempo después de visita física (minutos)
                </label>
                <input
                  type="number"
                  value={config.feedbackTiempoVisitaMinutos}
                  onChange={(e) => setConfig({...config, feedbackTiempoVisitaMinutos: parseInt(e.target.value)})}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                  min="1"
                  max="60"
                />
                <p className="text-slate-400 text-sm mt-1">
                  Cuántos minutos esperar después del escaneo QR para mostrar el modal
                </p>
              </div>

              <div>
                <label className="block text-slate-300 mb-2">
                  🎂 Días después de entrega de torta
                </label>
                <input
                  type="number"
                  value={config.feedbackDiasPedidoTorta}
                  onChange={(e) => setConfig({...config, feedbackDiasPedidoTorta: parseInt(e.target.value)})}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                  min="0"
                  max="7"
                />
                <p className="text-slate-400 text-sm mt-1">
                  Cuántos días esperar después de la fecha de entrega
                </p>
              </div>

              <div>
                <label className="block text-slate-300 mb-2">
                  🔄 Frecuencia mínima entre feedbacks (días)
                </label>
                <input
                  type="number"
                  value={config.feedbackFrecuenciaDias}
                  onChange={(e) => setConfig({...config, feedbackFrecuenciaDias: parseInt(e.target.value)})}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                  min="1"
                  max="30"
                />
                <p className="text-slate-400 text-sm mt-1">
                  Mínimo de días entre solicitudes de feedback para no molestar
                </p>
              </div>

              <div>
                <label className="block text-slate-300 mb-2">
                  ⭐ Estrellas mínimas para redirect a Google Maps
                </label>
                <input
                  type="number"
                  value={config.feedbackMinEstrellas}
                  onChange={(e) => setConfig({...config, feedbackMinEstrellas: parseInt(e.target.value)})}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                  min="1"
                  max="5"
                />
                <p className="text-slate-400 text-sm mt-1">
                  Si el cliente da este puntaje o más, redirigir a Google Maps
                </p>
              </div>

              <div>
                <label className="block text-slate-300 mb-2">
                  🗺️ URL de Google Maps
                </label>
                <input
                  type="url"
                  value={config.googleMapsUrl}
                  onChange={(e) => setConfig({...config, googleMapsUrl: e.target.value})}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="bg-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">🔔 Notificaciones Push</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.pushHabilitado}
                  onChange={(e) => setConfig({...config, pushHabilitado: e.target.checked})}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">Sistema Habilitado</span>
              </label>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={config.pushAutoListo}
                  onChange={(e) => setConfig({...config, pushAutoListo: e.target.checked})}
                  className="w-5 h-5"
                  disabled={!config.pushHabilitado}
                />
                <div className="flex-1">
                  <span className="text-slate-300 block">🚗 Auto listo en el lavadero</span>
                  <span className="text-slate-500 text-sm">Se envía cuando el estado cambia a "LISTO"</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={config.pushNuevoNivel}
                  onChange={(e) => setConfig({...config, pushNuevoNivel: e.target.checked})}
                  className="w-5 h-5"
                  disabled={!config.pushHabilitado}
                />
                <div className="flex-1">
                  <span className="text-slate-300 block">🎉 Sube de nivel</span>
                  <span className="text-slate-500 text-sm">Se envía cuando el cliente alcanza un nuevo nivel</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={config.pushBeneficioDisponible}
                  onChange={(e) => setConfig({...config, pushBeneficioDisponible: e.target.checked})}
                  className="w-5 h-5"
                  disabled={!config.pushHabilitado}
                />
                <div className="flex-1">
                  <span className="text-slate-300 block">🎁 Beneficio nuevo disponible</span>
                  <span className="text-slate-500 text-sm">Se envía cuando hay un beneficio de uso único disponible hoy</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={config.pushBeneficioVence}
                  onChange={(e) => setConfig({...config, pushBeneficioVence: e.target.checked})}
                  className="w-5 h-5"
                  disabled={!config.pushHabilitado}
                />
                <div className="flex-1">
                  <span className="text-slate-300 block">⏰ Beneficio está por vencer</span>
                  <span className="text-slate-500 text-sm">Se envía el día que vence un beneficio de uso único</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={config.pushCumpleanos}
                  onChange={(e) => setConfig({...config, pushCumpleanos: e.target.checked})}
                  className="w-5 h-5"
                  disabled={!config.pushHabilitado}
                />
                <div className="flex-1">
                  <span className="text-slate-300 block">🎂 Cumpleaños del cliente</span>
                  <span className="text-slate-500 text-sm">Se envía a las 9 AM del día de cumpleaños</span>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>💾 Guardar Configuración</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
