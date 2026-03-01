import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth, unauthorized, serverError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/eventos/ultimo-scan - Obtener timestamp del último escaneo/visita del cliente
export async function GET(req: NextRequest) {
    try {
        const payload = await requireClienteAuth(req)
        if (!payload) return unauthorized()

        // Buscar el último evento de VISITA del cliente
        const ultimoEvento = await prisma.evento.findFirst({
            where: {
                clienteId: payload.clienteId,
                tipoEvento: 'VISITA',
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                createdAt: true,
                metodoValidacion: true,
            },
        })

        if (!ultimoEvento) {
            return NextResponse.json({
                data: {
                    ultimoScan: null
                }
            })
        }

        return NextResponse.json({
            data: {
                ultimoScan: ultimoEvento.createdAt.getTime(),
                metodo: ultimoEvento.metodoValidacion,
            },
        })
    } catch (error) {
        console.error('Error al obtener último scan:', error)
        return NextResponse.json(
            { error: 'Error al obtener último scan' },
            { status: 500 }
        )
    }
}
