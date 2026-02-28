// src/app/api/pedidos/pendientes-feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = (session.user as any).id
  
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Obtener configuración para saber cuántos días después de entrega
    let config = await prisma.configuracionApp.findFirst({
      where: { id: 'default-config-001' },
      select: { feedbackDiasPedidoTorta: true }
    })

    const diasDespues = config?.feedbackDiasPedidoTorta || 1

    const ahora = new Date()
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - diasDespues)

    // Buscar pedidos confirmados que:
    // 1. Fueron entregados hace X días (según config)
    // 2. NO tienen feedback asociado todavía
    // 3. Son del cliente actual
    const pedidos = await prisma.presupuesto.findMany({
      where: {
        clienteId: userId,
        estado: 'CONFIRMADO',
        fechaEntrega: {
          lte: fechaLimite,
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Máximo 7 días atrás
        }
      },
      select: {
        id: true,
        codigo: true,
        fechaEntrega: true,
        precioTotal: true
      },
      orderBy: {
        fechaEntrega: 'asc'
      },
      take: 1 // Solo el más antiguo pendiente
    })

    return NextResponse.json({ pedidos })
  } catch (error) {
    console.error('Error al buscar pedidos pendientes de feedback:', error)
    return NextResponse.json(
      { error: 'Error al buscar pedidos' },
      { status: 500 }
    )
  }
}
