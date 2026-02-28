// src/app/api/configuracion/feedback/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const CONFIG_ID = 'default-config-001'

// API pública para obtener configuración de feedback (sin auth)
export async function GET() {
  try {
    let config = await prisma.configuracionApp.findFirst({
      where: { id: CONFIG_ID },
      select: {
        feedbackHabilitado: true,
        feedbackTiempoVisitaMinutos: true,
        feedbackDiasPedidoTorta: true,
        feedbackFrecuenciaDias: true,
        feedbackMinEstrellas: true,
        googleMapsUrl: true,
      }
    })

    // Si no existe, devolver valores por defecto
    if (!config) {
      config = {
        feedbackHabilitado: true,
        feedbackTiempoVisitaMinutos: 10,
        feedbackDiasPedidoTorta: 1,
        feedbackFrecuenciaDias: 7,
        feedbackMinEstrellas: 4,
        googleMapsUrl: 'https://maps.app.goo.gl/n6q5HNELZuwDyT556'
      }
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    // En caso de error, devolver valores por defecto
    return NextResponse.json({
      config: {
        feedbackHabilitado: true,
        feedbackTiempoVisitaMinutos: 10,
        feedbackDiasPedidoTorta: 1,
        feedbackFrecuenciaDias: 7,
        feedbackMinEstrellas: 4,
        googleMapsUrl: 'https://maps.app.goo.gl/n6q5HNELZuwDyT556'
      }
    })
  }
}
