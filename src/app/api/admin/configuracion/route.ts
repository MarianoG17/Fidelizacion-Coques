// src/app/api/admin/configuracion/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

// GET /api/admin/configuracion - Obtener configuración
export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  try {

    const config = await prisma.configuracionApp.findFirst()

    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      config: {
        nivelesPeriodoDias: config.nivelesPeriodoDias,
        tortasMultiplicador: config.tortasMultiplicador,
        nivelRegistroId: (config as any).nivelRegistroId ?? null,
        feedbackHabilitado: config.feedbackHabilitado,
        feedbackTiempoVisitaMinutos: config.feedbackTiempoVisitaMinutos,
        feedbackDiasPedidoTorta: config.feedbackDiasPedidoTorta,
        feedbackFrecuenciaDias: config.feedbackFrecuenciaDias,
        feedbackMinEstrellas: config.feedbackMinEstrellas,
        googleMapsUrl: config.googleMapsUrl,
        pushHabilitado: config.pushHabilitado,
        pushAutoListo: config.pushAutoListo,
        pushNuevoNivel: config.pushNuevoNivel,
        pushBeneficioDisponible: config.pushBeneficioDisponible,
        pushBeneficioVence: config.pushBeneficioVence,
        pushCumpleanos: config.pushCumpleanos,
      }
    })
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT /api/admin/configuracion - Actualizar configuración
export async function PUT(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  try {

    const body = await req.json()
    const {
      nivelesPeriodoDias,
      tortasMultiplicador,
      nivelRegistroId,
      feedbackHabilitado,
      feedbackTiempoVisitaMinutos,
      feedbackDiasPedidoTorta,
      feedbackFrecuenciaDias,
      feedbackMinEstrellas,
      googleMapsUrl,
      pushHabilitado,
      pushAutoListo,
      pushNuevoNivel,
      pushBeneficioDisponible,
      pushBeneficioVence,
      pushCumpleanos,
    } = body

    // Validaciones
    if (nivelesPeriodoDias && (nivelesPeriodoDias < 1 || nivelesPeriodoDias > 365)) {
      return NextResponse.json({ error: 'Período de días debe estar entre 1 y 365' }, { status: 400 })
    }

    if (tortasMultiplicador && (tortasMultiplicador < 1 || tortasMultiplicador > 10)) {
      return NextResponse.json({ error: 'Multiplicador de tortas debe estar entre 1 y 10' }, { status: 400 })
    }

    if (feedbackTiempoVisitaMinutos && (feedbackTiempoVisitaMinutos < 1 || feedbackTiempoVisitaMinutos > 60)) {
      return NextResponse.json({ error: 'Tiempo de visita debe estar entre 1 y 60 minutos' }, { status: 400 })
    }

    if (feedbackDiasPedidoTorta !== undefined && (feedbackDiasPedidoTorta < 0 || feedbackDiasPedidoTorta > 30)) {
      return NextResponse.json({ error: 'Días después de torta debe estar entre 0 y 30' }, { status: 400 })
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
        tortasMultiplicador,
        nivelRegistroId: nivelRegistroId || null,
        feedbackHabilitado,
        feedbackTiempoVisitaMinutos,
        feedbackDiasPedidoTorta,
        feedbackFrecuenciaDias,
        feedbackMinEstrellas,
        googleMapsUrl,
        pushHabilitado,
        pushAutoListo,
        pushNuevoNivel,
        pushBeneficioDisponible,
        pushBeneficioVence,
        pushCumpleanos,
      }
    })

    console.log(`[Admin] Configuración actualizada:`, {
      nivelesPeriodoDias: configActualizada.nivelesPeriodoDias,
      tortasMultiplicador: configActualizada.tortasMultiplicador,
      feedbackHabilitado: configActualizada.feedbackHabilitado,
    })

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente',
      config: {
        nivelesPeriodoDias: configActualizada.nivelesPeriodoDias,
        tortasMultiplicador: configActualizada.tortasMultiplicador,
        nivelRegistroId: (configActualizada as any).nivelRegistroId ?? null,
        feedbackHabilitado: configActualizada.feedbackHabilitado,
        feedbackTiempoVisitaMinutos: configActualizada.feedbackTiempoVisitaMinutos,
        feedbackDiasPedidoTorta: configActualizada.feedbackDiasPedidoTorta,
        feedbackFrecuenciaDias: configActualizada.feedbackFrecuenciaDias,
        feedbackMinEstrellas: configActualizada.feedbackMinEstrellas,
        googleMapsUrl: configActualizada.googleMapsUrl,
        pushHabilitado: configActualizada.pushHabilitado,
        pushAutoListo: configActualizada.pushAutoListo,
        pushNuevoNivel: configActualizada.pushNuevoNivel,
        pushBeneficioDisponible: configActualizada.pushBeneficioDisponible,
        pushBeneficioVence: configActualizada.pushBeneficioVence,
        pushCumpleanos: configActualizada.pushCumpleanos,
      }
    })
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
