// src/app/api/admin/cumpleanos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    const clientes = await prisma.cliente.findMany({
        where: {
            fechaCumpleanos: { not: null },
        },
        select: {
            id: true,
            nombre: true,
            fechaCumpleanos: true,
        },
        orderBy: { nombre: 'asc' },
    })

    const data = clientes.map((c) => {
        const fecha = c.fechaCumpleanos!
        return {
            id: c.id,
            nombre: c.nombre || 'Sin nombre',
            mes: fecha.getUTCMonth() + 1, // 1-12
            dia: fecha.getUTCDate(),
        }
    })

    return NextResponse.json({ data })
}
