// src/app/api/admin/eventos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  try {
    const eventos = await prisma.eventoEspecial.findMany({
      include: {
        nivelMinimo: true,
        inscripciones: {
          include: {
            cliente: { select: { nombre: true, phone: true } },
          },
        },
      },
      orderBy: { fechaEvento: 'asc' },
    })

    return NextResponse.json({ data: eventos })
  } catch (error) {
    console.error('Error al obtener eventos:', error)
    return NextResponse.json(
      { error: 'Error al obtener eventos' },
      { status: 500 }
    )
  }
}
