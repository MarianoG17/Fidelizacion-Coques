// src/lib/feedback-scheduler.ts
import { prisma } from './prisma'
import { sendPushNotification } from './push'
import { sendEmail } from './email'
import { getPlantilla, aplicarVars, buildHtmlPlantilla } from './email-plantillas'
import { signFeedbackToken } from './feedback-token'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.coques.com.ar'

/**
 * Genera el bloque HTML de botones de estrellas para emails de feedback.
 * Cada botón lleva a /encuesta?r=N&t=TOKEN
 */
function buildEstrellasHtml(token: string): string {
    const stars = [1, 2, 3, 4, 5]
    const botones = stars.map(n => {
        const url = `${APP_URL}/encuesta?r=${n}&t=${encodeURIComponent(token)}`
        const emoji = '⭐'.repeat(n)
        return `<a href="${url}" style="display:inline-block;padding:10px 14px;margin:4px;background:#f1f5f9;color:#1e293b;text-decoration:none;border-radius:10px;font-size:18px;border:1px solid #e2e8f0;" title="${n} estrella${n > 1 ? 's' : ''}">${emoji}</a>`
    }).join('')
    return `<div style="text-align:center;margin:16px 0;">${botones}</div>`
}

/**
 * Verifica y envía notificaciones de feedback pendientes de forma oportunística.
 *
 * Canales:
 * - Push: clientes con pushSub activo
 * - Email: clientes sin pushSub pero con email (fallback)
 *
 * Se limita a 10 clientes por ejecución.
 */
export async function verificarYEnviarFeedbacksPendientes(): Promise<{
    success: boolean
    processed: number
    sent: number
}> {
    try {
        const config = await prisma.configuracionApp.findFirst({
            select: {
                feedbackHabilitado: true,
                feedbackTiempoVisitaMinutos: true,
                feedbackFrecuenciaDias: true,
                pushHabilitado: true,
            },
        })

        if (!config || !config.feedbackHabilitado) {
            return { success: true, processed: 0, sent: 0 }
        }

        const tiempoEsperaMs = config.feedbackTiempoVisitaMinutos * 60 * 1000
        const timestampLimite = new Date(Date.now() - tiempoEsperaMs)

        const visitasPendientes = await prisma.eventoScan.findMany({
            where: {
                tipoEvento: 'VISITA',
                metodoValidacion: { notIn: ['BONUS_CUESTIONARIO', 'BONUS_REFERIDO'] },
                timestamp: {
                    lte: timestampLimite,
                    gte: new Date(Date.now() - 3 * 60 * 60 * 1000),
                },
            },
            select: { id: true, clienteId: true, timestamp: true },
            orderBy: { timestamp: 'desc' },
            take: 10,
        })

        if (visitasPendientes.length === 0) {
            return { success: true, processed: 0, sent: 0 }
        }

        let notificacionesEnviadas = 0

        for (const visita of visitasPendientes) {
            try {
                // 1. Verificar si ya tiene feedback para esta visita
                const yaRespondido = await prisma.feedback.findFirst({
                    where: { clienteId: visita.clienteId, createdAt: { gte: visita.timestamp } },
                })
                if (yaRespondido) continue

                // 2. Verificar si ya fue notificado (push o email) por esta visita
                const yaNotificado = await prisma.notificacion.findFirst({
                    where: {
                        clienteId: visita.clienteId,
                        tipo: { in: ['FEEDBACK_PENDIENTE', 'FEEDBACK_EMAIL'] },
                        metadata: { path: ['visitaId'], equals: visita.id },
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
                    where: { clienteId: visita.clienteId, tipoEvento: 'VISITA' },
                })
                if (cantidadVisitas < 2) continue

                // 5. Obtener cliente — push tiene prioridad, email es fallback
                const cliente = await prisma.cliente.findUnique({
                    where: { id: visita.clienteId },
                    select: { pushSub: true, email: true, nombre: true },
                })
                if (!cliente) continue

                // 6a. Enviar push si está disponible y habilitado
                if (cliente.pushSub && config.pushHabilitado) {
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
                            metadata: { visitaId: visita.id, timestamp: visita.timestamp.toISOString() },
                        },
                    })
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
                    continue // Push intentado — no enviar email además
                }

                // 6b. Email fallback — clientes sin push o sin app
                if (cliente.email) {
                    try {
                        const plantilla = await getPlantilla('feedback_email')
                        if (!plantilla.activa) continue

                        const token = await signFeedbackToken(visita.id, visita.clienteId)
                        const estrellasHtml = buildEstrellasHtml(token)

                        const nombre = cliente.nombre || 'cliente'
                        // Reemplazar variables de texto, luego inyectar HTML de estrellas
                        let cuerpo = aplicarVars(plantilla.cuerpo, { nombre })
                        cuerpo = cuerpo.replace('{{estrellas}}', estrellasHtml)
                        const asunto = aplicarVars(plantilla.asunto, { nombre })
                        const html = buildHtmlPlantilla(cuerpo)

                        const resultado = await sendEmail({ to: cliente.email, subject: asunto, html })

                        if (resultado.success) {
                            await prisma.notificacion.create({
                                data: {
                                    clienteId: visita.clienteId,
                                    titulo: '¿Cómo estuvo tu experiencia?',
                                    cuerpo: 'Email de encuesta enviado',
                                    tipo: 'FEEDBACK_EMAIL',
                                    url: null,
                                    leida: false,
                                    enviada: true,
                                    metadata: { visitaId: visita.id, timestamp: visita.timestamp.toISOString() },
                                },
                            })
                            notificacionesEnviadas++
                            console.log(`[Feedback Oportunístico] ✅ Email enviado a cliente ${visita.clienteId}`)
                        }
                    } catch (emailError) {
                        console.error(`[Feedback Oportunístico] Error enviando email a ${visita.clienteId}:`, emailError)
                    }
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
