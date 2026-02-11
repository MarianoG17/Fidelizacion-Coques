// src/app/api/estados-auto/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireLavaderoAuth, unauthorized, badRequest, serverError } from '@/lib/auth'
import { triggerBeneficiosPorEstado } from '@/lib/beneficios'
import { EstadoAutoEnum } from '@prisma/client'

const updateEstadoSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  estado: z.enum(['RECIBIDO', 'EN_LAVADO', 'EN_SECADO', 'LISTO', 'ENTREGADO']),
  patente: z.string().optional(),
  notas: z.string().optional(),
})

// POST /api/estados-auto — actualizar estado del auto desde el lavadero
// Requiere header X-Api-Key con la API key del lavadero
export async function POST(req: NextRequest) {
  try {
    const local = await requireLavaderoAuth(req)
    if (!local) return unauthorized('API Key inválida o no es lavadero')

    const body = await req.json()
    const parsed = updateEstadoSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0].message)

    const { phone, estado, patente, notas } = parsed.data

    // Buscar cliente por teléfono
    const cliente = await prisma.cliente.findUnique({
      where: { phone },
    })

    if (!cliente) {
      // Si el cliente no existe en el sistema de fidelización,
      // igualmente registramos el estado (puede activarse después)
      return NextResponse.json({
        data: null,
        message: 'Cliente no registrado en el sistema de fidelización',
      })
    }

    // Upsert del estado del auto
    const estadoAuto = await prisma.estadoAuto.upsert({
      where: { clienteId: cliente.id },
      update: {
        estado: estado as EstadoAutoEnum,
        patente: patente || undefined,
        notas: notas || undefined,
        localOrigenId: local.id,
      },
      create: {
        clienteId: cliente.id,
        estado: estado as EstadoAutoEnum,
        patente: patente || null,
        notas: notas || null,
        localOrigenId: local.id,
      },
    })

    // Verificar si hay beneficios que se disparan con este estado
    const beneficiosTriggereados = await triggerBeneficiosPorEstado(
      cliente.id,
      estado as EstadoAutoEnum
    )

    // Registrar evento de estado externo
    await prisma.eventoScan.create({
      data: {
        clienteId: cliente.id,
        localId: local.id,
        tipoEvento: 'ESTADO_EXTERNO',
        metodoValidacion: 'QR',
        estadoExternoSnap: { estado, timestamp: new Date().toISOString() },
        notas: `Estado actualizado a: ${estado}`,
      },
    })

    // TODO Fase 3: enviar push/WhatsApp si hay beneficios disparados
    if (beneficiosTriggereados.length > 0 && estado === 'EN_LAVADO') {
      console.log(`[NOTIF] Cliente ${cliente.phone} tiene beneficio por EN_LAVADO:`,
        beneficiosTriggereados.map(b => b.nombre).join(', ')
      )
      // notifPush(cliente.id, 'Tu café está esperando en Coques 🍵')
    }

    if (estado === 'LISTO') {
      console.log(`[NOTIF] Auto de ${cliente.phone} listo para retirar`)
      // notifPush(cliente.id, '🚗 Tu auto está listo para retirar')
    }

    return NextResponse.json({
      data: estadoAuto,
      beneficiosDisparados: beneficiosTriggereados.map((b) => ({
        id: b.id,
        nombre: b.nombre,
      })),
    })
  } catch (error) {
    console.error('[POST /api/estados-auto]', error)
    return serverError()
  }
}

// GET /api/estados-auto?clienteId=...
export async function GET(req: NextRequest) {
  try {
    const clienteId = req.nextUrl.searchParams.get('clienteId')
    const phone = req.nextUrl.searchParams.get('phone')

    if (!clienteId && !phone) return badRequest('Se requiere clienteId o phone')

    const where = clienteId ? { clienteId } : { cliente: { phone: phone! } }

    const estadoAuto = await prisma.estadoAuto.findFirst({
      where,
      include: { cliente: { select: { nombre: true, phone: true } } },
    })

    return NextResponse.json({ data: estadoAuto })
  } catch (error) {
    console.error('[GET /api/estados-auto]', error)
    return serverError()
  }
}
