'use client'
import { useState, useEffect } from 'react'
import NotificationCenter from './NotificationCenter'

export default function NotificationBell() {
  const [noLeidas, setNoLeidas] = useState(0)
  const [showCenter, setShowCenter] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNoLeidas()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchNoLeidas, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNoLeidas() {
    try {
      const res = await fetch('/api/notificaciones?no_leidas=true&limit=1')
      if (res.ok) {
        const data = await res.json()
        setNoLeidas(data.noLeidas || 0)
      }
    } catch (error) {
      console.error('Error al obtener notificaciones no leídas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenCenter() {
    setShowCenter(true)
  }

  function handleCloseCenter() {
    setShowCenter(false)
    // Refrescar contador al cerrar
    fetchNoLeidas()
  }

  return (
    <>
      <button
        onClick={handleOpenCenter}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notificaciones"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {showCenter && (
        <NotificationCenter 
          onClose={handleCloseCenter}
          onNotificationsRead={fetchNoLeidas}
        />
      )}
    </>
  )
}
