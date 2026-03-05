// src/app/api/presupuestos/[codigo]/marcar-perdido/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarEmpleado } from '@/lib/authEmpleado'

/**
 * POST /api/presupuestos/[codigo]/marcar-perdido
 * Marca un presupuesto como PERDIDO con una razón
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { codigo: string } }
) {
    try {
        // Verificar autenticación de empleado
        const empleado = verificarEmpleado(req)
        if (!empleado) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const { codigo } = params
        const body = await req.json()
        const { motivoPerdido } = body

        if (!motivoPerdido || motivoPerdido.trim().length === 0) {
            return NextResponse.json(
                { error: 'Debe proporcionar una razón para marcar el presupuesto como perdido' },
                { status: 400 }
            )
        }

        // Buscar el presupuesto
        const presupuesto = await prisma.presupuesto.findUnique({
            where: { codigo }
        })

        if (!presupuesto) {
            return NextResponse.json(
                { error: 'Presupuesto no encontrado' },
                { status: 404 }
            )
        }

        // Verificar que no esté ya confirmado
        if (presupuesto.estado === 'CONFIRMADO') {
            return NextResponse.json(
                { error: 'No se puede marcar como perdido un presupuesto ya confirmado' },
                { status: 400 }
            )
        }

        // Actualizar el presupuesto
        const presupuestoActualizado = await prisma.presupuesto.update({
            where: { codigo },
            data: {
                estado: 'PERDIDO',
                motivoPerdido: motivoPerdido.trim()
            }
        })

        return NextResponse.json({
            message: 'Presupuesto marcado como perdido',
            presupuesto: presupuestoActualizado
        })
    } catch (error) {
        console.error('[POST /api/presupuestos/[codigo]/marcar-perdido] Error:', error)
        return NextResponse.json(
            { error: 'Error al marcar presupuesto como perdido' },
            { status: 500 }
        )
    }
}
