// src/app/api/webhook/deltawash/route.ts
/**
 * Webhook: Recibir notificaciones de DeltaWash cuando se registra/actualiza un auto
 *
 * Propósito:
 * - DeltaWash llama a este endpoint cuando hay cambios en estados de autos
 * - Sincroniza inmediatamente a la base de Fidelización
 * - Activa beneficios automáticamente
 *
 * Seguridad:
 * - Requiere DELTAWASH_WEBHOOK_SECRET para autenticar
 * - Solo acepta requests desde DeltaWash
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { triggerBeneficiosPorEstado } from '@/lib/beneficios'
import { normalizarPatente } from '@/lib/patente'
import { normalizarTelefono } from '@/lib/phone'
import { sendPushNotification } from '@/lib/push'
import { EstadoAutoEnum } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface WebhookPayload {
    phone: string          // Teléfono del cliente (E.164: +5491112345678)
    patente: string        // Patente del auto
    estado: string         // Estado: "en proceso", "listo", "entregado"
    marca?: string         // Opcional
    modelo?: string        // Opcional
    notas?: string         // Opcional
}

export async function POST(req: NextRequest) {
    try {
        // 1. Verificar autenticación
        const authHeader = req.headers.get('authorization')
        const webhookSecret = process.env.DELTAWASH_WEBHOOK_SECRET || 'dev-secret-change-in-production'

        if (authHeader !== `Bearer ${webhookSecret}`) {
            console.error('[Webhook DeltaWash] Autenticación fallida')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // 2. Parsear payload
        const payload: WebhookPayload = await req.json()

        console.log('[Webhook DeltaWash] Recibido:', {
            phone: payload.phone,
            patente: payload.patente,
            estado: payload.estado,
        })

        // 3. Validar payload
        if (!payload.phone || !payload.patente || !payload.estado) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos: phone, patente, estado' },
                { status: 400 }
            )
        }

        // 4. Normalizar datos
        const patenteNormalizada = normalizarPatente(payload.patente)
        if (!patenteNormalizada) {
            return NextResponse.json({ error: 'Patente inválida' }, { status: 400 })
        }

        // Normalizar teléfono (15XXXXXXXX → 11XXXXXXXX)
        const phoneNormalizado = normalizarTelefono(payload.phone)
        if (!phoneNormalizado) {
            return NextResponse.json({
                error: 'Teléfono inválido. Formato esperado: 1112345678 o 1512345678'
            }, { status: 400 })
        }

        // Normalizar estado: "en proceso" → "EN_PROCESO"
        const estadoNormalizado = payload.estado.toLowerCase() === 'en proceso'
            ? 'EN_PROCESO'
            : payload.estado.toLowerCase() === 'listo'
                ? 'LISTO'
                : 'ENTREGADO'

        // 5. Buscar cliente en Fidelización
        const cliente = await prisma.cliente.findUnique({
            where: { phone: phoneNormalizado },
            include: {
                nivel: true,
                autos: {
                    where: { patente: patenteNormalizada },
                },
            },
        })

        if (!cliente) {
            console.log(`[Webhook DeltaWash] Cliente ${phoneNormalizado} no existe en Fidelización aún`)

            // Guardar estado pendiente para cuando se registre
            const localLavadero = await prisma.local.findFirst({ where: { tipo: 'lavadero' } })

            await prisma.estadoAutoPendiente.create({
                data: {
                    phone: phoneNormalizado, // Guardamos normalizado
                    patente: patenteNormalizada,
                    estado: estadoNormalizado as any,
                    marca: payload.marca || null,
                    modelo: payload.modelo || null,
                    notas: payload.notas || null,
                    localOrigenId: localLavadero?.id || null,
                    procesado: false,
                },
            })

            console.log(`[Webhook DeltaWash] ✅ Estado pendiente guardado para ${phoneNormalizado}`)

            return NextResponse.json({
                success: true,
                message: 'Estado guardado. Se procesará cuando el cliente se registre en Coques',
                pendiente: true,
                accion: 'Invitar al cliente a descargar la app de Coques para ver su beneficio',
            })
        }

        // 6. Buscar o crear auto
        let auto = cliente.autos[0]

        if (!auto) {
            auto = await prisma.auto.create({
                data: {
                    clienteId: cliente.id,
                    patente: patenteNormalizada,
                    marca: payload.marca || null,
                    modelo: payload.modelo || null,
                    activo: true,
                },
            })
            console.log(`[Webhook DeltaWash] Auto ${patenteNormalizada} creado para ${cliente.nombre || cliente.phone}`)
        } else if (payload.marca || payload.modelo) {
            // Actualizar marca/modelo si vienen
            auto = await prisma.auto.update({
                where: { id: auto.id },
                data: {
                    marca: payload.marca || auto.marca,
                    modelo: payload.modelo || auto.modelo,
                },
            })
        }

        // 7. Verificar estado actual
        const estadoActual = await prisma.estadoAuto.findUnique({
            where: { autoId: auto.id },
        })

        const estadoCambio = !estadoActual || estadoActual.estado !== estadoNormalizado

        // 8. Crear o actualizar estado
        await prisma.estadoAuto.upsert({
            where: { autoId: auto.id },
            update: {
                estado: estadoNormalizado as EstadoAutoEnum,
                notas: payload.notas || undefined,
                updatedAt: new Date(),
            },
            create: {
                autoId: auto.id,
                estado: estadoNormalizado as EstadoAutoEnum,
                notas: payload.notas || null,
                localOrigenId: (await prisma.local.findFirst({ where: { tipo: 'lavadero' } }))?.id || '',
            },
        })

        console.log(`[Webhook DeltaWash] Estado actualizado: ${patenteNormalizada} → ${estadoNormalizado}`)

        // 9. Enviar push notification si cambió a LISTO
        if (estadoCambio && estadoNormalizado === 'LISTO' && cliente.pushSub) {
            // Verificar configuración
            const config = await prisma.configuracionApp.findFirst()
            if (config?.pushAutoListo && config.pushHabilitado) {
                try {
                    await sendPushNotification(cliente.pushSub, {
                        title: '🚗 ¡Tu auto está listo!',
                        body: `Tu ${auto.marca || 'auto'} ${patenteNormalizada} ya está terminado y listo para retirar.`,
                        icon: '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        data: {
                            url: '/pass',
                            type: 'auto_listo',
                            autoId: auto.id
                        }
                    })
                    console.log(`[Webhook DeltaWash] ✅ Push notification enviada: Auto listo`)
                } catch (error) {
                    console.error('[Webhook DeltaWash] Error enviando push:', error)
                }
            }
        }

        // 10. Si cambió a EN_PROCESO, disparar beneficios
        let beneficiosActivados: any[] = []
        if (estadoCambio && estadoNormalizado === 'EN_PROCESO') {
            beneficiosActivados = await triggerBeneficiosPorEstado(cliente.id, 'EN_PROCESO')

            if (beneficiosActivados.length > 0) {
                console.log(`[Webhook DeltaWash] ✅ Beneficio activado para ${cliente.nombre || cliente.phone}:`,
                    beneficiosActivados.map(b => b.nombre).join(', ')
                )

                // Enviar push notification de beneficio disponible
                if (cliente.pushSub) {
                    const config = await prisma.configuracionApp.findFirst()
                    if (config?.pushBeneficioDisponible && config.pushHabilitado) {
                        try {
                            const nombresBeneficios = beneficiosActivados.map(b => b.nombre).join(', ')
                            await sendPushNotification(cliente.pushSub, {
                                title: '🎁 ¡Nuevo beneficio disponible!',
                                body: `Tenés ${beneficiosActivados.length} beneficio${beneficiosActivados.length > 1 ? 's' : ''} disponible${beneficiosActivados.length > 1 ? 's' : ''}: ${nombresBeneficios}`,
                                icon: '/icon-192x192.png',
                                badge: '/icon-192x192.png',
                                data: {
                                    url: '/pass',
                                    type: 'beneficio_disponible'
                                }
                            })
                            console.log(`[Webhook DeltaWash] ✅ Push notification enviada: Beneficio disponible`)
                        } catch (error) {
                            console.error('[Webhook DeltaWash] Error enviando push:', error)
                        }
                    }
                }
            }
        }

        // 11. Registrar evento
        await prisma.eventoScan.create({
            data: {
                clienteId: cliente.id,
                localId: (await prisma.local.findFirst({ where: { tipo: 'lavadero' } }))?.id || '',
                tipoEvento: 'ESTADO_EXTERNO',
                metodoValidacion: 'QR',
                estadoExternoSnap: {
                    estado: estadoNormalizado,
                    patente: patenteNormalizada,
                    timestamp: new Date().toISOString(),
                },
                notas: `Auto ${patenteNormalizada}: ${estadoNormalizado} (webhook)`,
            },
        })

        // 12. Respuesta exitosa
        return NextResponse.json({
            success: true,
            mensaje: 'Estado sincronizado correctamente',
            cliente: {
                nombre: cliente.nombre,
                phone: cliente.phone,
                nivel: cliente.nivel?.nombre || 'Sin nivel',
            },
            auto: {
                patente: patenteNormalizada,
                estado: estadoNormalizado,
            },
            beneficiosActivados: beneficiosActivados.map(b => ({
                id: b.id,
                nombre: b.nombre,
                descripcion: b.descripcionCaja,
            })),
        })

    } catch (error: any) {
        console.error('[Webhook DeltaWash] Error:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Error procesando webhook',
                details: error.message,
            },
            { status: 500 }
        )
    }
}

// Endpoint GET para verificar que el webhook está activo
export async function GET() {
    return NextResponse.json({
        status: 'active',
        endpoint: '/api/webhook/deltawash',
        method: 'POST',
        auth: 'Bearer token required (DELTAWASH_WEBHOOK_SECRET)',
        payload: {
            phone: 'string (E.164)',
            patente: 'string',
            estado: 'string (en proceso|listo|entregado)',
            marca: 'string (opcional)',
            modelo: 'string (opcional)',
            notas: 'string (opcional)',
        },
    })
}
