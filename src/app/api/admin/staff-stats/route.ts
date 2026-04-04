// src/app/api/admin/staff-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/staff-stats?mes=YYYY-MM
 * Returns registration counts per staff member, per day, for the given month.
 * Defaults to current month if no mes param provided.
 */
export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    // Determinar mes a consultar (default: mes en curso)
    const mesParam = new URL(req.url).searchParams.get('mes') // "YYYY-MM"
    const ahora = new Date()
    const year = mesParam ? parseInt(mesParam.split('-')[0]) : ahora.getFullYear()
    const month = mesParam ? parseInt(mesParam.split('-')[1]) : ahora.getMonth() + 1

    const inicio = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
    const fin = new Date(Date.UTC(year, month, 1, 0, 0, 0)) // primer día del mes siguiente

    try {
        // Total por empleada en el mes seleccionado
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

        // Registros por día por empleada en el mes seleccionado
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
              AND "createdAt" >= ${inicio}
              AND "createdAt" < ${fin}
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

        return NextResponse.json({ data: { totales, porDia, mes: `${year}-${String(month).padStart(2, '0')}` } })
    } catch (error) {
        console.error('[GET /api/admin/staff-stats] Error:', error)
        return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
    }
}
