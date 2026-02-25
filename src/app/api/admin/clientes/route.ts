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
        eventos: {
          where: {
            tipoEvento: 'VISITA',
            contabilizada: true,
          },
          select: {
            id: true,
            notas: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calcular visitas reales y bonus por separado
    const clientesConEstadisticas = clientes.map((cliente) => {
      const visitasBonus = cliente.eventos.filter(
        (e) => e.notas?.toLowerCase().includes('bonus')
      ).length
      
      const visitasReales = cliente.eventos.filter(
        (e) => !e.notas?.toLowerCase().includes('bonus')
      ).length

      // Remover eventos del objeto para no enviar data innecesaria
      const { eventos, ...clienteSinEventos } = cliente

      return {
        ...clienteSinEventos,
        visitasReales,
        visitasBonus,
      }
    })

    return NextResponse.json({ data: clientesConEstadisticas })
  } catch (error) {
    console.error('Error al obtener clientes:', error)
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    )
  }
}
