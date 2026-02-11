// src/app/api/eventos-especiales/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth, serverError, badRequest } from '@/lib/auth'

const crearEventoSchema = z.object({
  titulo: z.string().min(3).max(100),
  descripcion: z.string().min(10),
  fechaEvento: z.string().datetime(),
  lugarDetalle: z.string().optional(),
  nivelMinimoId: z.string().uuid(),
  cupoMaximo: z.number().int().min(1).max(500),
  imagenUrl: z.string().url().optional(),
})

// GET /api/eventos-especiales
// Público para clientes activos — filtra por su nivel
export async function GET(req: NextRequest) {
  try {
    const payload = await requireClienteAuth(req)

    let nivelOrden = 0
    if (payload) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: payload.clienteId },
        include: { nivel: true },
      })
      nivelOrden = cliente?.nivel?.orden || 0
    }

    const eventos = await prisma.eventoEspecial.findMany({
      where: {
        estado: 'PUBLICADO',
        fechaEvento: { gte: new Date() },
        nivelMinimo: { orden: { lte: nivelOrden } },
      },
      include: {
        nivelMinimo: { select: { nombre: true, orden: true } },
        _count: { select: { inscripciones: { where: { estado: 'CONFIRMADA' } } } },
      },
      orderBy: { fechaEvento: 'asc' },
    })

    // Si hay cliente autenticado, marcar cuáles ya está inscripto
    let inscripcionesCliente: string[] = []
    if (payload) {
      const inscripciones = await prisma.inscripcion.findMany({
        where: {
          clienteId: payload.clienteId,
          estado: 'CONFIRMADA',
          eventoId: { in: eventos.map((e) => e.id) },
        },
        select: { eventoId: true },
      })
      inscripcionesCliente = inscripciones.map((i) => i.eventoId)
    }

    return NextResponse.json({
      data: eventos.map((e) => ({
        id: e.id,
        titulo: e.titulo,
        descripcion: e.descripcion,
        fechaEvento: e.fechaEvento,
        lugarDetalle: e.lugarDetalle,
        nivelMinimo: e.nivelMinimo.nombre,
        cupoMaximo: e.cupoMaximo,
        inscriptosCount: e.inscriptosCount,
        cupoDisponible: e.cupoMaximo - e.inscriptosCount,
        yaInscripto: inscripcionesCliente.includes(e.id),
      })),
    })
  } catch (error) {
    console.error('[GET /api/eventos-especiales]', error)
    return serverError()
  }
}

// POST /api/eventos-especiales — solo admin (verificar con header especial por ahora)
export async function POST(req: NextRequest) {
  try {
    // Auth admin simple — en producción reemplazar con JWT admin
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = crearEventoSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0].message)

    const evento = await prisma.eventoEspecial.create({
      data: {
        ...parsed.data,
        fechaEvento: new Date(parsed.data.fechaEvento),
        estado: 'BORRADOR',
      },
      include: { nivelMinimo: { select: { nombre: true } } },
    })

    return NextResponse.json({ data: evento }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/eventos-especiales]', error)
    return serverError()
  }
}
