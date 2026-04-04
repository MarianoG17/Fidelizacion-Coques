// src/app/api/local/staff-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/local/staff-stats?mes=YYYY-MM
 * Returns total registrations per staff member for the given month.
 * Defaults to current month if no mes param provided.
 * Requires X-Local-Api-Key.
 */
export async function GET(req: NextRequest) {
    const local = await requireLocalAuth(req)
    if (!local) return unauthorized('API Key de local inválida')

    const mesParam = new URL(req.url).searchParams.get('mes')
    const ahora = new Date()
    const year = mesParam ? parseInt(mesParam.split('-')[0]) : ahora.getFullYear()
    const month = mesParam ? parseInt(mesParam.split('-')[1]) : ahora.getMonth() + 1

    const inicio = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
    const fin = new Date(Date.UTC(year, month, 1, 0, 0, 0))

    try {
        const totalesResult = await prisma.$queryRaw<Array<{
            staffRegistro: string
            total: bigint
        }>>`
            SELECT "staffRegistro", COUNT(*)::bigint AS total
            FROM "Cliente"
            WHERE "staffRegistro" IS NOT NULL
              AND "createdAt" >= ${inicio}
              AND "createdAt" < ${fin}
            GROUP BY "staffRegistro"
            ORDER BY total DESC
        `

        const totales = totalesResult.map(r => ({
            staff: r.staffRegistro,
            total: Number(r.total),
        }))

        const totalGeneral = totales.reduce((s, t) => s + t.total, 0)

        return NextResponse.json({ data: { totales, totalGeneral, mes: `${year}-${String(month).padStart(2, '0')}` } })
    } catch (error) {
        console.error('[GET /api/local/staff-stats] Error:', error)
        return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
    }
}
