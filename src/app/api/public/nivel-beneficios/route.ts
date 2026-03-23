// src/app/api/public/nivel-beneficios/route.ts
// Endpoint público — devuelve los beneficios de un nivel por nombre (sin auth)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const nombre = req.nextUrl.searchParams.get('nombre')
  if (!nombre) {
    return NextResponse.json({ error: 'Falta parámetro nombre' }, { status: 400 })
  }

  const nivel = await prisma.nivel.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' } },
    include: {
      beneficios: {
        include: {
          beneficio: { select: { nombre: true, activo: true } },
        },
      },
    },
  })

  if (!nivel) {
    return NextResponse.json({ beneficios: [] })
  }

  return NextResponse.json({
    nombre: nivel.nombre,
    beneficios: nivel.beneficios
      .filter((nb) => nb.beneficio.activo)
      .map((nb) => nb.beneficio.nombre),
  })
}
