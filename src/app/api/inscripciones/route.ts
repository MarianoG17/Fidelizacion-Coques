// src/app/api/inscripciones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth, unauthorized, badRequest, serverError } from '@/lib/auth'

const inscribirseSchema = z.object({
  eventoId: z.string().uuid(),
})

const cancelarSchema = z.object({
  inscripcionId: z.string().uuid(),
})

// POST /api/inscripciones — cliente se inscribe a un evento
export async function POST(req: NextRequest) {
  try {
    const payload = await requireClienteAuth(req)
    if (!payload) return unauthorized()

    const body = await req.json()
    const parsed = inscribirseSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0].message)

    const { eventoId } = parsed.data

    // Verificar que el evento existe, está publicado y tiene cupo
    const evento = await prisma.eventoEspecial.findUnique({
      where: { id: eventoId },
      include: { nivelMinimo: true },
    })

    if (!evento) return badRequest('Evento no encontrado')
    if (evento.estado !== 'PUBLICADO') return badRequest('El evento no está disponible')
    if (new Date(evento.fechaEvento) < new Date()) return badRequest('El evento ya pasó')
    if (evento.inscriptosCount >= evento.cupoMaximo) {
      return badRequest('El evento está completo')
    }

    // Verificar nivel del cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: payload.clienteId, estado: 'ACTIVO' },
      include: { nivel: true },
    })
    if (!cliente) return unauthorized()

    const nivelCliente = cliente.nivel?.orden || 0
    if (nivelCliente < evento.nivelMinimo.orden) {
      return badRequest(`Necesitás nivel ${evento.nivelMinimo.nombre} o superior para inscribirte`)
    }

    // Verificar que no esté ya inscripto
    const yaInscripto = await prisma.inscripcion.findUnique({
      where: { clienteId_eventoId: { clienteId: payload.clienteId, eventoId } },
    })
    if (yaInscripto && yaInscripto.estado === 'CONFIRMADA') {
      return badRequest('Ya estás inscripto a este evento')
    }

    // Transacción: crear inscripción + incrementar contador + crear noticia
    const result = await prisma.$transaction(async (tx) => {
      // Control de concurrencia: verificar cupo dentro de la transacción
      const eventoActual = await tx.eventoEspecial.findUnique({
        where: { id: eventoId },
        select: { inscriptosCount: true, cupoMaximo: true },
      })
      if (!eventoActual || eventoActual.inscriptosCount >= eventoActual.cupoMaximo) {
        throw new Error('CUPO_LLENO')
      }

      const inscripcion = await tx.inscripcion.upsert({
        where: { clienteId_eventoId: { clienteId: payload.clienteId, eventoId } },
        update: { estado: 'CONFIRMADA', updatedAt: new Date() },
        create: { clienteId: payload.clienteId, eventoId, estado: 'CONFIRMADA' },
      })

      await tx.eventoEspecial.update({
        where: { id: eventoId },
        data: { inscriptosCount: { increment: 1 } },
      })

      // Noticia de confirmación
      await tx.noticia.create({
        data: {
          clienteId: payload.clienteId,
          titulo: `Estás anotado a ${evento.titulo}`,
          cuerpo: `Fecha: ${new Date(evento.fechaEvento).toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
          })}`,
          tipo: 'EVENTO',
          accionUrl: `/eventos/${eventoId}`,
        },
      })

      return inscripcion
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'CUPO_LLENO') {
      return badRequest('El evento se llenó justo ahora. Intentá más tarde.')
    }
    console.error('[POST /api/inscripciones]', error)
    return serverError()
  }
}

// DELETE /api/inscripciones — cliente cancela su inscripción
export async function DELETE(req: NextRequest) {
  try {
    const payload = await requireClienteAuth(req)
    if (!payload) return unauthorized()

    const body = await req.json()
    const parsed = cancelarSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0].message)

    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id: parsed.data.inscripcionId },
      include: { evento: true },
    })

    if (!inscripcion) return badRequest('Inscripción no encontrada')
    if (inscripcion.clienteId !== payload.clienteId) return unauthorized()
    if (inscripcion.estado !== 'CONFIRMADA') return badRequest('La inscripción ya fue cancelada')

    // Calcular si hay penalidad (menos de 48hs antes del evento)
    const horasHastaEvento =
      (new Date(inscripcion.evento.fechaEvento).getTime() - Date.now()) / (1000 * 60 * 60)
    const conPenalidad = horasHastaEvento < 48
    const VISITAS_PENALIDAD = 2

    await prisma.$transaction(async (tx) => {
      // Actualizar inscripción
      await tx.inscripcion.update({
        where: { id: inscripcion.id },
        data: {
          estado: conPenalidad ? 'CANCELADA_CON_PENALIDAD' : 'CANCELADA_SIN_PENALIDAD',
          penalizadoAt: conPenalidad ? new Date() : null,
          visitasDescontadas: conPenalidad ? VISITAS_PENALIDAD : 0,
        },
      })

      // Liberar cupo
      await tx.eventoEspecial.update({
        where: { id: inscripcion.eventoId },
        data: { inscriptosCount: { decrement: 1 } },
      })

      if (conPenalidad) {
        // Marcar las 2 visitas más recientes como no contabilizadas
        const visitasRecientes = await tx.eventoScan.findMany({
          where: {
            clienteId: payload.clienteId,
            contabilizada: true,
            tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
          },
          orderBy: { timestamp: 'desc' },
          take: VISITAS_PENALIDAD,
        })

        for (const visita of visitasRecientes) {
          await tx.eventoScan.update({
            where: { id: visita.id },
            data: { contabilizada: false },
          })
        }

        // Noticia con penalidad
        await tx.noticia.create({
          data: {
            clienteId: payload.clienteId,
            titulo: `Cancelaste ${inscripcion.evento.titulo}`,
            cuerpo: `Como cancelaste con menos de 48hs de anticipación, se descontaron ${VISITAS_PENALIDAD} visitas de tu contador.`,
            tipo: 'ADVERTENCIA',
          },
        })
      } else {
        // Noticia sin penalidad
        await tx.noticia.create({
          data: {
            clienteId: payload.clienteId,
            titulo: `Cancelaste ${inscripcion.evento.titulo}`,
            cuerpo: 'Cancelación sin penalidad. ¡Te esperamos en el próximo evento!',
            tipo: 'INFO',
          },
        })
      }
    })

    return NextResponse.json({
      data: { cancelado: true, conPenalidad, visitasDescontadas: conPenalidad ? VISITAS_PENALIDAD : 0 },
    })
  } catch (error) {
    console.error('[DELETE /api/inscripciones]', error)
    return serverError()
  }
}
