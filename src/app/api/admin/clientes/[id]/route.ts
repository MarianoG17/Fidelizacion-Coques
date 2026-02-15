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
      message: `Cliente ${cliente.nombre} eliminado correctamente`,
      data: { id, estado: 'INACTIVO' },
    })
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
