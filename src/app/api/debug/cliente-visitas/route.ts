// src/app/api/debug/cliente-visitas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/cliente-visitas
 * Debug endpoint para ver las visitas y pedidos de tortas de un cliente
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const clientePayload = await requireClienteAuth(req)
    if (!clientePayload) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const clienteId = clientePayload.clienteId

    // Obtener configuración
    const config = await prisma.configuracionApp.findFirst()
    const periodoDias = config?.nivelesPeriodoDias || 30
    const tortasMultiplicador = config?.tortasMultiplicador || 3

    // Calcular fecha límite
    const hacePeriodo = new Date()
    hacePeriodo.setDate(hacePeriodo.getDate() - periodoDias)

    // Contar visitas normales (días únicos)
    const visitasNormalesResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires'))::bigint as count
      FROM "EventoScan"
      WHERE "clienteId" = ${clienteId}
        AND "contabilizada" = true
        AND "timestamp" >= ${hacePeriodo}
        AND "tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
    `
    const visitasNormales = Number(visitasNormalesResult[0]?.count || 0)

    // Contar pedidos de tortas
    const pedidosTortasResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM "EventoScan"
      WHERE "clienteId" = ${clienteId}
        AND "timestamp" >= ${hacePeriodo}
        AND "tipoEvento" = 'PEDIDO_TORTA'
    `
    const pedidosTortas = Number(pedidosTortasResult[0]?.count || 0)

    // Obtener eventos PEDIDO_TORTA con detalles
    const eventosPedidosTortas = await prisma.eventoScan.findMany({
      where: {
        clienteId,
        tipoEvento: 'PEDIDO_TORTA',
        timestamp: {
          gte: hacePeriodo
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        id: true,
        timestamp: true,
        notas: true,
        contabilizada: true,
      }
    })

    // Calcular total
    const totalVisitas = visitasNormales + (pedidosTortas * tortasMultiplicador)

    // Obtener nivel actual del cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        nombre: true,
        email: true,
        nivelId: true,
        nivel: {
          select: {
            nombre: true,
            orden: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cliente: {
        id: cliente?.id,
        nombre: cliente?.nombre,
        email: cliente?.email,
        nivelActual: cliente?.nivel?.nombre || 'Sin nivel',
      },
      configuracion: {
        periodoDias,
        tortasMultiplicador,
        fechaLimite: hacePeriodo.toISOString(),
      },
      estadisticas: {
        visitasNormales,
        pedidosTortas,
        pedidosTortasEquivalentes: pedidosTortas * tortasMultiplicador,
        totalVisitas,
        formula: `${visitasNormales} visitas + (${pedidosTortas} pedidos × ${tortasMultiplicador}) = ${totalVisitas} total`
      },
      eventosPedidosTortas: eventosPedidosTortas.map(e => ({
        id: e.id,
        fecha: e.timestamp,
        notas: e.notas,
        contabilizada: e.contabilizada,
      }))
    })
  } catch (error) {
    console.error('[Debug Cliente Visitas] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener visitas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
