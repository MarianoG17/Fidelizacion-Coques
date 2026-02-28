// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = (session.user as any).id

  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const subscription = await req.json()

    // Guardar suscripción en el cliente
    await prisma.cliente.update({
      where: { id: userId },
      data: {
        pushSub: subscription
      }
    })

    console.log('✅ Suscripción push guardada para cliente:', userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al guardar suscripción push:', error)
    return NextResponse.json(
      { error: 'Error al guardar suscripción' },
      { status: 500 }
    )
  }
}

// Eliminar suscripción (cuando usuario desactiva notificaciones)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = (session.user as any).id

  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    await prisma.cliente.update({
      where: { id: userId },
      data: {
        pushSub: Prisma.JsonNull
      }
    })

    console.log('🗑️ Suscripción push eliminada para cliente:', userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar suscripción push:', error)
    return NextResponse.json(
      { error: 'Error al eliminar suscripción' },
      { status: 500 }
    )
  }
}
