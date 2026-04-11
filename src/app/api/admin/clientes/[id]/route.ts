// src/app/api/admin/clientes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'
import { sendPushNotification } from '@/lib/push'
import { sendEmail } from '@/lib/email'

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
      ("metodoValidacion"::text LIKE 'BONUS_%') AS "esBonus",
      COUNT(DISTINCT DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires'))::bigint AS count
    FROM "EventoScan"
    WHERE "clienteId" = ${id}
      AND "contabilizada" = true
      AND "tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
    GROUP BY ("metodoValidacion"::text LIKE 'BONUS_%')
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
      const nivelIconos: Record<string, string> = { 'Oro': '🥇', 'Plata': '🥈', 'Bronce': '🥉' }
      const nivelIcono = nivelIconos[nuevoNivel?.nombre || ''] || '🎖️'
      const titulo = `${nivelIcono} ¡Subiste a nivel ${nuevoNivel?.nombre}!`
      const cuerpo = `¡Felicitaciones! Alcanzaste el nivel ${nuevoNivel?.nombre} y desbloqueaste nuevos beneficios exclusivos.`
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

      // Email de subida de nivel (si tiene email)
      if (clienteActualizado.email && nuevoNivel) {
        try {
          const nombre = clienteActualizado.nombre?.split(' ')[0] || 'cliente'
          const beneficiosPorNivel: Record<string, string> = {
            'Plata': '🥈 Descuento del 15% en tu próxima visita y prioridad en atención.',
            'Oro': '🥇 Descuento del 20%, acceso a ofertas exclusivas y sorpresas especiales.',
          }
          const beneficioTexto = beneficiosPorNivel[nuevoNivel.nombre || ''] || 'nuevos beneficios exclusivos.'
          await sendEmail({
            to: clienteActualizado.email,
            subject: `${nivelIcono} ¡Subiste a nivel ${nuevoNivel.nombre} en Coques Bakery!`,
            html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8f8f8;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e;padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">Coques Bakery</h1>
      <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Programa de Fidelización</p>
    </div>
    <div style="padding:32px;color:#1e293b;font-size:15px;line-height:1.7;">
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>¡Felicitaciones! Alcanzaste el nivel <strong>${nivelIcono} ${nuevoNivel.nombre}</strong> en nuestro programa de puntos.</p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;color:#166534;"><strong>Tus nuevos beneficios:</strong><br>${beneficioTexto}</p>
      </div>
      <p>Podés ver todos tus beneficios en la app.<br>¡Gracias por ser parte de Coques Bakery!</p>
    </div>
    <div style="background:#f1f5f9;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        <a href="https://coques.com.ar" style="color:#6366f1;">coques.com.ar</a>
      </p>
    </div>
  </div>
</body></html>`,
          })
        } catch (emailError) {
          console.error('[PATCH cliente] Error enviando email de nivel:', emailError)
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
