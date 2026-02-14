// src/app/api/historial/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarToken } from '@/lib/auth'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// GET /api/historial - Obtener historial completo de visitas del cliente
export async function GET(req: NextRequest) {
    const startTime = Date.now()

    try {
        console.log('[API /api/historial GET] Iniciando petición')

        const clienteId = await verificarToken(req)
        if (!clienteId) {
            console.log('[API /api/historial GET] Token inválido o no proporcionado')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        console.log(`[API /api/historial GET] Cliente autenticado: ${clienteId}`)

        // Obtener parámetros de query
        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')
        const localId = searchParams.get('localId') // filtro opcional

        console.log(`[API /api/historial GET] Parámetros: limit=${limit}, offset=${offset}, localId=${localId || 'todos'}`)

        // Construir filtro
        const where: any = { clienteId }
        if (localId) {
            where.localId = localId
        }

        // Obtener historial de eventos
        const [eventos, total] = await Promise.all([
            prisma.eventoScan.findMany({
                where,
                include: {
                    local: {
                        select: {
                            nombre: true,
                            tipo: true,
                        },
                    },
                    mesa: {
                        select: {
                            nombre: true,
                        },
                    },
                    beneficio: {
                        select: {
                            nombre: true,
                        },
                    },
                },
                orderBy: {
                    timestamp: 'desc',
                },
                take: limit,
                skip: offset,
            }),
            prisma.eventoScan.count({ where }),
        ])

        console.log(`[API /api/historial GET] Encontrados ${eventos.length} eventos de ${total} totales`)

        // Formatear respuesta
        const historial = eventos.map((e) => ({
            id: e.id,
            timestamp: e.timestamp.toISOString(),
            local: {
                nombre: e.local.nombre,
                tipo: e.local.tipo,
            },
            mesa: e.mesa ? { nombre: e.mesa.nombre } : null,
            beneficio: e.beneficio ? { nombre: e.beneficio.nombre } : null,
            tipoEvento: e.tipoEvento,
            contabilizada: e.contabilizada,
            notas: e.notas,
        }))

        const duration = Date.now() - startTime
        console.log(`[API /api/historial GET] Completado en ${duration}ms`)

        return NextResponse.json({
            data: {
                historial,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + eventos.length < total,
                },
            },
        })
    } catch (error) {
        const duration = Date.now() - startTime
        console.error(`[API /api/historial GET] Error después de ${duration}ms:`, error)
        console.error('[API /api/historial GET] Stack:', error instanceof Error ? error.stack : 'No stack available')

        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
