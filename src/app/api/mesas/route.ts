// src/app/api/mesas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized, badRequest, serverError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/mesas?localId=...
// Requiere X-Local-Api-Key — el local solo ve sus propias mesas
export async function GET(req: NextRequest) {
  try {
    const local = await requireLocalAuth(req)
    if (!local) return unauthorized()

    const mesas = await prisma.mesa.findMany({
      where: { localId: local.id, activa: true },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({
      data: {
        localId: local.id,
        nombre: local.nombre,
        layout: local.layoutMesas,
        mesas: mesas.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          posX: m.posX,
          posY: m.posY,
          ancho: m.ancho,
          alto: m.alto,
        })),
      },
    })
  } catch (error) {
    console.error('[GET /api/mesas]', error)
    return serverError()
  }
}
