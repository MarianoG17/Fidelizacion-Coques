// src/lib/feedback-scheduler.ts
import { prisma } from './prisma'
import { sendPushNotification } from './push'

/**
 * Verifica y envía notificaciones de feedback pendientes de forma oportunística
 * 
 * Se ejecuta automáticamente en eventos frecuentes del sistema:
 * - Webhook de Deltawash (cada vez que actualizan un auto)
 * - Escaneos en mostrador (cada vez que registran una visita)
 * 
 * Limita a 10 clientes por ejecución para ser eficiente y no sobrecargar.
 */
export async function verificarYEnviarFeedbacksPendientes(): Promise<{
  success: boolean
  processed: number
  sent: number
}> {
  try {
    // Obtener configuración
    const config = await prisma.configuracionApp.findFirst({
      select: {
        feedbackHabilitado: true,
        feedbackTiempoVisitaMinutos: true,
        feedbackFrecuenciaDias: true,
        pushHabilitado: true,
      },
    })

    if (!config || !config.feedbackHabilitado || !config.pushHabilitado) {
      return { success: true, processed: 0, sent: 0 }
    }

    // Calcular timestamp límite (visitas que ya pasaron el tiempo de espera)
    const tiempoEsperaMs = config.feedbackTiempoVisitaMinutos * 60 * 1000
    const timestampLimite = new Date(Date.now() - tiempoEsperaMs)
    
    // Buscar visitas que ya deberían tener feedback
    // Solo últimas 3 horas para ser eficiente
    // Excluir visitas bonus (cuestionario) — no son visitas reales al local
    const visitasPendientes = await prisma.eventoScan.findMany({
      where: {
        tipoEvento: 'VISITA',
        metodoValidacion: { notIn: ['BONUS_CUESTIONARIO', 'BONUS_REFERIDO'] },
        timestamp: {
          lte: timestampLimite, // Ya pasó el tiempo de espera
          gte: new Date(Date.now() - 3 * 60 * 60 * 1000), // Últimas 3 horas
        },
      },
      select: {
        id: true,
        clienteId: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 10, // Máximo 10 por ejecución
    })

    if (visitasPendientes.length === 0) {
      return { success: true, processed: 0, sent: 0 }
    }

    let notificacionesEnviadas = 0

    for (const visita of visitasPendientes) {
      try {
        // 1. Verificar si ya tiene feedback para esta visita
        const yaRespondido = await prisma.feedback.findFirst({
          where: {
            clienteId: visita.clienteId,
            createdAt: { gte: visita.timestamp },
          },
        })
        if (yaRespondido) continue

        // 2. Verificar si ya existe notificación para esta visita específica
        const yaNotificado = await prisma.notificacion.findFirst({
          where: {
            clienteId: visita.clienteId,
            tipo: 'FEEDBACK_PENDIENTE',
            metadata: {
              path: ['visitaId'],
              equals: visita.id,
            },
          },
        })
        if (yaNotificado) continue

        // 3. Verificar frecuencia mínima entre feedbacks
        const ultimoFeedback = await prisma.feedback.findFirst({
          where: { clienteId: visita.clienteId },
          orderBy: { createdAt: 'desc' },
        })

        if (ultimoFeedback) {
          const diasDesdeUltimo =
            (Date.now() - ultimoFeedback.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          if (diasDesdeUltimo < config.feedbackFrecuenciaDias) continue
        }

        // 4. No pedir feedback en la primera visita
        const cantidadVisitas = await prisma.eventoScan.count({
          where: {
            clienteId: visita.clienteId,
            tipoEvento: 'VISITA',
          },
        })
        if (cantidadVisitas < 2) continue

        // 5. Obtener cliente con pushSub
        const cliente = await prisma.cliente.findUnique({
          where: { id: visita.clienteId },
          select: { pushSub: true },
        })
        if (!cliente?.pushSub) continue

        // 6. Crear notificación en BD
        const notificacion = await prisma.notificacion.create({
          data: {
            clienteId: visita.clienteId,
            titulo: '¿Cómo estuvo tu experiencia?',
            cuerpo: 'Contanos qué te pareció tu visita a Coques. Tu opinión nos ayuda a mejorar 😊',
            icono: '📊',
            tipo: 'FEEDBACK_PENDIENTE',
            url: null,
            leida: false,
            enviada: false,
            metadata: {
              visitaId: visita.id,
              timestamp: visita.timestamp.toISOString(),
            },
          },
        })

        // 7. Enviar push notification
        const pushEnviado = await sendPushNotification(cliente.pushSub, {
          title: '¿Cómo estuvo tu experiencia?',
          body: 'Contanos qué te pareció tu visita a Coques. Tu opinión nos ayuda a mejorar 😊',
          icon: '📊',
          url: '/pass',
        })

        if (pushEnviado) {
          await prisma.notificacion.update({
            where: { id: notificacion.id },
            data: { enviada: true },
          })
          notificacionesEnviadas++
          console.log(`[Feedback Oportunístico] ✅ Push enviado a cliente ${visita.clienteId}`)
        }
      } catch (error) {
        console.error(`[Feedback Oportunístico] Error en visita ${visita.id}:`, error)
      }
    }

    if (notificacionesEnviadas > 0) {
      console.log(`[Feedback Oportunístico] Enviadas ${notificacionesEnviadas} de ${visitasPendientes.length} revisadas`)
    }

    return {
      success: true,
      processed: visitasPendientes.length,
      sent: notificacionesEnviadas,
    }
  } catch (error) {
    console.error('[Feedback Oportunístico] Error general:', error)
    return { success: false, processed: 0, sent: 0 }
  }
}
