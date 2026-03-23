// src/app/api/admin/cumpleanos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
