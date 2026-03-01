// src/app/api/notificaciones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// Función para generar notificaciones de feedback pendientes
async function generarNotificacionesFeedbackPendientes(clienteId: string) {
  try {
    // Obtener configuración de feedback
    const config = await prisma.configuracionApp.findFirst({
      select: {
        feedbackHabilitado: true,
        feedbackTiempoVisitaMinutos: true,
        feedbackFrecuenciaDias: true,
      },
    })

    if (!config || !config.feedbackHabilitado) {
      return // Feedback deshabilitado
    }

    // Buscar última visita del cliente
    const ultimaVisita = await prisma.eventoScan.findFirst({
      where: {
        clienteId,
        tipoEvento: 'VISITA',
      },
      orderBy: {
        timestamp: 'desc',
      },
      select: {
        id: true,
        timestamp: true,
      },
    })

    if (!ultimaVisita) {
      return // No hay visitas
    }

    const ahora = new Date()
    const tiempoTranscurrido = ahora.getTime() - ultimaVisita.timestamp.getTime()
    const tiempoRequerido = config.feedbackTiempoVisitaMinutos * 60 * 1000

    // Verificar si pasó el tiempo configurado
    if (tiempoTranscurrido < tiempoRequerido) {
      return // Aún no es hora de solicitar feedback
    }

    // Verificar si ya hay feedback para esta visita
    const yaRespondido = await prisma.feedback.findFirst({
      where: {
        clienteId,
        createdAt: {
          gte: ultimaVisita.timestamp,
        },
      },
    })

    if (yaRespondido) {
      return // Ya respondió feedback
    }

    // Verificar si ya existe notificación pendiente
    const yaNotificado = await prisma.notificacion.findFirst({
      where: {
        clienteId,
        tipo: 'FEEDBACK_PENDIENTE',
        leida: false,
        creadoEn: {
          gte: ultimaVisita.timestamp,
        },
      },
    })

    if (yaNotificado) {
      return // Ya tiene notificación pendiente
    }

    // Verificar frecuencia mínima entre feedbacks
    const ultimoFeedback = await prisma.feedback.findFirst({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
    })

    if (ultimoFeedback) {
      const diasDesdeUltimo =
        (ahora.getTime() - ultimoFeedback.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (diasDesdeUltimo < config.feedbackFrecuenciaDias) {
        return // Muy pronto para solicitar otro feedback
      }
    }

    // Crear notificación de feedback pendiente
    await prisma.notificacion.create({
      data: {
        clienteId,
        titulo: '¿Cómo estuvo tu experiencia?',
        cuerpo: 'Contanos qué te pareció tu visita a Coques. Tu opinión nos ayuda a mejorar 😊',
        icono: '📊',
        tipo: 'FEEDBACK_PENDIENTE',
        url: null, // Se manejará en el cliente
        leida: false,
        enviada: true,
        metadata: {
          visitaId: ultimaVisita.id,
          timestamp: ultimaVisita.timestamp.toISOString(),
        },
      },
    })

    console.log(`[Notificación] Feedback pendiente creada para cliente ${clienteId}`)
  } catch (error) {
    console.error('Error al generar notificaciones de feedback:', error)
    // No lanzar error para no bloquear la consulta de notificaciones
  }
}

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

    // Verificar y generar notificaciones de feedback pendientes
    await generarNotificacionesFeedbackPendientes(userId)

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
