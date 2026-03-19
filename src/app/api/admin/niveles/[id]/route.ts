// src/app/api/admin/niveles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/niveles/[id] - Actualizar criterios de un nivel
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try {
        const { id } = params
        const body = await req.json()
        const { visitas, usosCruzados, descuentoPedidosTortas } = body

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

        if (descuentoPedidosTortas !== undefined && (typeof descuentoPedidosTortas !== 'number' || descuentoPedidosTortas < 0 || descuentoPedidosTortas > 100)) {
            return NextResponse.json(
                { error: 'descuentoPedidosTortas debe ser un número entre 0 y 100' },
                { status: 400 }
            )
        }

        // Actualizar criterios del nivel
        const updateData: any = {
            criterios: {
                visitas,
                diasVentana: 30, // Fijo por ahora
                usosCruzados,
            },
        }

        if (descuentoPedidosTortas !== undefined) {
            updateData.descuentoPedidosTortas = descuentoPedidosTortas
        }

        const nivel = await prisma.nivel.update({
            where: { id },
            data: updateData,
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
