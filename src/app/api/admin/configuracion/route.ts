// src/app/api/admin/configuracion/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/configuracion - Obtener configuración
export async function GET(req: NextRequest) {
  try {
    // Verificar admin key
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const config = await prisma.configuracionApp.findFirst()

    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      config: {
        nivelesPeriodoDias: config.nivelesPeriodoDias,
        feedbackHabilitado: config.feedbackHabilitado,
        feedbackTiempoVisitaMinutos: config.feedbackTiempoVisitaMinutos,
        feedbackFrecuenciaDias: config.feedbackFrecuenciaDias,
        feedbackMinEstrellas: config.feedbackMinEstrellas,
        googleMapsUrl: config.googleMapsUrl,
      }
    })
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT /api/admin/configuracion - Actualizar configuración
export async function PUT(req: NextRequest) {
  try {
    // Verificar admin key
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      nivelesPeriodoDias,
      feedbackHabilitado,
      feedbackTiempoVisitaMinutos,
      feedbackFrecuenciaDias,
      feedbackMinEstrellas,
      googleMapsUrl,
    } = body

    // Validaciones
    if (nivelesPeriodoDias && (nivelesPeriodoDias < 1 || nivelesPeriodoDias > 365)) {
      return NextResponse.json({ error: 'Período de días debe estar entre 1 y 365' }, { status: 400 })
    }

    if (feedbackTiempoVisitaMinutos && (feedbackTiempoVisitaMinutos < 1 || feedbackTiempoVisitaMinutos > 60)) {
      return NextResponse.json({ error: 'Tiempo de visita debe estar entre 1 y 60 minutos' }, { status: 400 })
    }

    if (feedbackFrecuenciaDias && (feedbackFrecuenciaDias < 1 || feedbackFrecuenciaDias > 90)) {
      return NextResponse.json({ error: 'Frecuencia debe estar entre 1 y 90 días' }, { status: 400 })
    }

    if (feedbackMinEstrellas && (feedbackMinEstrellas < 1 || feedbackMinEstrellas > 5)) {
      return NextResponse.json({ error: 'Estrellas mínimas debe estar entre 1 y 5' }, { status: 400 })
    }

    // Obtener config actual
    const configActual = await prisma.configuracionApp.findFirst()

    if (!configActual) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 })
    }

    // Actualizar config
    const configActualizada = await prisma.configuracionApp.update({
      where: { id: configActual.id },
      data: {
        nivelesPeriodoDias,
        feedbackHabilitado,
        feedbackTiempoVisitaMinutos,
        feedbackFrecuenciaDias,
        feedbackMinEstrellas,
        googleMapsUrl,
      }
    })

    console.log(`[Admin] Configuración actualizada:`, {
      nivelesPeriodoDias: configActualizada.nivelesPeriodoDias,
      feedbackHabilitado: configActualizada.feedbackHabilitado,
    })

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente',
      config: {
        nivelesPeriodoDias: configActualizada.nivelesPeriodoDias,
        feedbackHabilitado: configActualizada.feedbackHabilitado,
        feedbackTiempoVisitaMinutos: configActualizada.feedbackTiempoVisitaMinutos,
        feedbackFrecuenciaDias: configActualizada.feedbackFrecuenciaDias,
        feedbackMinEstrellas: configActualizada.feedbackMinEstrellas,
        googleMapsUrl: configActualizada.googleMapsUrl,
      }
    })
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
