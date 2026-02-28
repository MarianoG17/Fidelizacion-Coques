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
      setIsEnabled(!!subscription && Notification.permission === 'granted')
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
        // Desactivar notificaciones
        await disableNotifications()
      } else {
        // Activar notificaciones
        await enableNotifications()
      }
    } catch (error) {
      console.error('Error al cambiar estado de notificaciones:', error)
      alert('Error al cambiar las notificaciones. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  async function enableNotifications() {
    // Pedir permiso
    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      alert('Necesitamos tu permiso para enviarte notificaciones')
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready

      // Obtener VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        throw new Error('VAPID public key no configurada')
      }

      // Suscribirse a push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Guardar suscripción en el servidor
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      })

      if (!response.ok) {
        throw new Error('Error al guardar suscripción en el servidor')
      }

      setIsEnabled(true)
      alert('✅ Notificaciones activadas correctamente')
    } catch (error) {
      console.error('Error al activar notificaciones:', error)
      throw error
    }
  }

  async function disableNotifications() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      // Informar al servidor
      await fetch('/api/push/subscribe', {
        method: 'DELETE'
      })

      setIsEnabled(false)
      alert('🔕 Notificaciones desactivadas')
    } catch (error) {
      console.error('Error al desactivar notificaciones:', error)
      throw error
    }
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
              ? 'Recibís notificaciones de tu auto, beneficios y más'
              : 'Activate para recibir notificaciones importantes'
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
