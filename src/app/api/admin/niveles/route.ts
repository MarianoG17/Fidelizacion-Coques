// src/app/api/admin/niveles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/niveles - Obtener todos los niveles con sus criterios
export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

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
