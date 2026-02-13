// src/app/api/sesiones/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized, badRequest, serverError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// DELETE /api/sesiones/[id] - Cerrar sesión de mesa
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const local = await requireLocalAuth(req)
    if (!local) return unauthorized('API Key de local inválida')

    const { id } = params

    // Verificar que la sesión existe y pertenece al local
    const sesion = await prisma.sesionMesa.findFirst({
      where: {
        id,
        localId: local.id,
      },
      include: {
        cliente: { select: { nombre: true, phone: true } },
        mesa: { select: { nombre: true } },
      },
    })

    if (!sesion) {
      return badRequest('Sesión no encontrada o no pertenece a este local')
    }

    if (!sesion.activa) {
      return badRequest('Esta sesión ya fue cerrada')
    }

    // Calcular duración
    const duracion = Math.floor(
      (new Date().getTime() - sesion.inicioSesion.getTime()) / 60000
    )

    // Cerrar sesión
    const sesionCerrada = await prisma.sesionMesa.update({
      where: { id },
      data: {
        activa: false,
        finSesion: new Date(),
        cerradaPor: 'STAFF',
        duracionMinutos: duracion,
      },
      include: {
        cliente: { select: { nombre: true, phone: true } },
        mesa: { select: { nombre: true } },
      },
    })

    return NextResponse.json({
      data: sesionCerrada,
      mensaje: `Sesión cerrada: ${sesionCerrada.cliente.nombre || 'Cliente'} en Mesa ${sesionCerrada.mesa.nombre} (${duracion} minutos)`,
    })
  } catch (error) {
    console.error('[DELETE /api/sesiones/[id]]', error)
    return serverError()
  }
}
