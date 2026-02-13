// src/app/api/admin/niveles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/niveles - Obtener todos los niveles con sus criterios
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const niveles = await prisma.nivel.findMany({
      orderBy: { orden: 'asc' },
      include: {
        _count: {
          select: { clientes: true }, // Contar cuántos clientes tienen este nivel
        },
      },
    })

    return NextResponse.json({ data: niveles })
  } catch (error) {
    console.error('[GET /api/admin/niveles] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener niveles' },
      { status: 500 }
    )
  }
}
