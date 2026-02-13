// src/app/api/sesiones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized, badRequest, serverError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const crearSesionSchema = z.object({
  clienteId: z.string().uuid(),
  mesaId: z.string().uuid(),
})

// POST /api/sesiones - Iniciar sesión de mesa
export async function POST(req: NextRequest) {
  try {
    const local = await requireLocalAuth(req)
    if (!local) return unauthorized('API Key de local inválida')

    const body = await req.json()
    const parsed = crearSesionSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0].message)

    const { clienteId, mesaId } = parsed.data

    // Verificar que el cliente existe y está activo
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId, estado: 'ACTIVO' },
    })
    if (!cliente) return badRequest('Cliente no encontrado o inactivo')

    // Verificar que la mesa existe y pertenece al local
    const mesa = await prisma.mesa.findFirst({
      where: { id: mesaId, localId: local.id },
    })
    if (!mesa) return badRequest('Mesa no encontrada o no pertenece a este local')

    // Verificar si ya hay una sesión activa en esta mesa
    const sesionExistente = await prisma.sesionMesa.findFirst({
      where: {
        mesaId,
        activa: true,
      },
      include: {
        cliente: { select: { nombre: true, phone: true } },
      },
    })

    if (sesionExistente) {
      return NextResponse.json(
        {
          error: 'Esta mesa ya está ocupada',
          sesionActiva: {
            cliente: sesionExistente.cliente.nombre || sesionExistente.cliente.phone,
            desde: sesionExistente.inicioSesion,
          },
        },
        { status: 409 } // Conflict
      )
    }

    // Verificar si el cliente ya tiene una sesión activa en otra mesa del mismo local
    const sesionClienteActiva = await prisma.sesionMesa.findFirst({
      where: {
        clienteId,
        localId: local.id,
        activa: true,
      },
      include: {
        mesa: { select: { nombre: true } },
      },
    })

    if (sesionClienteActiva) {
      // Cerrar la sesión anterior automáticamente
      const duracion = Math.floor(
        (new Date().getTime() - sesionClienteActiva.inicioSesion.getTime()) / 60000
      )

      await prisma.sesionMesa.update({
        where: { id: sesionClienteActiva.id },
        data: {
          activa: false,
          finSesion: new Date(),
          cerradaPor: 'SISTEMA',
          duracionMinutos: duracion,
        },
      })
    }

    // Crear nueva sesión
    const sesion = await prisma.sesionMesa.create({
      data: {
        clienteId,
        mesaId,
        localId: local.id,
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            phone: true,
            nivel: { select: { nombre: true, orden: true } },
          },
        },
        mesa: { select: { nombre: true } },
      },
    })

    return NextResponse.json(
      {
        data: sesion,
        mensaje: `Sesión iniciada: ${sesion.cliente.nombre || 'Cliente'} en Mesa ${sesion.mesa.nombre}`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/sesiones]', error)
    return serverError()
  }
}

// GET /api/sesiones - Obtener sesiones activas del local
export async function GET(req: NextRequest) {
  try {
    const local = await requireLocalAuth(req)
    if (!local) return unauthorized('API Key de local inválida')

    const { searchParams } = req.nextUrl
    const activas = searchParams.get('activas')

    const where: any = { localId: local.id }
    if (activas === 'true') {
      where.activa = true
    }

    const sesiones = await prisma.sesionMesa.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            phone: true,
            nivel: { select: { nombre: true, orden: true } },
          },
        },
        mesa: { select: { id: true, nombre: true } },
      },
      orderBy: { inicioSesion: 'desc' },
      take: 100,
    })

    return NextResponse.json({ data: sesiones })
  } catch (error) {
    console.error('[GET /api/sesiones]', error)
    return serverError()
  }
}
