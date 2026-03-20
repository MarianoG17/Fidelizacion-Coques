// src/app/api/jobs/notificaciones-cumpleanos/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/push'

/**
 * Job que envía notificaciones push a clientes en su cumpleaños
 * 
 * IMPORTANTE: Solo envía notificación el DÍA EXACTO del cumpleaños
 * (no los días antes ni después, aunque el beneficio esté activo esos días)
 * 
 * Ejecutar diariamente a las 9:00 AM con cron:
 * 0 9 * * * (cada día a las 9:00)
 */
export async function GET(req: Request) {
    try {
        // Verificar configuración
        const config = await prisma.configuracionApp.findFirst({
            select: {
                pushHabilitado: true,
                pushCumpleanos: true,
            }
        })

        if (!config || !config.pushHabilitado || !config.pushCumpleanos) {
            return NextResponse.json({
                success: true,
                message: 'Push de cumpleaños deshabilitado en configuración',
                enviadas: 0
            })
        }

        // Obtener fecha de hoy en Argentina
        const hoy = new Date()
        const mesHoy = hoy.getMonth() + 1 // 1-12
        const diaHoy = hoy.getDate() // 1-31

        console.log(`[Job Cumpleaños] Buscando cumpleaños para: ${diaHoy}/${mesHoy}`)

        // Buscar clientes con cumpleaños HOY
        // Usamos EXTRACT para comparar solo mes y día (ignorando año)
        const clientesConCumpleanos = await prisma.$queryRaw<Array<{
            id: string
            nombre: string
            fechaCumpleanos: Date
            pushSub: any
        }>>`
      SELECT id, nombre, "fechaCumpleanos", "pushSub"
      FROM "Cliente"
      WHERE "fechaCumpleanos" IS NOT NULL
        AND "pushSub" IS NOT NULL
        AND EXTRACT(MONTH FROM "fechaCumpleanos") = ${mesHoy}
        AND EXTRACT(DAY FROM "fechaCumpleanos") = ${diaHoy}
    `

        console.log(`[Job Cumpleaños] Encontrados ${clientesConCumpleanos.length} clientes con cumpleaños hoy`)

        if (clientesConCumpleanos.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No hay cumpleaños hoy',
                enviadas: 0
            })
        }

        // Verificar cuáles ya recibieron notificación este año
        const anoActual = hoy.getFullYear()
        const inicioAno = new Date(anoActual, 0, 1)
        const finAno = new Date(anoActual, 11, 31, 23, 59, 59)

        let enviadas = 0
        let yaEnviadas = 0

        for (const cliente of clientesConCumpleanos) {
            // Verificar si ya enviamos notificación de cumpleaños este año
            const notifExistente = await prisma.notificacion.findFirst({
                where: {
                    clienteId: cliente.id,
                    tipo: 'CUMPLEANOS',
                    creadoEn: {
                        gte: inicioAno,
                        lte: finAno
                    }
                }
            })

            if (notifExistente) {
                console.log(`[Job Cumpleaños] Ya se envió notificación este año a ${cliente.nombre || cliente.id}`)
                yaEnviadas++
                continue
            }

            // Obtener beneficio de cumpleaños activo
            const beneficioCumpleanos = await prisma.beneficio.findFirst({
                where: {
                    activo: true,
                    condiciones: {
                        path: ['requiereFechaCumpleanos'],
                        equals: true
                    }
                }
            })

            if (!beneficioCumpleanos) {
                console.log('[Job Cumpleaños] No hay beneficio de cumpleaños configurado')
                continue
            }

            const condiciones = beneficioCumpleanos.condiciones as any
            const diasAntes = condiciones.diasAntes || 0
            const diasDespues = condiciones.diasDespues || 0
            const diasTotales = diasAntes + diasDespues + 1

            // Determinar el porcentaje desde condiciones
            const porcentaje = condiciones.porcentajeDescuento || 15

            try {
                // Crear notificación en BD primero
                const notificacion = await prisma.notificacion.create({
                    data: {
                        clienteId: cliente.id,
                        tipo: 'CUMPLEANOS',
                        titulo: '🎂 ¡Feliz cumpleaños!',
                        cuerpo: `Disfrutá tu ${porcentaje}% de descuento durante ${diasTotales} días 🎉`,
                        icono: '🎂',
                        url: '/pass',
                        leida: false,
                        enviada: false,
                        metadata: {
                            porcentaje,
                            diasTotales,
                            beneficioId: beneficioCumpleanos.id
                        }
                    }
                })

                // Enviar push notification
                const pushEnviado = await sendPushNotification(cliente.pushSub, {
                    title: '🎂 ¡Feliz cumpleaños!',
                    body: `Disfrutá tu ${porcentaje}% de descuento durante ${diasTotales} días 🎉`,
                    url: '/pass',
                    icon: '/icon-192x192-v2.png',
                    badge: '/icon-192x192-v2.png'
                }, {
                    clienteId: cliente.id,
                    tipo: 'CUMPLEANOS',
                    metadata: { beneficioId: beneficioCumpleanos.id }
                })

                if (pushEnviado) {
                    // Marcar como enviada
                    await prisma.notificacion.update({
                        where: { id: notificacion.id },
                        data: { enviada: true }
                    })

                    enviadas++
                    console.log(`[Job Cumpleaños] ✅ Notificación enviada a ${cliente.nombre || cliente.id}`)
                } else {
                    console.log(`[Job Cumpleaños] ⚠️ No se pudo enviar push a ${cliente.nombre || cliente.id}`)
                }

            } catch (error) {
                console.error(`[Job Cumpleaños] Error enviando a ${cliente.nombre || cliente.id}:`, error)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Job ejecutado correctamente`,
            fecha: hoy.toISOString(),
            clientesConCumpleanos: clientesConCumpleanos.length,
            enviadas,
            yaEnviadas,
            pendientes: clientesConCumpleanos.length - enviadas - yaEnviadas
        })

    } catch (error: any) {
        console.error('[Job Cumpleaños] Error:', error)
        return NextResponse.json(
            { error: 'Error al ejecutar job de cumpleaños', details: error.message },
            { status: 500 }
        )
    }
}
