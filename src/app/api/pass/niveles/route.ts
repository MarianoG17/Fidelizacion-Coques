// src/app/api/pass/niveles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth } from '@/lib/auth'
import { evaluarNivel } from '@/lib/beneficios'

export const dynamic = 'force-dynamic'

// GET /api/pass/niveles - Obtener todos los niveles con beneficios y progreso del cliente
export async function GET(req: NextRequest) {
  try {
    const payload = await requireClienteAuth(req)
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Evaluar y actualizar nivel si es necesario
    await evaluarNivel(payload.clienteId)

    // Obtener cliente con su nivel actual (refrescado después de evaluar)
    const cliente = await prisma.cliente.findUnique({
      where: { id: payload.clienteId },
      include: {
        nivel: true,
      },
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Obtener todos los niveles con sus beneficios
    const niveles = await prisma.nivel.findMany({
      orderBy: { orden: 'asc' },
      include: {
        beneficios: {
          include: {
            beneficio: true,
          },
        },
      },
    })

    // Contar visitas del cliente
    const totalVisitas = await prisma.eventoScan.count({
      where: {
        clienteId: cliente.id,
        contabilizada: true,
      },
    })

    // Mapear niveles con información de progreso
    const nivelesData = niveles.map((nivel) => {
      const esNivelActual = cliente.nivel?.id === nivel.id
      const criterio = nivel.criterios as any
      const visitasRequeridas = criterio?.visitas || criterio?.visitasMinimas || 0
      
      return {
        id: nivel.id,
        nombre: nivel.nombre,
        orden: nivel.orden,
        descripcionBeneficios: nivel.descripcionBeneficios,
        visitasRequeridas,
        esNivelActual,
        beneficios: nivel.beneficios.map((nb) => ({
          id: nb.beneficio.id,
          nombre: nb.beneficio.nombre,
          descripcion: nb.beneficio.descripcionCaja,
          tipo: 'DESCUENTO', // Tipo fijo o puedes agregar este campo al schema
          descuento: null, // O extraer de condiciones si existe
        })),
      }
    })

    // Calcular próximo nivel
    const nivelActualOrden = cliente.nivel?.orden || 0
    const proximoNivel = nivelesData.find((n) => n.orden > nivelActualOrden)

    let progreso = null
    if (proximoNivel) {
      const visitasParaProximo = proximoNivel.visitasRequeridas - totalVisitas
      progreso = {
        proximoNivel: proximoNivel.nombre,
        visitasActuales: totalVisitas,
        visitasRequeridas: proximoNivel.visitasRequeridas,
        visitasFaltantes: Math.max(0, visitasParaProximo),
      }
    }

    return NextResponse.json({
      data: {
        niveles: nivelesData,
        nivelActual: cliente.nivel?.nombre || 'Sin nivel',
        totalVisitas,
        progreso,
      },
    })
  } catch (error) {
    console.error('[GET /api/pass/niveles] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener niveles' },
      { status: 500 }
    )
  }
}
