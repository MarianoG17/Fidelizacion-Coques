// src/app/api/eventos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized, badRequest, serverError } from '@/lib/auth'
import { evaluarNivel } from '@/lib/beneficios'
import { getInicioHoyArgentina, getInicioMananaArgentina } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

const crearEventoSchema = z.object({
  clienteId: z.string().uuid(),
  mesaId: z.string().uuid().optional().nullable(),
  tipoEvento: z.enum(['VISITA', 'BENEFICIO_APLICADO', 'ESTADO_EXTERNO']),
  beneficioId: z.string().uuid().optional().nullable(),
  metodoValidacion: z.enum(['QR', 'OTP_MANUAL']),
  notas: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const local = await requireLocalAuth(req)
    if (!local) return unauthorized('API Key de local inválida')

    const body = await req.json()
    const parsed = crearEventoSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0].message)

    const { clienteId, mesaId, tipoEvento, beneficioId, metodoValidacion, notas } = parsed.data

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId, estado: 'ACTIVO' },
      include: {
        autos: {
          where: { activo: true },
          include: { estadoActual: true },
        }
      },
    }) as any
    if (!cliente) return badRequest('Cliente no encontrado o inactivo')

    // Límite 1 visita por día en TZ Argentina
    const ahoraArg = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
    )
    const inicioHoy = new Date(ahoraArg)
    inicioHoy.setHours(0, 0, 0, 0)
    const inicioManana = new Date(inicioHoy)
    inicioManana.setDate(inicioManana.getDate() + 1)

    const visitaHoy = tipoEvento !== 'ESTADO_EXTERNO'
      ? await prisma.eventoScan.findFirst({
          where: {
            clienteId,
            localId: local.id,
            contabilizada: true,
            tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
            timestamp: { gte: inicioHoy, lt: inicioManana },
          },
        })
      : null

    const contabilizada = visitaHoy === null

    const evento = await prisma.eventoScan.create({
      data: {
        clienteId,
        localId: local.id,
        mesaId: mesaId || undefined,
        tipoEvento,
        beneficioId: beneficioId || undefined,
        metodoValidacion,
        notas: notas || undefined,
        contabilizada,
        ...(cliente.autos && cliente.autos.length > 0 && cliente.autos[0].estadoActual
          ? {
              estadoExternoSnap: {
                estado: cliente.autos[0].estadoActual.estado,
                updatedAt: cliente.autos[0].estadoActual.updatedAt.toISOString(),
                patente: cliente.autos[0].patente,
              },
            }
          : {}),
      },
    })

    if (contabilizada && tipoEvento !== 'ESTADO_EXTERNO') {
      evaluarNivel(clienteId).catch(console.error)
    }

    return NextResponse.json({
      data: evento,
      contabilizada,
      mensaje: contabilizada ? null : 'Ya registraste una visita hoy — esta no suma al contador',
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/eventos]', error)
    return serverError()
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const clienteId = searchParams.get('clienteId')
    const localId = searchParams.get('localId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Number(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (clienteId) where.clienteId = clienteId
    if (localId) where.localId = localId
    if (from || to) {
      where.timestamp = {}
      if (from) (where.timestamp as Record<string, unknown>).gte = new Date(from)
      if (to) (where.timestamp as Record<string, unknown>).lte = new Date(to)
    }

    const eventos = await prisma.eventoScan.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 200),
      include: {
        cliente: { select: { nombre: true, phone: true } },
        local: { select: { nombre: true } },
        mesa: { select: { nombre: true } },
        beneficio: { select: { nombre: true } },
      },
    })

    return NextResponse.json({ data: eventos })
  } catch (error) {
    console.error('[GET /api/eventos]', error)
    return serverError()
  }
}
