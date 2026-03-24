// src/app/api/local/staff-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/local/staff-stats
 * Returns total registrations per staff member (all time) for the /local leaderboard.
 * Requires X-Local-Api-Key.
 */
export async function GET(req: NextRequest) {
    const local = await requireLocalAuth(req)
    if (!local) return unauthorized('API Key de local inválida')

    try {
        const totalesResult = await prisma.$queryRaw<Array<{
            staffRegistro: string
            total: bigint
        }>>`
            SELECT "staffRegistro", COUNT(*)::bigint AS total
            FROM "Cliente"
            WHERE "staffRegistro" IS NOT NULL
            GROUP BY "staffRegistro"
            ORDER BY total DESC
        `

        const totales = totalesResult.map(r => ({
            staff: r.staffRegistro,
            total: Number(r.total),
        }))

        const totalGeneral = totales.reduce((s, t) => s + t.total, 0)

        return NextResponse.json({ data: { totales, totalGeneral } })
    } catch (error) {
        console.error('[GET /api/local/staff-stats] Error:', error)
        return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
    }
}
