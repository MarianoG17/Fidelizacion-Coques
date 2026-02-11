// src/app/api/admin/clientes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const clientes = await prisma.cliente.findMany({
      include: {
        nivel: true,
        _count: {
          select: { eventos: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: clientes })
  } catch (error) {
    console.error('Error al obtener clientes:', error)
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    )
  }
}
