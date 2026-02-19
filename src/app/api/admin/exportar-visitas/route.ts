// src/app/api/admin/exportar-visitas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    // Construir filtros de fecha
    const whereClause: any = {
      tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
    }

    if (fechaDesde) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        gte: new Date(fechaDesde),
      }
    }

    if (fechaHasta) {
      // Agregar 1 día para incluir todo el día seleccionado
      const fechaHastaFinal = new Date(fechaHasta)
      fechaHastaFinal.setDate(fechaHastaFinal.getDate() + 1)
      whereClause.timestamp = {
        ...whereClause.timestamp,
        lt: fechaHastaFinal,
      }
    }

    // Obtener visitas con beneficios
    const visitas = await prisma.eventoScan.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            nombre: true,
            phone: true,
            email: true,
            nivel: {
              select: { nombre: true },
            },
          },
        },
        beneficio: {
          select: {
            nombre: true,
            descripcionCaja: true,
          },
        },
        local: {
          select: { nombre: true },
        },
        mesa: {
          select: { nombre: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    })

    // Formatear visitas para Excel
    const visitasFormateadas = visitas.map((v) => ({
      fecha: new Date(v.timestamp).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      cliente: v.cliente?.nombre || 'Desconocido',
      telefono: v.cliente?.phone || '',
      email: v.cliente?.email || '',
      nivel: v.cliente?.nivel?.nombre || 'Sin nivel',
      local: v.local?.nombre || 'Desconocido',
      mesa: v.mesa?.nombre || '-',
      beneficioCanjeado: v.beneficio?.nombre || '-',
      descripcionBeneficio: v.beneficio?.descripcionCaja || '-',
      contabilizada: v.contabilizada ? 'Sí' : 'No',
    }))

    // Calcular resumen de beneficios canjeados
    const beneficiosResumen: Record<string, number> = {}
    visitas.forEach((v) => {
      if (v.beneficio) {
        const titulo = v.beneficio.nombre
        beneficiosResumen[titulo] = (beneficiosResumen[titulo] || 0) + 1
      }
    })

    // Formatear resumen para Excel
    const resumenFormateado = Object.entries(beneficiosResumen).map(
      ([beneficio, cantidad]) => ({
        beneficio,
        cantidad,
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        visitas: visitasFormateadas,
        resumen: resumenFormateado,
        totales: {
          totalVisitas: visitas.length,
          visitasContabilizadas: visitas.filter((v) => v.contabilizada).length,
          beneficiosCanjeados: Object.values(beneficiosResumen).reduce(
            (a, b) => a + b,
            0
          ),
        },
      },
    })
  } catch (error) {
    console.error('[GET /api/admin/exportar-visitas] Error:', error)
    return NextResponse.json(
      { error: 'Error al exportar visitas' },
      { status: 500 }
    )
  }
}
