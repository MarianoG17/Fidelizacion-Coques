import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarToken } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

async function resolveUserId(req: NextRequest): Promise<string | null> {
    // Intentar JWT custom primero
    const userId = await verificarToken(req)
    if (userId) return userId
    // Fallback a NextAuth session
    const session = await getServerSession(authOptions)
    return (session?.user as any)?.id ?? null
}

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
