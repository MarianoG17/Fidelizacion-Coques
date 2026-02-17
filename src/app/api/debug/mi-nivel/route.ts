// src/app/api/debug/mi-nivel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth } from '@/lib/auth'
import { getHaceNDias } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

// GET /api/debug/mi-nivel - Debug info sobre nivel del cliente
export async function GET(req: NextRequest) {
  try {
    const payload = await requireClienteAuth(req)
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: payload.clienteId },
      include: { nivel: true },
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Contar visitas contabilizadas en los últimos 30 días
    const hace30dias = getHaceNDias(30)
    const visitasRecientes = await prisma.eventoScan.count({
      where: {
        clienteId: cliente.id,
        contabilizada: true,
        timestamp: { gte: hace30dias },
        tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
      },
    })

    // Contar visitas contabilizadas totales
    const visitasTotales = await prisma.eventoScan.count({
      where: {
        clienteId: cliente.id,
        contabilizada: true,
      },
    })

    // Contar locales distintos en últimos 30 días
    const localesDistintos = await prisma.eventoScan.findMany({
      where: {
        clienteId: cliente.id,
        timestamp: { gte: hace30dias },
      },
      select: { localId: true },
      distinct: ['localId'],
    })
    const usosCruzados = localesDistintos.length > 1 ? localesDistintos.length - 1 : 0

    // Obtener todos los niveles
    const niveles = await prisma.nivel.findMany({
      orderBy: { orden: 'desc' },
    })

    // Verificar qué nivel debería tener
    const nivelDeberia = niveles.find((nivel) => {
      const criterios = nivel.criterios as {
        visitas?: number
        visitasMinimas?: number
        diasVentana?: number
        usosCruzados?: number
      }
      const visitasRequeridas = criterios.visitas || criterios.visitasMinimas || 0
      const usosCruzadosRequeridos = criterios.usosCruzados || 0

      return visitasRecientes >= visitasRequeridas && usosCruzados >= usosCruzadosRequeridos
    })

    return NextResponse.json({
      debug: {
        nivelActual: cliente.nivel?.nombre || 'Sin nivel',
        nivelActualOrden: cliente.nivel?.orden || 0,
        nivelDeberia: nivelDeberia?.nombre || 'Sin nivel',
        nivelDeberiaOrden: nivelDeberia?.orden || 0,
        visitasRecientes30dias: visitasRecientes,
        visitasTotales: visitasTotales,
        usosCruzados: usosCruzados,
        localesDistintosVisitados: localesDistintos.length,
        localesIds: localesDistintos.map(l => l.localId),
        criteriosPorNivel: niveles.map((n) => ({
          nombre: n.nombre,
          orden: n.orden,
          criterios: n.criterios,
        })),
      },
    })
  } catch (error) {
    console.error('[GET /api/debug/mi-nivel] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener debug info' },
      { status: 500 }
    )
  }
}
