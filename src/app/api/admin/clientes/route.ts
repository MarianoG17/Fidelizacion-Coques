// src/app/api/admin/clientes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const clientes = await prisma.cliente.findMany({
      include: {
        nivel: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calcular visitas únicas (por día) para cada cliente
    const clientesConEstadisticas = await Promise.all(
      clientes.map(async (cliente) => {
        // Contar días únicos de visitas reales (sin bonus)
        const visitasRealesResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires'))::bigint as count
          FROM "EventoScan"
          WHERE "clienteId" = ${cliente.id}
            AND "contabilizada" = true
            AND "tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
            AND (LOWER("notas") NOT LIKE '%bonus%' OR "notas" IS NULL)
        `
        
        // Contar días únicos de visitas bonus
        const visitasBonusResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires'))::bigint as count
          FROM "EventoScan"
          WHERE "clienteId" = ${cliente.id}
            AND "contabilizada" = true
            AND "tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
            AND LOWER("notas") LIKE '%bonus%'
        `

        const visitasReales = Number(visitasRealesResult[0]?.count || 0)
        const visitasBonus = Number(visitasBonusResult[0]?.count || 0)

        return {
          ...cliente,
          visitasReales,
          visitasBonus,
        }
      })
    )

    return NextResponse.json({ data: clientesConEstadisticas })
  } catch (error) {
    console.error('Error al obtener clientes:', error)
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    )
  }
}
