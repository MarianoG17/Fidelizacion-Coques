// src/app/api/admin/configuracion/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const CONFIG_ID = 'default-config-001'

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    let config = await prisma.configuracionApp.findFirst({
      where: { id: CONFIG_ID }
    })

    // Si no existe, crearla con valores por defecto
    if (!config) {
      config = await prisma.configuracionApp.create({
        data: { id: CONFIG_ID }
      })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()

    const config = await prisma.configuracionApp.upsert({
      where: { id: CONFIG_ID },
      update: body,
      create: {
        id: CONFIG_ID,
        ...body
      }
    })

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
