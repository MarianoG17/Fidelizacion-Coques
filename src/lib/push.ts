// src/lib/push.ts
import webPush from 'web-push'

// Configurar VAPID keys (se configuran al inicio del servidor)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
  webPush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export interface PushNotification {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
  data?: Record<string, any>  // Datos adicionales para el Service Worker
  actions?: Array<{
    action: string
    title: string
  }>
}

/**
 * Envía una notificación push a un cliente específico
 * @param subscription - Objeto de suscripción del cliente (pushSub en BD)
 * @param notification - Datos de la notificación
 * @returns Promise<boolean> - true si se envió correctamente
 */
export async function sendPushNotification(
  subscription: any,
  notification: PushNotification
): Promise<boolean> {
  if (!subscription) {
    console.warn('No hay suscripción push para este cliente')
    return false
  }

  try {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/icon-192x192.png',
      data: notification.data || { url: notification.url || '/pass' },
      actions: notification.actions || []
    })

    await webPush.sendNotification(subscription, payload)
    console.log('✅ Push notification enviada:', notification.title)
    return true
  } catch (error: any) {
    console.error('❌ Error al enviar push notification:', error)

    // Si la suscripción está expirada o es inválida, retornar false
    // para que el llamador pueda limpiarla de la BD
    if (error.statusCode === 410) {
      console.warn('⚠️ Suscripción expirada o inválida')
      return false
    }

    return false
  }
}

/**
 * Envía notificaciones push a múltiples clientes
 * @param subscriptions - Array de objetos { clienteId, pushSub }
 * @param notification - Datos de la notificación
 * @returns Promise con estadísticas de envío
 */
export async function sendPushToMultiple(
  subscriptions: Array<{ clienteId: string; pushSub: any }>,
  notification: PushNotification
): Promise<{ sent: number; failed: number; expired: string[] }> {
  const results = await Promise.allSettled(
    subscriptions.map(async ({ clienteId, pushSub }) => {
      const success = await sendPushNotification(pushSub, notification)
      return { clienteId, success }
    })
  )

  const stats = {
    sent: 0,
    failed: 0,
    expired: [] as string[]
  }

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      stats.sent++
    } else {
      stats.failed++
      // Si falló, podría ser suscripción expirada
      stats.expired.push(subscriptions[index].clienteId)
    }
  })

  console.log(`📊 Push enviadas: ${stats.sent} exitosas, ${stats.failed} fallidas`)
  return stats
}

/**
 * Helper: Convierte base64 URL-safe a Uint8Array (para VAPID keys en frontend)
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = Buffer.from(base64, 'base64')
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData[i]
  }

  return outputArray
}
