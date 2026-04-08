// src/app/api/admin/clientes/[id]/aplicar-beneficio/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/clientes/[id]/aplicar-beneficio
 * Registra manualmente un BENEFICIO_APLICADO para el cliente.
 * Útil cuando el staff olvidó aplicarlo en el momento.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    const { id: clienteId } = params
    const { beneficioId, notas } = await req.json()

    if (!beneficioId) {
        return NextResponse.json({ error: 'beneficioId es requerido' }, { status: 400 })
    }

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } })
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    // Verificar que el beneficio existe
    const beneficio = await prisma.beneficio.findUnique({ where: { id: beneficioId }, select: { id: true, nombre: true } })
    if (!beneficio) return NextResponse.json({ error: 'Beneficio no encontrado' }, { status: 404 })

    // Obtener el primer local disponible
    const local = await prisma.local.findFirst({ select: { id: true } })
    if (!local) return NextResponse.json({ error: 'No hay locales configurados' }, { status: 500 })

    const evento = await prisma.eventoScan.create({
        data: {
            clienteId,
            localId: local.id,
            tipoEvento: 'BENEFICIO_APLICADO',
            beneficioId,
            metodoValidacion: 'OTP_MANUAL',
            contabilizada: true,
            notas: notas || `Aplicado manualmente desde admin — ${beneficio.nombre}`,
        },
    })

    return NextResponse.json({ success: true, data: { eventoId: evento.id } })
}
