// src/app/api/notificaciones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// GET /api/notificaciones - Obtener notificaciones del usuario logueado
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = (session.user as any).id

  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = req.nextUrl
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const soloNoLeidas = searchParams.get('no_leidas') === 'true'

    const where: any = { clienteId: userId }
    if (soloNoLeidas) {
      where.leida = false
    }

    // Obtener notificaciones
    const notificaciones = await prisma.notificacion.findMany({
      where,
      orderBy: {
        creadoEn: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Contar total y no leídas
    const [total, noLeidas] = await Promise.all([
      prisma.notificacion.count({ where: { clienteId: userId } }),
      prisma.notificacion.count({ where: { clienteId: userId, leida: false } })
    ])

    return NextResponse.json({
      success: true,
      notificaciones,
      total,
      noLeidas
    })
  } catch (error) {
    console.error('Error al obtener notificaciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    )
  }
}

// PATCH /api/notificaciones - Marcar notificaciones como leídas
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = (session.user as any).id

  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { notificacionIds, marcarTodasLeidas } = body

    if (marcarTodasLeidas) {
      // Marcar todas como leídas
      await prisma.notificacion.updateMany({
        where: {
          clienteId: userId,
          leida: false
        },
        data: {
          leida: true,
          leidaEn: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas'
      })
    }

    if (!notificacionIds || !Array.isArray(notificacionIds)) {
      return NextResponse.json(
        { error: 'Se requiere notificacionIds o marcarTodasLeidas' },
        { status: 400 }
      )
    }

    // Marcar notificaciones específicas como leídas
    await prisma.notificacion.updateMany({
      where: {
        id: { in: notificacionIds },
        clienteId: userId  // Asegurar que pertenecen al usuario
      },
      data: {
        leida: true,
        leidaEn: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: `${notificacionIds.length} notificaciones marcadas como leídas`
    })
  } catch (error) {
    console.error('Error al marcar notificaciones como leídas:', error)
    return NextResponse.json(
      { error: 'Error al actualizar notificaciones' },
      { status: 500 }
    )
  }
}
