// src/app/api/clientes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { badRequest, serverError } from '@/lib/auth'

const crearClienteSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'El celular debe estar en formato E.164 (+5491112345678)'),
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  fuenteOrigen: z.enum(['AIRES', 'LAVADERO', 'AUTOREGISTRO', 'MANUAL']).optional(),
})

// GET /api/clientes?phone=+5491112345678
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return badRequest('Se requiere el parámetro phone')

  const cliente = await prisma.cliente.findUnique({
    where: { phone },
    include: { nivel: true },
  })

  if (!cliente) return NextResponse.json({ data: null }, { status: 200 })

  return NextResponse.json({
    data: {
      id: cliente.id,
      phone: cliente.phone,
      nombre: cliente.nombre,
      estado: cliente.estado,
      nivel: cliente.nivel?.nombre || null,
      consentimientoAt: cliente.consentimientoAt,
    },
  })
}

// POST /api/clientes — crear o importar cliente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = crearClienteSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0].message)

    const { phone, nombre, email, fuenteOrigen } = parsed.data

    // Buscar nivel Bronce (nivel de entrada)
    const nivelBronce = await prisma.nivel.findUnique({ where: { nombre: 'Bronce' } })

    const cliente = await prisma.cliente.upsert({
      where: { phone },
      update: {
        nombre: nombre || undefined,
        email: email || undefined,
      },
      create: {
        phone,
        nombre,
        email,
        estado: 'PRE_REGISTRADO',
        fuenteOrigen: fuenteOrigen || 'AUTOREGISTRO',
        nivelId: nivelBronce?.id,
      },
    })

    return NextResponse.json({ data: cliente }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/clientes]', error)
    return serverError()
  }
}
