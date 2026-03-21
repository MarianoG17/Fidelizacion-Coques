
'use client'
import { useState, useEffect } from 'react'

export default function NotificationToggle() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkNotificationStatus()
  }, [])

  async function checkNotificationStatus() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false)
      setIsLoading(false)
      return
    }

    setIsSupported(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsEnabled(!!subscription)
    } catch (error) {
      console.error('Error al verificar estado de notificaciones:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleNotifications() {
    if (!isSupported) {
      alert('Tu navegador no soporta notificaciones push')
      return
    }

    setIsLoading(true)

    try {
      if (isEnabled) {
        await disableNotifications()
        setIsEnabled(false)
      } else {
        await enableNotifications()
        setIsEnabled(true)
      }
    } catch (error) {
      // Los errores de enable/disable traen mensajes amigables
      const mensaje = error instanceof Error ? error.message : 'Error al cambiar las notificaciones. Intentá de nuevo.'
      alert(mensaje)

      // Revalidar estado real
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsEnabled(!!subscription)
      } catch {
        // dejar estado anterior
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function enableNotifications() {
    // Si el permiso ya está denegado, indicar cómo habilitarlo desde el sistema
    if (Notification.permission === 'denied') {
      throw new Error('Las notificaciones están bloqueadas en este dispositivo. Para activarlas andá a Configuración → Aplicaciones → Chrome → Notificaciones.')
    }

    // Solo pedimos permiso si todavía no fue otorgado (evita comportamiento raro en iOS/Android)
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Para recibir notificaciones necesitamos tu permiso. Intentá de nuevo y tocá "Permitir".')
      }
    }

    const registration = await navigator.serviceWorker.ready

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      throw new Error('Error de configuración. Contactá al administrador.')
    }

    // Si hay una suscripción anterior inválida, limpiarla antes de crear una nueva
    const existingSub = await registration.pushManager.getSubscription()
    if (existingSub) {
      await existingSub.unsubscribe()
    }

    let subscription: PushSubscription
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })
    } catch (error) {
      console.error('pushManager.subscribe falló:', error)
      throw new Error('No se pudo activar las notificaciones. Verificá que la app esté instalada en la pantalla de inicio e intentá de nuevo.')
    }

    // Guardar suscripción en el servidor
    const jwtToken = localStorage.getItem('fidelizacion_token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify(subscription)
    })

    if (!response.ok) {
      throw new Error('Notificaciones activadas en el dispositivo pero no se pudieron guardar. Intentá de nuevo.')
    }
  }

  async function disableNotifications() {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
    }

    const jwtToken = localStorage.getItem('fidelizacion_token')
    const headers: Record<string, string> = {}
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`

    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers,
    })
  }

  if (!isSupported) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🔕</div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">Notificaciones Push</h3>
            <p className="text-slate-400 text-sm">
              Tu navegador no soporta notificaciones push
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{isEnabled ? '🔔' : '🔕'}</div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">Notificaciones Push</h3>
          <p className="text-slate-400 text-sm">
            {isEnabled
              ? 'Recibís notificaciones de tu pastelería favorita 🎂'
              : 'Recibí notificaciones de tu pastelería favorita'
            }
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={toggleNotifications}
            disabled={isLoading}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  )
}

// Helper function
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray as Uint8Array<ArrayBuffer>
}
