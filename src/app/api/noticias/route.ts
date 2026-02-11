// src/app/api/noticias/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth, unauthorized, serverError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/noticias — noticias del cliente autenticado
export async function GET(req: NextRequest) {
  try {
    const payload = await requireClienteAuth(req)
    if (!payload) return unauthorized()

    const soloNoLeidas = req.nextUrl.searchParams.get('noLeidas') === 'true'

    const noticias = await prisma.noticia.findMany({
      where: {
        clienteId: payload.clienteId,
        ...(soloNoLeidas ? { leida: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    const totalNoLeidas = await prisma.noticia.count({
      where: { clienteId: payload.clienteId, leida: false },
    })

    return NextResponse.json({ data: noticias, totalNoLeidas })
  } catch (error) {
    console.error('[GET /api/noticias]', error)
    return serverError()
  }
}

// PATCH /api/noticias — marcar como leída/s
export async function PATCH(req: NextRequest) {
  try {
    const payload = await requireClienteAuth(req)
    if (!payload) return unauthorized()

    const body = await req.json()
    const { noticiaId, todas } = body

    if (todas) {
      // Marcar todas como leídas
      await prisma.noticia.updateMany({
        where: { clienteId: payload.clienteId, leida: false },
        data: { leida: true },
      })
    } else if (noticiaId) {
      // Marcar una específica
      await prisma.noticia.updateMany({
        where: { id: noticiaId, clienteId: payload.clienteId },
        data: { leida: true },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PATCH /api/noticias]', error)
    return serverError()
  }
}
