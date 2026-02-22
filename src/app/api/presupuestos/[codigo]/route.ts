// src/app/api/presupuestos/[codigo]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/presupuestos/:codigo - Obtener un presupuesto específico
export async function GET(
  req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  try {
    const { codigo } = params

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { codigo },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            phone: true,
            email: true,
            nivel: {
              select: {
                nombre: true,
                descuentoPedidosTortas: true
              }
            }
          }
        }
      }
    })

    if (!presupuesto) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      presupuesto
    })

  } catch (error: any) {
    console.error('Error al obtener presupuesto:', error)
    return NextResponse.json(
      { error: 'Error al obtener presupuesto', detalles: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/presupuestos/:codigo - Actualizar un presupuesto
export async function PATCH(
  req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  try {
    const { codigo } = params
    const body = await req.json()

    // Verificar que el presupuesto exista
    const presupuestoExistente = await prisma.presupuesto.findUnique({
      where: { codigo }
    })

    if (!presupuestoExistente) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      )
    }

    // No permitir actualizar si ya fue confirmado
    if (presupuestoExistente.estado === 'CONFIRMADO') {
      return NextResponse.json(
        { error: 'No se puede modificar un presupuesto ya confirmado' },
        { status: 400 }
      )
    }

    const {
      items,
      precioTotal,
      descuento,
      fechaEntrega,
      horaEntrega,
      estado,
      camposPendientes,
      notasCliente,
      notasInternas,
      nombreCliente,
      telefonoCliente,
      emailCliente
    } = body

    const updateData: any = {}

    if (items !== undefined) updateData.items = items
    if (precioTotal !== undefined) updateData.precioTotal = precioTotal
    if (descuento !== undefined) updateData.descuento = descuento
    if (fechaEntrega !== undefined) updateData.fechaEntrega = fechaEntrega ? new Date(fechaEntrega) : null
    if (horaEntrega !== undefined) updateData.horaEntrega = horaEntrega
    if (estado !== undefined && ['PENDIENTE', 'COMPLETO', 'CONFIRMADO', 'CANCELADO'].includes(estado)) {
      updateData.estado = estado
    }
    if (camposPendientes !== undefined) updateData.camposPendientes = camposPendientes
    if (notasCliente !== undefined) updateData.notasCliente = notasCliente
    if (notasInternas !== undefined) updateData.notasInternas = notasInternas
    if (nombreCliente !== undefined) updateData.nombreCliente = nombreCliente
    if (telefonoCliente !== undefined) updateData.telefonoCliente = telefonoCliente
    if (emailCliente !== undefined) updateData.emailCliente = emailCliente

    const presupuesto = await prisma.presupuesto.update({
      where: { codigo },
      data: updateData,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            phone: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      presupuesto,
      mensaje: 'Presupuesto actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al actualizar presupuesto:', error)
    return NextResponse.json(
      { error: 'Error al actualizar presupuesto', detalles: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/presupuestos/:codigo - Cancelar un presupuesto
export async function DELETE(
  req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  try {
    const { codigo } = params

    const presupuestoExistente = await prisma.presupuesto.findUnique({
      where: { codigo }
    })

    if (!presupuestoExistente) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      )
    }

    if (presupuestoExistente.estado === 'CONFIRMADO') {
      return NextResponse.json(
        { error: 'No se puede cancelar un presupuesto ya confirmado' },
        { status: 400 }
      )
    }

    // Cambiar estado a CANCELADO en lugar de eliminar
    const presupuesto = await prisma.presupuesto.update({
      where: { codigo },
      data: { estado: 'CANCELADO' }
    })

    return NextResponse.json({
      success: true,
      presupuesto,
      mensaje: 'Presupuesto cancelado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al cancelar presupuesto:', error)
    return NextResponse.json(
      { error: 'Error al cancelar presupuesto', detalles: error.message },
      { status: 500 }
    )
  }
}
