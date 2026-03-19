import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/feedback - Obtener todos los feedbacks (admin)
export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try {

        const feedbacks = await prisma.feedback.findMany({
            include: {
                cliente: {
                    select: {
                        nombre: true,
                        phone: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 200, // Últimos 200 feedbacks
        })

        // Obtener nombres de locales
        const locales = await prisma.local.findMany({
            select: {
                id: true,
                nombre: true,
            },
        })
        const localesMap = new Map(locales.map(l => [l.id, l.nombre]))

        return NextResponse.json({
            data: {
                feedbacks: feedbacks.map((f) => ({
                    id: f.id,
                    calificacion: f.calificacion,
                    comentario: f.comentario,
                    enviadoGoogleMaps: f.enviadoGoogleMaps,
                    createdAt: f.createdAt.toISOString(),
                    cliente: {
                        nombre: f.cliente.nombre,
                        phone: f.cliente.phone,
                    },
                    local: {
                        nombre: localesMap.get(f.localId) || 'Desconocido',
                    },
                })),
            },
        })
    } catch (error) {
        console.error('Error al obtener feedbacks:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
