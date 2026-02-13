// src/app/api/salon/estado/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized, serverError } from '@/lib/auth'
import { getBeneficiosActivos } from '@/lib/beneficios'

export const dynamic = 'force-dynamic'

// GET /api/salon/estado - Obtener estado completo del salón con mesas y sesiones activas
export async function GET(req: NextRequest) {
    try {
        const local = await requireLocalAuth(req)
        if (!local) return unauthorized('API Key de local inválida')

        // Obtener todas las mesas del local
        const mesas = await prisma.mesa.findMany({
            where: {
                localId: local.id,
                activa: true,
            },
            orderBy: { nombre: 'asc' },
        })

        // Obtener sesiones activas
        const sesionesActivas = await prisma.sesionMesa.findMany({
            where: {
                localId: local.id,
                activa: true,
            },
            include: {
                cliente: {
                    select: {
                        id: true,
                        nombre: true,
                        phone: true,
                        nivel: { select: { nombre: true, orden: true } },
                    },
                },
                mesa: { select: { id: true, nombre: true } },
            },
        })

        // Agrupar sesiones por mesa (puede haber múltiples clientes en una mesa)
        const sesionesPorMesa = new Map<string, typeof sesionesActivas>()
        for (const sesion of sesionesActivas) {
            const mesaSesiones = sesionesPorMesa.get(sesion.mesaId) || []
            mesaSesiones.push(sesion)
            sesionesPorMesa.set(sesion.mesaId, mesaSesiones)
        }

        // Para cada sesión activa, obtener beneficios disponibles del cliente
        const beneficiosPorCliente = new Map<string, any[]>()

        for (const sesion of sesionesActivas) {
            const beneficios = await getBeneficiosActivos(sesion.clienteId)
            beneficiosPorCliente.set(sesion.clienteId, beneficios)
        }

        // Armar el estado del salón
        const estadoSalon = mesas.map((mesa) => {
            const sesiones = sesionesPorMesa.get(mesa.id) || []

            if (sesiones.length > 0) {
                // Mesa ocupada - puede tener múltiples clientes
                const sesionesConBeneficios = sesiones.map((sesion: typeof sesionesActivas[0]) => {
                    const beneficios = beneficiosPorCliente.get(sesion.clienteId) || []
                    const duracionMinutos = Math.floor(
                        (new Date().getTime() - sesion.inicioSesion.getTime()) / 60000
                    )

                    return {
                        id: sesion.id,
                        cliente: {
                            id: sesion.cliente.id,
                            nombre: sesion.cliente.nombre || 'Cliente',
                            phone: sesion.cliente.phone,
                            nivel: sesion.cliente.nivel?.nombre || 'Bronce',
                            ordenNivel: sesion.cliente.nivel?.orden || 1,
                        },
                        inicioSesion: sesion.inicioSesion.toISOString(),
                        duracionMinutos,
                        beneficiosDisponibles: beneficios.map((b: any) => ({
                            id: b.id,
                            nombre: b.nombre,
                            descripcionCaja: b.descripcionCaja,
                            condiciones: b.condiciones,
                        })),
                    }
                })

                return {
                    mesa: {
                        id: mesa.id,
                        nombre: mesa.nombre,
                        posX: mesa.posX,
                        posY: mesa.posY,
                        ancho: mesa.ancho,
                        alto: mesa.alto,
                    },
                    ocupada: true,
                    sesiones: sesionesConBeneficios,
                }
            } else {
                // Mesa libre
                return {
                    mesa: {
                        id: mesa.id,
                        nombre: mesa.nombre,
                        posX: mesa.posX,
                        posY: mesa.posY,
                        ancho: mesa.ancho,
                        alto: mesa.alto,
                    },
                    ocupada: false,
                    sesiones: [],
                }
            }
        })

        return NextResponse.json({
            data: {
                local: {
                    id: local.id,
                    nombre: local.nombre,
                },
                totalMesas: mesas.length,
                mesasOcupadas: sesionesActivas.length,
                mesasLibres: mesas.length - sesionesActivas.length,
                mesas: estadoSalon,
            },
        })
    } catch (error) {
        console.error('[GET /api/salon/estado]', error)
        return serverError()
    }
}
