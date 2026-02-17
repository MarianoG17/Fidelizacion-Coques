// src/app/api/admin/clientes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/clientes/[id] - Eliminar un cliente (soft delete: cambiar estado a INACTIVO)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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

        // 2. Borrar estados de beneficios (beneficios usados/aplicados)
        await tx.beneficioEstado.deleteMany({
          where: { clienteId: id },
        })

        // 3. Borrar eventos
        await tx.eventoScan.deleteMany({
          where: { clienteId: id },
        })

        // 4. Borrar logros
        await tx.logroCliente.deleteMany({
          where: { clienteId: id },
        })

        // 5. Borrar feedbacks
        await tx.feedback.deleteMany({
          where: { clienteId: id },
        })

        // 6. Borrar inscripciones a eventos
        await tx.inscripcion.deleteMany({
          where: { clienteId: id },
        })

        // 7. Borrar noticias
        await tx.noticia.deleteMany({
          where: { clienteId: id },
        })

        // 8. Borrar sesiones de mesa
        await tx.sesionMesa.deleteMany({
          where: { clienteId: id },
        })

        // 9. Borrar autos
        await tx.auto.deleteMany({
          where: { clienteId: id },
        })

        // 10. Finalmente, borrar el cliente
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
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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
