// src/app/api/admin/niveles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

// POST /api/admin/niveles - Crear un nuevo nivel
export async function POST(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  try {
    const { nombre, descripcionBeneficios, visitas, usosCruzados, descuentoPedidosTortas, esOculto } = await req.json()

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Calcular el próximo orden automáticamente
    const maxOrden = await prisma.nivel.findFirst({ orderBy: { orden: 'desc' }, select: { orden: true } })
    const orden = (maxOrden?.orden ?? 0) + 1

    const nivel = await prisma.nivel.create({
      data: {
        nombre: nombre.trim(),
        descripcionBeneficios: descripcionBeneficios?.trim() || '',
        orden,
        criterios: { visitas: visitas || 0, diasVentana: 30, usosCruzados: usosCruzados || 0 },
        descuentoPedidosTortas: descuentoPedidosTortas || 0,
        esOculto: Boolean(esOculto),
      } as any,
    })

    return NextResponse.json({ data: nivel }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/niveles] Error:', error)
    return NextResponse.json({ error: 'Error al crear nivel' }, { status: 500 })
  }
}

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
