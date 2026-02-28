'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Notificacion {
  id: string
  titulo: string
  cuerpo: string
  url: string | null
  icono: string | null
  leida: boolean
  tipo: string | null
  creadoEn: string
  leidaEn: string | null
}

interface NotificationCenterProps {
  onClose: () => void
  onNotificationsRead?: () => void
}

export default function NotificationCenter({ onClose, onNotificationsRead }: NotificationCenterProps) {
  const router = useRouter()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [noLeidas, setNoLeidas] = useState(0)

  useEffect(() => {
    fetchNotificaciones()
  }, [])

  async function fetchNotificaciones() {
    try {
      const res = await fetch('/api/notificaciones?limit=50')
      if (res.ok) {
        const data = await res.json()
        setNotificaciones(data.notificaciones || [])
        setNoLeidas(data.noLeidas || 0)
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function marcarComoLeida(notificacionId: string) {
    try {
      const res = await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificacionIds: [notificacionId] })
      })

      if (res.ok) {
        // Actualizar localmente
        setNotificaciones(prev =>
          prev.map(n =>
            n.id === notificacionId ? { ...n, leida: true, leidaEn: new Date().toISOString() } : n
          )
        )
        setNoLeidas(prev => Math.max(0, prev - 1))
        onNotificationsRead?.()
      }
    } catch (error) {
      console.error('Error al marcar como leída:', error)
    }
  }

  async function marcarTodasLeidas() {
    try {
      const res = await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marcarTodasLeidas: true })
      })

      if (res.ok) {
        setNotificaciones(prev =>
          prev.map(n => ({ ...n, leida: true, leidaEn: new Date().toISOString() }))
        )
        setNoLeidas(0)
        onNotificationsRead?.()
      }
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error)
    }
  }

  function handleNotificacionClick(notif: Notificacion) {
    // Marcar como leída
    if (!notif.leida) {
      marcarComoLeida(notif.id)
    }

    // Si tiene URL, navegar
    if (notif.url) {
      router.push(notif.url)
      onClose()
    }
  }

  function getIconoTipo(tipo: string | null) {
    switch (tipo) {
      case 'AUTO_LISTO':
        return '🚗'
      case 'NUEVO_NIVEL':
        return '🎉'
      case 'BENEFICIO':
        return '🎁'
      case 'CUMPLEANOS':
        return '🎂'
      default:
        return '🔔'
    }
  }

  function formatearFecha(fecha: string) {
    const date = new Date(fecha)
    const ahora = new Date()
    const diff = ahora.getTime() - date.getTime()
    const minutos = Math.floor(diff / 60000)
    const horas = Math.floor(diff / 3600000)
    const dias = Math.floor(diff / 86400000)

    if (minutos < 1) return 'Ahora'
    if (minutos < 60) return `Hace ${minutos}m`
    if (horas < 24) return `Hace ${horas}h`
    if (dias < 7) return `Hace ${dias}d`
    return date.toLocaleDateString('es-AR')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black bg-opacity-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Notificaciones</h2>
            {noLeidas > 0 && (
              <p className="text-sm text-slate-400">{noLeidas} sin leer</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        {noLeidas > 0 && (
          <div className="p-3 border-b border-slate-700">
            <button
              onClick={marcarTodasLeidas}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Marcar todas como leídas
            </button>
          </div>
        )}

        {/* Lista de notificaciones */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <svg className="w-16 h-16 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p>No tenés notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {notificaciones.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificacionClick(notif)}
                  className={`w-full text-left p-4 hover:bg-slate-700 transition-colors ${
                    !notif.leida ? 'bg-slate-750' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {notif.icono || getIconoTipo(notif.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-semibold ${!notif.leida ? 'text-white' : 'text-slate-300'}`}>
                          {notif.titulo}
                        </h3>
                        {!notif.leida && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {notif.cuerpo}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {formatearFecha(notif.creadoEn)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
