// src/app/api/admin/clientes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  try {
    const clientes = await prisma.cliente.findMany({
      select: {
        id: true,
        nombre: true,
        phone: true,
        email: true,
        estado: true,
        nivelId: true,
        nivel: {
          select: {
            nombre: true,
            orden: true,
          },
        },
        referidosActivados: true,
        fechaCumpleanos: true,
        fuenteConocimiento: true,
        staffRegistro: true,
        authProvider: true,
        pushSub: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Batch: obtener visitas y pedidos app de TODOS los clientes en 2 queries paralelas
    const clienteIds = clientes.map(c => c.id)
    const [visitasResult, pedidosResult] = await Promise.all([
      prisma.$queryRaw<Array<{
        clienteId: string
        esBonus: boolean
        count: bigint
      }>>`
        SELECT
          "clienteId",
          ("metodoValidacion"::text LIKE 'BONUS_%') AS "esBonus",
          COUNT(DISTINCT DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires'))::bigint AS count
        FROM "EventoScan"
        WHERE "clienteId" = ANY(${clienteIds}::text[])
          AND "contabilizada" = true
          AND "tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
        GROUP BY "clienteId", ("metodoValidacion"::text LIKE 'BONUS_%')
      `,
      prisma.$queryRaw<Array<{ clienteId: string; count: bigint; totalMonto: string | null }>>`
        SELECT "clienteId", COUNT(*)::bigint AS count, SUM("monto")::text AS "totalMonto"
        FROM "EventoScan"
        WHERE "clienteId" = ANY(${clienteIds}::text[])
          AND "tipoEvento" = 'PEDIDO_TORTA'
        GROUP BY "clienteId"
      `,
    ])

    // Indexar por clienteId para O(1) lookup
    const visitasMap = new Map<string, { reales: number; bonus: number }>()
    for (const row of visitasResult) {
      if (!visitasMap.has(row.clienteId)) {
        visitasMap.set(row.clienteId, { reales: 0, bonus: 0 })
      }
      const entry = visitasMap.get(row.clienteId)!
      if (row.esBonus) {
        entry.bonus = Number(row.count)
      } else {
        entry.reales = Number(row.count)
      }
    }

    const pedidosMap = new Map<string, { count: number; totalMonto: number }>()
    for (const row of pedidosResult) {
      pedidosMap.set(row.clienteId, {
        count: Number(row.count),
        totalMonto: row.totalMonto ? parseFloat(row.totalMonto) : 0,
      })
    }

    const clientesConEstadisticas = clientes.map(cliente => ({
      ...cliente,
      tienePush: !!cliente.pushSub,
      pushSub: undefined,
      visitasReales: visitasMap.get(cliente.id)?.reales ?? 0,
      visitasBonus: visitasMap.get(cliente.id)?.bonus ?? 0,
      pedidosApp: pedidosMap.get(cliente.id)?.count ?? 0,
      pedidosMonto: pedidosMap.get(cliente.id)?.totalMonto ?? 0,
    }))

    return NextResponse.json({ data: clientesConEstadisticas })
  } catch (error) {
    console.error('Error al obtener clientes:', error)
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    )
  }
}
