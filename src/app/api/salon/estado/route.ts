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

        // Crear mapa de sesiones por mesa
        const sesionesMap = new Map(
            sesionesActivas.map((s) => [s.mesaId, s])
        )

        // Para cada sesión activa, obtener beneficios disponibles del cliente
        const beneficiosPorCliente = new Map<string, any[]>()

        for (const sesion of sesionesActivas) {
            const beneficios = await getBeneficiosActivos(sesion.clienteId)
            beneficiosPorCliente.set(sesion.clienteId, beneficios)
        }

        // Armar el estado del salón
        const estadoSalon = mesas.map((mesa) => {
            const sesion = sesionesMap.get(mesa.id)

            if (sesion) {
                // Mesa ocupada
                const beneficios = beneficiosPorCliente.get(sesion.clienteId) || []
                const duracionMinutos = Math.floor(
                    (new Date().getTime() - sesion.inicioSesion.getTime()) / 60000
                )

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
                    sesion: {
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
                    },
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
                    sesion: null,
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
