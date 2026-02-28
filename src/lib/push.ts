// src/lib/push.ts
import webPush from 'web-push'
import { prisma } from './prisma'

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

export interface PushNotificationOptions {
  clienteId?: string  // ID del cliente para guardar en historial
  tipo?: string       // Tipo de notificación: AUTO_LISTO, NUEVO_NIVEL, etc.
  metadata?: any      // Metadata adicional a guardar
  saveToHistory?: boolean  // Si guardar en BD (default: true si hay clienteId)
}

/**
 * Envía una notificación push a un cliente específico
 * @param subscription - Objeto de suscripción del cliente (pushSub en BD)
 * @param notification - Datos de la notificación
 * @param options - Opciones adicionales (clienteId, tipo, metadata)
 * @returns Promise<boolean> - true si se envió correctamente
 */
export async function sendPushNotification(
  subscription: any,
  notification: PushNotification,
  options?: PushNotificationOptions
): Promise<boolean> {
  if (!subscription) {
    console.warn('No hay suscripción push para este cliente')
    return false
  }

  const { clienteId, tipo, metadata, saveToHistory = !!clienteId } = options || {}
  let notificacionId: string | undefined

  // Guardar en BD antes de enviar (si se especificó clienteId)
  if (saveToHistory && clienteId) {
    try {
      const notificacion = await prisma.notificacion.create({
        data: {
          clienteId,
          titulo: notification.title,
          cuerpo: notification.body,
          url: notification.url,
          icono: notification.icon,
          tipo,
          metadata: metadata || null,
          enviada: false
        }
      })
      notificacionId = notificacion.id
    } catch (error) {
      console.error('Error al guardar notificación en BD:', error)
      // Continuamos aunque falle el guardado
    }
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

    // Marcar como enviada en BD
    if (notificacionId) {
      try {
        await prisma.notificacion.update({
          where: { id: notificacionId },
          data: { enviada: true }
        })
      } catch (error) {
        console.error('Error al actualizar estado de notificación:', error)
      }
    }

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
 * @param options - Opciones para todas las notificaciones (tipo, metadata)
 * @returns Promise con estadísticas de envío
 */
export async function sendPushToMultiple(
  subscriptions: Array<{ clienteId: string; pushSub: any }>,
  notification: PushNotification,
  options?: Omit<PushNotificationOptions, 'clienteId'>
): Promise<{ sent: number; failed: number; expired: string[] }> {
  const results = await Promise.allSettled(
    subscriptions.map(async ({ clienteId, pushSub }) => {
      const success = await sendPushNotification(pushSub, notification, {
        ...options,
        clienteId
      })
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
