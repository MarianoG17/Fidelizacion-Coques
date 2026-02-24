// src/app/api/local/historial-escaneos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized, serverError } from '@/lib/auth'
import { getInicioHoyArgentina } from '@/lib/timezone'
import { getBeneficiosActivos } from '@/lib/beneficios'

export const dynamic = 'force-dynamic'

/**
 * GET /api/local/historial-escaneos
 * 
 * Obtiene los últimos N clientes escaneados en mostrador con sus beneficios disponibles.
 * Se sincroniza automáticamente entre navegador y PWA instalada.
 * 
 * Query params:
 * - limit: número de clientes a retornar (default: 3, max: 10)
 * 
 * Requiere: X-Local-Api-Key
 */
export async function GET(req: NextRequest) {
    try {
        const local = await requireLocalAuth(req)
        if (!local) return unauthorized('API Key de local inválida')

        const { searchParams } = req.nextUrl
        const limit = Math.min(Number(searchParams.get('limit') || '3'), 10)

        // Obtener inicio del día en timezone Argentina
        const inicioHoy = getInicioHoyArgentina()

        // Obtener últimos eventos únicos por cliente (solo visitas y beneficios aplicados hoy)
        // Usamos DISTINCT ON simulado con GROUP BY
        const eventosRecientes = await prisma.eventoScan.findMany({
            where: {
                localId: local.id,
                tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
                timestamp: { gte: inicioHoy },
                mesaId: null, // Solo clientes en mostrador (no en salón)
            },
            orderBy: { timestamp: 'desc' },
            include: {
                cliente: {
                    include: {
                        nivel: {
                            include: {
                                beneficios: {
                                    include: {
                                        beneficio: true,
                                    },
                                },
                            },
                        },
                    },
                },
                beneficio: true,
            },
            take: 50, // Tomar más para luego filtrar clientes únicos
        })

        // Agrupar por cliente y mantener solo el más reciente
        const clientesMap = new Map<string, any>()

        for (const evento of eventosRecientes) {
            if (!clientesMap.has(evento.clienteId)) {
                const cliente = evento.cliente

                // Obtener todos los beneficios aplicados hoy para este cliente
                const beneficiosAplicadosHoy = await prisma.eventoScan.findMany({
                    where: {
                        clienteId: evento.clienteId,
                        localId: local.id,
                        tipoEvento: 'BENEFICIO_APLICADO',
                        timestamp: { gte: inicioHoy },
                        beneficioId: { not: null },
                    },
                    include: {
                        beneficio: true,
                    },
                    orderBy: { timestamp: 'desc' },
                })

                // Usar la misma lógica que la app del cliente para obtener beneficios realmente disponibles
                // Esto valida: uso único, estados externos (lavadero), y condiciones del beneficio
                const beneficiosActivosCliente = await getBeneficiosActivos(evento.clienteId)

                const beneficiosDisponibles = beneficiosActivosCliente.map((b: any) => ({
                    id: b.id,
                    nombre: b.nombre,
                    descripcionCaja: b.descripcionCaja || b.descripcion,
                }))

                clientesMap.set(evento.clienteId, {
                    id: cliente.id,
                    nombre: cliente.nombre || cliente.phone,
                    phone: cliente.phone,
                    nivel: cliente.nivel?.nombre || 'Sin nivel',
                    beneficiosDisponibles,
                    beneficiosAplicados: beneficiosAplicadosHoy.map(e => ({
                        id: e.beneficio!.id,
                        nombre: e.beneficio!.nombre,
                        timestamp: e.timestamp,
                    })),
                    timestamp: evento.timestamp,
                })
            }
        }

        // Convertir a array, ordenar por timestamp desc y limitar
        const clientesMostrador = Array.from(clientesMap.values())
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit)

        return NextResponse.json({
            data: {
                clientes: clientesMostrador,
                total: clientesMostrador.length,
            },
        })
    } catch (error) {
        console.error('[GET /api/local/historial-escaneos]', error)
        return serverError()
    }
}
