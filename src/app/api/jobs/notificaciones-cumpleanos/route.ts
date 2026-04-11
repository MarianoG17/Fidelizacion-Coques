// src/app/api/jobs/notificaciones-cumpleanos/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/push'
import { buildWooHeaders } from '@/lib/woocommerce-headers'
import { normalizarTelefono } from '@/lib/phone'
import { evaluarNivel } from '@/lib/beneficios'
import { sendEmail } from '@/lib/email'

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

        // ═══════════════════════════════════════════════════════════════
        // 3. SINCRONIZAR PEDIDOS WOOCOMMERCE → NEON (fallback webhook)
        // ═══════════════════════════════════════════════════════════════
        let pedidosCreados = 0
        try {
            const wooUrl = process.env.WOOCOMMERCE_URL
            const wooKey = process.env.WOOCOMMERCE_KEY
            const wooSecret = process.env.WOOCOMMERCE_SECRET

            if (wooUrl && wooKey && wooSecret) {
                const wooHeaders = buildWooHeaders(wooKey, wooSecret)
                const local = await prisma.local.findFirst({ where: { tipo: 'cafeteria' } })

                if (local) {
                    const allOrders: any[] = []
                    for (let page = 1; page <= 2; page++) {
                        try {
                            const res = await fetch(
                                `${wooUrl}/wp-json/wc/v3/orders?status=completed&per_page=50&page=${page}&orderby=date&order=desc`,
                                { headers: wooHeaders }
                            )
                            if (!res.ok) break
                            const orders = await res.json()
                            if (!orders.length) break
                            allOrders.push(...orders)
                        } catch { break }
                    }

                    const wooIdsEnDB = new Set(
                        (await prisma.eventoScan.findMany({
                            where: { tipoEvento: 'PEDIDO_TORTA', notas: { startsWith: 'Pedido WooCommerce #' } },
                            select: { notas: true },
                        })).map(e => e.notas?.replace('Pedido WooCommerce #', '').trim())
                    )

                    for (const order of allOrders) {
                        if (wooIdsEnDB.has(String(order.id))) continue
                        const phoneNorm = normalizarTelefono(order.billing?.phone ?? '')
                        let cli = phoneNorm ? await prisma.cliente.findUnique({ where: { phone: phoneNorm } }) : null
                        if (!cli && order.billing?.email) {
                            cli = await prisma.cliente.findUnique({ where: { email: order.billing.email } })
                        }
                        if (!cli) continue
                        const fechaRaw = order.date_completed || order.date_created
                        const fecha = new Date(fechaRaw.includes('Z') || fechaRaw.includes('+') ? fechaRaw : fechaRaw + 'Z')
                        const monto = order.total ? parseFloat(order.total) : undefined
                        await prisma.eventoScan.create({
                            data: {
                                timestamp: fecha,
                                clienteId: cli.id,
                                localId: local.id,
                                tipoEvento: 'PEDIDO_TORTA',
                                metodoValidacion: 'QR',
                                contabilizada: true,
                                notas: `Pedido WooCommerce #${order.id}`,
                                ...(monto ? { monto } : {}),
                            },
                        })
                        await evaluarNivel(cli.id)
                        pedidosCreados++
                    }
                    console.log(`[Job] Pedidos WooCommerce sincronizados: ${pedidosCreados}`)
                }
            }
        } catch (syncError) {
            console.error('[Job] Error sincronizando pedidos WooCommerce:', syncError)
        }

        // ═══════════════════════════════════════════════════════════════
        // 4. EMAIL DE REACTIVACIÓN (clientes sin visita en 30 días)
        // ═══════════════════════════════════════════════════════════════
        let emailsReactivacion = 0
        try {
            const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000)
            const hace60 = new Date(hoy.getTime() - 60 * 24 * 60 * 60 * 1000)

            // Clientes que visitaron entre hace 60 y hace 30 días pero NO en los últimos 30 días
            const recientes = await prisma.eventoScan.groupBy({
                by: ['clienteId'],
                where: { tipoEvento: 'VISITA', contabilizada: true, timestamp: { gte: hace30 } },
            })
            const idsRecientes = new Set(recientes.map(r => r.clienteId))

            const anteriores = await prisma.eventoScan.groupBy({
                by: ['clienteId'],
                where: { tipoEvento: 'VISITA', contabilizada: true, timestamp: { gte: hace60, lt: hace30 } },
            })
            const idsParaReactivar = anteriores.map(r => r.clienteId).filter(id => !idsRecientes.has(id))

            if (idsParaReactivar.length > 0) {
                const clientesReactivar = await prisma.cliente.findMany({
                    where: {
                        id: { in: idsParaReactivar },
                        estado: 'ACTIVO',
                        email: { not: null },
                    },
                    select: { id: true, nombre: true, email: true },
                })

                for (const cliente of clientesReactivar) {
                    if (!cliente.email) continue

                    // Verificar que no le hayamos mandado este email en los últimos 30 días
                    const yaEnviado = await prisma.notificacion.findFirst({
                        where: {
                            clienteId: cliente.id,
                            tipo: 'REACTIVACION_EMAIL',
                            creadoEn: { gte: hace30 },
                        },
                    })
                    if (yaEnviado) continue

                    const nombre = cliente.nombre?.split(' ')[0] || 'cliente'
                    const resultado = await sendEmail({
                        to: cliente.email,
                        subject: `¡${nombre}, te extrañamos en Coques Bakery! ☕`,
                        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8f8f8;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e;padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">Coques Bakery</h1>
      <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Programa de Fidelización</p>
    </div>
    <div style="padding:32px;color:#1e293b;font-size:15px;line-height:1.7;">
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Hace un tiempo que no te vemos por acá y lo extrañamos 🥐☕</p>
      <p>Pasate cuando quieras — tus puntos te están esperando y seguís sumando beneficios con cada visita.</p>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;color:#92400e;">¡Acordate de mostrar tu QR al llegar para sumar la visita! 📱</p>
      </div>
      <p>¡Esperamos verte pronto!</p>
    </div>
    <div style="background:#f1f5f9;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        <a href="https://coques.com.ar" style="color:#6366f1;">coques.com.ar</a>
      </p>
    </div>
  </div>
</body></html>`,
                    })

                    if (resultado.success) {
                        emailsReactivacion++
                        // Registrar para no volver a enviar en 30 días
                        await prisma.notificacion.create({
                            data: {
                                clienteId: cliente.id,
                                tipo: 'REACTIVACION_EMAIL',
                                titulo: 'Email de reactivación enviado',
                                cuerpo: 'Te extrañamos en Coques Bakery',
                                leida: true,
                                enviada: true,
                            } as any,
                        })
                    }
                    await new Promise(r => setTimeout(r, 100))
                }
            }
            console.log(`[Job] Emails de reactivación enviados: ${emailsReactivacion}`)
        } catch (reactivacionError) {
            console.error('[Job] Error en emails de reactivación:', reactivacionError)
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
            },
            pedidosSincronizados: pedidosCreados,
            emailsReactivacion,
        })

    } catch (error: any) {
        console.error('[Job Cumpleaños] Error:', error)
        return NextResponse.json(
            { error: 'Error al ejecutar job de cumpleaños', details: error.message },
            { status: 500 }
        )
    }
}
