// src/app/api/admin/staff-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/staff-stats
 * Returns registration counts per staff member, per day, for the last 30 days.
 * Also returns total per staff for all time.
 */
export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try {
        // Total por empleada (todo el tiempo)
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

        // Registros por día por empleada (últimos 30 días)
        const porDiaResult = await prisma.$queryRaw<Array<{
            dia: string
            staffRegistro: string
            cantidad: bigint
        }>>`
            SELECT
                TO_CHAR("createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') AS dia,
                "staffRegistro",
                COUNT(*)::bigint AS cantidad
            FROM "Cliente"
            WHERE "staffRegistro" IS NOT NULL
              AND "createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY dia, "staffRegistro"
            ORDER BY dia DESC, "staffRegistro"
        `

        const totales = totalesResult.map(r => ({
            staff: r.staffRegistro,
            total: Number(r.total),
        }))

        const porDia = porDiaResult.map(r => ({
            dia: r.dia,
            staff: r.staffRegistro,
            cantidad: Number(r.cantidad),
        }))

        return NextResponse.json({ data: { totales, porDia } })
    } catch (error) {
        console.error('[GET /api/admin/staff-stats] Error:', error)
        return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
    }
}
