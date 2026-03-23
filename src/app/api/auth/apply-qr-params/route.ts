import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveUserId } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const userId = await resolveUserId(req)
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { fuente, nivel } = await req.json()
    if (!fuente && !nivel) return NextResponse.json({ ok: true })

    const updateData: any = {}
    if (fuente) updateData.fuenteConocimiento = fuente

    if (nivel) {
        const nivelRecord = await prisma.nivel.findFirst({
            where: { nombre: { equals: nivel, mode: 'insensitive' } }
        })
        if (nivelRecord) updateData.nivelId = nivelRecord.id
    }

    await prisma.cliente.update({
        where: { id: userId },
        data: updateData
    })

    return NextResponse.json({ ok: true })
}
