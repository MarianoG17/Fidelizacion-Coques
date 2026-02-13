// src/app/api/admin/niveles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/niveles/[id] - Actualizar criterios de un nivel
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const { id } = params
        const body = await req.json()
        const { visitas, usosCruzados } = body

        // Validaciones
        if (
            typeof visitas !== 'number' ||
            typeof usosCruzados !== 'number' ||
            visitas < 0 ||
            usosCruzados < 0
        ) {
            return NextResponse.json(
                { error: 'Visitas y usos cruzados deben ser números >= 0' },
                { status: 400 }
            )
        }

        // Actualizar criterios del nivel
        const nivel = await prisma.nivel.update({
            where: { id },
            data: {
                criterios: {
                    visitas,
                    diasVentana: 30, // Fijo por ahora
                    usosCruzados,
                },
            },
        })

        return NextResponse.json({
            data: nivel,
            message: `Criterios de nivel ${nivel.nombre} actualizados exitosamente`,
        })
    } catch (error) {
        console.error('[PATCH /api/admin/niveles/[id]] Error:', error)
        return NextResponse.json(
            { error: 'Error al actualizar nivel' },
            { status: 500 }
        )
    }
}
