// src/app/api/estados-auto/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireLavaderoAuth, unauthorized, badRequest, serverError } from '@/lib/auth'
import { triggerBeneficiosPorEstado } from '@/lib/beneficios'
import { EstadoAutoEnum } from '@prisma/client'
import { normalizarPatente } from '@/lib/patente'
import { toE164 } from '@/lib/phone'

export const dynamic = 'force-dynamic'

const updateEstadoSchema = z.object({
  phone: z.string().min(1, 'Teléfono es requerido'), // acepta cualquier formato, se normaliza abajo
  patente: z.string().min(1, 'Patente es requerida'),
  estado: z.enum(['RECIBIDO', 'EN_LAVADO', 'EN_SECADO', 'LISTO', 'ENTREGADO']),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  notas: z.string().optional(),
})

// POST /api/estados-auto — actualizar estado del auto desde el lavadero
// Requiere header X-Api-Key con la API key del lavadero
// Ahora trabaja con múltiples autos por cliente (phone + patente)
export async function POST(req: NextRequest) {
  try {
    const local = await requireLavaderoAuth(req)
    if (!local) return unauthorized('API Key inválida o no es lavadero')

    const body = await req.json()
    const parsed = updateEstadoSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0].message)

    const { phone, estado, patente, marca, modelo, notas } = parsed.data

    // Normalizar teléfono a E.164
    let phoneE164: string
    try {
      phoneE164 = toE164(phone)
    } catch {
      return badRequest('Teléfono inválido')
    }

    // Normalizar patente
    const patenteNormalizada = normalizarPatente(patente)
    if (!patenteNormalizada) return badRequest('Patente inválida')

    // Buscar cliente por teléfono
    const cliente = await prisma.cliente.findUnique({
      where: { phone: phoneE164 },
    })

    if (!cliente) {
      // Si el cliente no existe en el sistema de fidelización,
      // no podemos asignar el auto
      return NextResponse.json({
        data: null,
        message: 'Cliente no registrado en el sistema de fidelización',
      })
    }

    // Buscar o crear el auto del cliente
    let auto = await prisma.auto.findUnique({
      where: {
        clienteId_patente: {
          clienteId: cliente.id,
          patente: patenteNormalizada
        }
      },
    })

    if (!auto) {
      // Crear nuevo auto para el cliente
      auto = await prisma.auto.create({
        data: {
          clienteId: cliente.id,
          patente: patenteNormalizada,
          marca: marca || null,
          modelo: modelo || null,
        },
      })
      console.log(`[AUTO] Nuevo auto registrado: ${patenteNormalizada} para ${cliente.phone}`)
    } else if (marca || modelo) {
      // Actualizar marca/modelo si se proporcionan
      auto = await prisma.auto.update({
        where: { id: auto.id },
        data: {
          marca: marca || auto.marca,
          modelo: modelo || auto.modelo,
        },
      })
    }

    // Upsert del estado del auto
    const estadoAuto = await prisma.estadoAuto.upsert({
      where: { autoId: auto.id },
      update: {
        estado: estado as EstadoAutoEnum,
        notas: notas || undefined,
        localOrigenId: local.id,
      },
      create: {
        autoId: auto.id,
        estado: estado as EstadoAutoEnum,
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
        estadoExternoSnap: { estado, patente: patenteNormalizada, timestamp: new Date().toISOString() },
        notas: `Auto ${patenteNormalizada}: ${estado}`,
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
      console.log(`[NOTIF] Auto ${patenteNormalizada} de ${cliente.phone} listo para retirar`)
      // notifPush(cliente.id, `🚗 Tu auto ${patenteNormalizada} está listo para retirar`)
    }

    return NextResponse.json({
      data: {
        auto: {
          id: auto.id,
          patente: auto.patente,
          marca: auto.marca,
          modelo: auto.modelo,
        },
        estadoAuto,
      },
      beneficiosDisparados: beneficiosTriggereados.map((b: any) => ({
        id: b.id,
        nombre: b.nombre,
      })),
    })
  } catch (error) {
    console.error('[POST /api/estados-auto]', error)
    return serverError()
  }
}

// GET /api/estados-auto — dos modos:
//   ?activos=true → lista todos los autos EN_PROCESO o LISTO del lavadero autenticado
//   ?clienteId=... / ?phone=... → autos del cliente
export async function GET(req: NextRequest) {
  try {
    const clienteId = req.nextUrl.searchParams.get('clienteId')
    const phone = req.nextUrl.searchParams.get('phone')
    const activos = req.nextUrl.searchParams.get('activos')

    // Modo lavadero: listar autos activos para poblar el panel al cargar
    if (activos === 'true') {
      const local = await requireLavaderoAuth(req)
      if (!local) return unauthorized('API Key inválida o no es lavadero')

      const estadosActivos = await prisma.estadoAuto.findMany({
        where: {
          estado: { in: ['EN_PROCESO', 'LISTO'] },
          localOrigenId: local.id,
        },
        include: {
          auto: {
            include: {
              cliente: { select: { phone: true, nombre: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      const data = estadosActivos.map((ea) => ({
        phone: ea.auto.cliente.phone,
        nombre: ea.auto.cliente.nombre,
        patente: ea.auto.patente,
        marca: ea.auto.marca,
        modelo: ea.auto.modelo,
        estado: ea.estado,
      }))

      return NextResponse.json({ data })
    }

    if (!clienteId && !phone) return badRequest('Se requiere clienteId o phone')

    // Buscar cliente
    const cliente = clienteId
      ? await prisma.cliente.findUnique({ where: { id: clienteId } })
      : await prisma.cliente.findUnique({ where: { phone: phone! } })

    if (!cliente) return badRequest('Cliente no encontrado')

    // Obtener todos los autos del cliente con sus estados
    const autos = await prisma.auto.findMany({
      where: { clienteId: cliente.id, activo: true },
      include: {
        estadoActual: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ data: autos })
  } catch (error) {
    console.error('[GET /api/estados-auto]', error)
    return serverError()
  }
}
