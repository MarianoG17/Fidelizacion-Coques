// src/app/api/debug/niveles/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const niveles = await prisma.nivel.findMany({
      orderBy: { orden: 'asc' },
      select: {
        id: true,
        nombre: true,
        orden: true,
        criterios: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: niveles,
    })
  } catch (error) {
    console.error('[Debug Niveles] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener niveles' },
      { status: 500 }
    )
  }
}
