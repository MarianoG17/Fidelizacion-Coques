// src/app/api/jobs/notificaciones-cumpleanos/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/push'

/**
 * Job que envía notificaciones push a clientes relacionadas con cumpleaños
 *
 * ENVÍA 2 NOTIFICACIONES:
 * 1. 3 DÍAS ANTES: "Tu beneficio de cumpleaños ya está disponible! 15% OFF durante 7 días"
 * 2. DÍA CUMPLEAÑOS: "¡Feliz cumpleaños! Recordá que tenés 15% OFF hasta..."
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

        // Calcular fecha dentro de 3 días (para notificación de inicio)
        const en3Dias = new Date(hoy)
        en3Dias.setDate(en3Dias.getDate() + 3)
        const mes3Dias = en3Dias.getMonth() + 1
        const dia3Dias = en3Dias.getDate()

        console.log(`[Job Cumpleaños] Buscando:`)
        console.log(`  - Cumpleaños HOY: ${diaHoy}/${mesHoy}`)
        console.log(`  - Cumpleaños en 3 días: ${dia3Dias}/${mes3Dias}`)

        // 1. Buscar clientes con cumpleaños en 3 DÍAS (para notif de inicio)
        const clientesInicio = await prisma.$queryRaw<Array<{
            id: string
            nombre: string
            fechaCumpleanos: Date
            pushSub: any
        }>>`
          SELECT id, nombre, "fechaCumpleanos", "pushSub"
          FROM "Cliente"
          WHERE "fechaCumpleanos" IS NOT NULL
            AND EXTRACT(MONTH FROM "fechaCumpleanos") = ${mes3Dias}
            AND EXTRACT(DAY FROM "fechaCumpleanos") = ${dia3Dias}
        `

        // 2. Buscar clientes con cumpleaños HOY (para felicitación)
        const clientesCumple = await prisma.$queryRaw<Array<{
            id: string
            nombre: string
            fechaCumpleanos: Date
            pushSub: any
        }>>`
          SELECT id, nombre, "fechaCumpleanos", "pushSub"
          FROM "Cliente"
          WHERE "fechaCumpleanos" IS NOT NULL
            AND EXTRACT(MONTH FROM "fechaCumpleanos") = ${mesHoy}
            AND EXTRACT(DAY FROM "fechaCumpleanos") = ${diaHoy}
        `

        console.log(`[Job Cumpleaños] Encontrados:`)
        console.log(`  - ${clientesInicio.length} con beneficio iniciando`)
        console.log(`  - ${clientesCumple.length} con cumpleaños hoy`)

        if (clientesInicio.length === 0 && clientesCumple.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No hay cumpleaños ni beneficios iniciando hoy',
                enviadasInicio: 0,
                enviadasCumple: 0
            })
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
            return NextResponse.json({
                success: true,
                message: 'No hay beneficio de cumpleaños configurado',
                enviadasInicio: 0,
                enviadasCumple: 0
            })
        }

        const condiciones = beneficioCumpleanos.condiciones as any
        const diasAntes = condiciones.diasAntes || 0
        const diasDespues = condiciones.diasDespues || 0
        const diasTotales = diasAntes + diasDespues + 1
        const porcentaje = condiciones.porcentajeDescuento || 15

        const anoActual = hoy.getFullYear()
        const inicioAno = new Date(anoActual, 0, 1)
        const finAno = new Date(anoActual, 11, 31, 23, 59, 59)

        let enviadasInicio = 0
        let yaEnviadasInicio = 0
        let enviadasCumple = 0
        let yaEnviadasCumple = 0

        // ═══════════════════════════════════════════════════════════════
        // 1. NOTIFICACIÓN DE INICIO (3 días antes)
        // ═══════════════════════════════════════════════════════════════
        for (const cliente of clientesInicio) {
            // Verificar si ya enviamos notificación de INICIO este año
            const notifExistente = await prisma.notificacion.findFirst({
                where: {
                    clienteId: cliente.id,
                    tipo: 'CUMPLEANOS_INICIO',
                    creadoEn: {
                        gte: inicioAno,
                        lte: finAno
                    }
                }
            })

            if (notifExistente) {
                console.log(`[Inicio] Ya se envió a ${cliente.nombre || cliente.id}`)
                yaEnviadasInicio++
                continue
            }

            try {
                const notificacion = await prisma.notificacion.create({
                    data: {
                        clienteId: cliente.id,
                        tipo: 'CUMPLEANOS_INICIO',
                        titulo: '🎁 Tu beneficio de cumpleaños está disponible',
                        cuerpo: `¡Ya podés disfrutar tu ${porcentaje}% de descuento durante ${diasTotales} días! 🎉`,
                        icono: '🎁',
                        url: '/pass',
                        leida: false,
                        enviada: false,
                        metadata: {
                            porcentaje,
                            diasTotales,
                            beneficioId: beneficioCumpleanos.id,
                            tipo: 'inicio'
                        }
                    }
                })

                const pushEnviado = cliente.pushSub
                    ? await sendPushNotification(cliente.pushSub, {
                        title: '🎁 Tu beneficio de cumpleaños está disponible',
                        body: `¡Ya podés disfrutar tu ${porcentaje}% de descuento durante ${diasTotales} días! 🎉`,
                        url: '/pass',
                        icon: '/icon-192x192-v2.png',
                        badge: '/icon-192x192-v2.png'
                    })
                    : false

                if (pushEnviado) {
                    await prisma.notificacion.update({
                        where: { id: notificacion.id },
                        data: { enviada: true }
                    })
                    enviadasInicio++
                    console.log(`[Inicio] ✅ Enviado a ${cliente.nombre || cliente.id}`)
                }
            } catch (error) {
                console.error(`[Inicio] Error enviando a ${cliente.nombre || cliente.id}:`, error)
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // 2. NOTIFICACIÓN DE CUMPLEAÑOS (día exacto)
        // ═══════════════════════════════════════════════════════════════
        for (const cliente of clientesCumple) {
            // Verificar si ya enviamos felicitación este año
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
                console.log(`[Cumpleaños] Ya se envió a ${cliente.nombre || cliente.id}`)
                yaEnviadasCumple++
                continue
            }

            // Calcular fecha de expiración del beneficio
            const fechaExpiracion = new Date(en3Dias)
            fechaExpiracion.setDate(fechaExpiracion.getDate() + diasDespues)
            const diaExpira = fechaExpiracion.getDate()
            const mesExpira = fechaExpiracion.getMonth() + 1

            try {
                const notificacion = await prisma.notificacion.create({
                    data: {
                        clienteId: cliente.id,
                        tipo: 'CUMPLEANOS',
                        titulo: '🎂 ¡Feliz cumpleaños!',
                        cuerpo: `Recordá que tenés ${porcentaje}% OFF hasta el ${diaExpira}/${mesExpira} 🎉`,
                        icono: '🎂',
                        url: '/pass',
                        leida: false,
                        enviada: false,
                        metadata: {
                            porcentaje,
                            diasRestantes: diasDespues + 1,
                            beneficioId: beneficioCumpleanos.id,
                            tipo: 'felicitacion'
                        }
                    }
                })

                const pushEnviado = cliente.pushSub
                    ? await sendPushNotification(cliente.pushSub, {
                        title: '🎂 ¡Feliz cumpleaños!',
                        body: `Recordá que tenés ${porcentaje}% OFF hasta el ${diaExpira}/${mesExpira} 🎉`,
                        url: '/pass',
                        icon: '/icon-192x192-v2.png',
                        badge: '/icon-192x192-v2.png'
                    })
                    : false

                if (pushEnviado) {
                    await prisma.notificacion.update({
                        where: { id: notificacion.id },
                        data: { enviada: true }
                    })
                    enviadasCumple++
                    console.log(`[Cumpleaños] ✅ Enviado a ${cliente.nombre || cliente.id}`)
                }
            } catch (error) {
                console.error(`[Cumpleaños] Error enviando a ${cliente.nombre || cliente.id}:`, error)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Job ejecutado correctamente`,
            fecha: hoy.toISOString(),
            notificacionesInicio: {
                total: clientesInicio.length,
                enviadas: enviadasInicio,
                yaEnviadas: yaEnviadasInicio
            },
            notificacionesCumple: {
                total: clientesCumple.length,
                enviadas: enviadasCumple,
                yaEnviadas: yaEnviadasCumple
            }
        })

    } catch (error: any) {
        console.error('[Job Cumpleaños] Error:', error)
        return NextResponse.json(
            { error: 'Error al ejecutar job de cumpleaños', details: error.message },
            { status: 500 }
        )
    }
}
