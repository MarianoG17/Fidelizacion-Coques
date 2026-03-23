// src/app/api/admin/clientes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'
import { sendPushNotification } from '@/lib/push'

export const dynamic = 'force-dynamic'

// GET /api/admin/clientes/[id] - Obtener perfil completo de un cliente
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  const { id } = params

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      phone: true,
      email: true,
      estado: true,
      nivel: { select: { nombre: true, orden: true } },
      fechaCumpleanos: true,
      fuenteConocimiento: true,
      authProvider: true,
      referidosActivados: true,
      createdAt: true,
      pushSub: true,
      autos: {
        select: {
          id: true,
          patente: true,
          marca: true,
          modelo: true,
          alias: true,
          estadoActual: { select: { estado: true, updatedAt: true } },
        },
      },
      eventos: {
        where: { contabilizada: true },
        orderBy: { timestamp: 'desc' },
        take: 20,
        select: {
          id: true,
          timestamp: true,
          tipoEvento: true,
          notas: true,
          local: { select: { nombre: true } },
        },
      },
    },
  })

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  // Contar visitas
  const visitasResult = await prisma.$queryRaw<Array<{ esBonus: boolean; count: bigint }>>`
    SELECT
      (LOWER("notas") LIKE '%bonus%') AS "esBonus",
      COUNT(DISTINCT DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires'))::bigint AS count
    FROM "EventoScan"
    WHERE "clienteId" = ${id}
      AND "contabilizada" = true
      AND "tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
    GROUP BY (LOWER("notas") LIKE '%bonus%')
  `
  let visitasReales = 0, visitasBonus = 0
  for (const r of visitasResult) {
    if (r.esBonus) visitasBonus = Number(r.count)
    else visitasReales = Number(r.count)
  }

  return NextResponse.json({
    data: {
      ...cliente,
      tienePush: !!cliente.pushSub,
      pushSub: undefined,
      visitasReales,
      visitasBonus,
    },
  })
}

// DELETE /api/admin/clientes/[id] - Eliminar un cliente (soft delete: cambiar estado a INACTIVO)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  try {
    const { id } = params
    const url = new URL(req.url)
    const permanent = url.searchParams.get('permanent') === 'true'

    // Verificar si el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: { nombre: true, phone: true, email: true },
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    if (permanent) {
      // ELIMINACIÓN PERMANENTE: Borrar todas las relaciones y el cliente
      console.log(`[Admin] ELIMINACIÓN PERMANENTE iniciada para cliente ${cliente.nombre} (${cliente.phone})`)
      
      // Borrar en orden de dependencias
      await prisma.$transaction(async (tx) => {
        // 1. Borrar relaciones de referidos (actualizar referidoPorId a null)
        await tx.cliente.updateMany({
          where: { referidoPorId: id },
          data: { referidoPorId: null },
        })

        // 2. Borrar eventos (incluye beneficios aplicados ya que tienen beneficioId)
        await tx.eventoScan.deleteMany({
          where: { clienteId: id },
        })

        // 3. Borrar logros
        await tx.logroCliente.deleteMany({
          where: { clienteId: id },
        })

        // 4. Borrar feedbacks
        await tx.feedback.deleteMany({
          where: { clienteId: id },
        })

        // 5. Borrar inscripciones a eventos
        await tx.inscripcion.deleteMany({
          where: { clienteId: id },
        })

        // 6. Borrar noticias
        await tx.noticia.deleteMany({
          where: { clienteId: id },
        })

        // 7. Borrar sesiones de mesa
        await tx.sesionMesa.deleteMany({
          where: { clienteId: id },
        })

        // 8. Borrar autos
        await tx.auto.deleteMany({
          where: { clienteId: id },
        })

        // 9. Finalmente, borrar el cliente
        await tx.cliente.delete({
          where: { id },
        })
      })

      console.log(`[Admin] Cliente ${cliente.nombre} ELIMINADO PERMANENTEMENTE`)

      return NextResponse.json({
        success: true,
        message: `Cliente ${cliente.nombre} eliminado permanentemente de la base de datos`,
        data: { id, deleted: true },
      })
    } else {
      // Soft delete: cambiar estado a INACTIVO en lugar de borrar
      await prisma.cliente.update({
        where: { id },
        data: { estado: 'INACTIVO' },
      })

      console.log(
        `[Admin] Cliente ${cliente.nombre} (${cliente.phone}) marcado como INACTIVO`
      )

      return NextResponse.json({
        success: true,
        message: `Cliente ${cliente.nombre} desactivado correctamente`,
        data: { id, estado: 'INACTIVO' },
      })
    }
  } catch (error) {
    console.error('[DELETE /api/admin/clientes/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar cliente' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/clientes/[id] - Actualizar estado o información del cliente
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  try {
    const { id } = params
    const body = await req.json()
    const { estado, nombre, email, nivelId } = body

    // Verificar si el cliente existe
    const clienteExiste = await prisma.cliente.findUnique({
      where: { id },
    })

    if (!clienteExiste) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar cliente
    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: {
        ...(estado && { estado }),
        ...(nombre && { nombre }),
        ...(email && { email }),
        ...(nivelId && { nivelId }),
      },
      include: {
        nivel: true,
      },
    })

    // Cuando se cambia el nivel: siempre guardar en BD (campanita), solo push si tiene suscripción
    if (nivelId) {
      const nuevoNivel = clienteActualizado.nivel
      const titulo = `🎉 ¡Subiste a nivel ${nuevoNivel?.nombre}!`
      const cuerpo = `¡Felicitaciones! Ahora sos parte del nivel ${nuevoNivel?.nombre} y tenés nuevos beneficios exclusivos.`
      let notifId: string | undefined
      try {
        const notif = await prisma.notificacion.create({
          data: {
            clienteId: id,
            titulo,
            cuerpo,
            tipo: 'NUEVO_NIVEL',
            url: '/logros',
            enviada: false,
            leida: false,
            metadata: { nivelId, nivelNombre: nuevoNivel?.nombre },
          } as any,
        })
        notifId = notif.id
      } catch (e) {
        console.error('[PATCH cliente] Error al guardar notificación:', e)
      }
      if (clienteActualizado.pushSub) {
        try {
          const config = await prisma.configuracionApp.findFirst()
          if (config?.pushNuevoNivel && config.pushHabilitado) {
            const enviado = await sendPushNotification(clienteActualizado.pushSub, {
              title: titulo,
              body: cuerpo,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              data: { url: '/logros', type: 'nuevo_nivel', nivelId },
            })
            if (enviado && notifId) {
              await prisma.notificacion.update({ where: { id: notifId }, data: { enviada: true } })
            }
          }
        } catch (pushError) {
          console.error('[PATCH cliente] Error enviando push de nivel:', pushError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: clienteActualizado,
    })
  } catch (error) {
    console.error('[PATCH /api/admin/clientes/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar cliente' },
      { status: 500 }
    )
  }
}
