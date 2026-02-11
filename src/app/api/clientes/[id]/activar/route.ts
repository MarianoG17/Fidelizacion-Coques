// src/app/api/clientes/[id]/activar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signClienteJWT, serverError, notFound, badRequest } from '@/lib/auth'
import { generarSecretoOTP } from '@/lib/otp'

// POST /api/clientes/:id/activar
// El cliente confirma explícitamente su consentimiento
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: params.id },
    })

    if (!cliente) return notFound('Cliente no encontrado')
    if (cliente.estado === 'ACTIVO') {
      return badRequest('El cliente ya está activo')
    }

    // Generar secreto OTP único para este cliente
    const otpSecret = generarSecretoOTP()

    const clienteActualizado = await prisma.cliente.update({
      where: { id: params.id },
      data: {
        estado: 'ACTIVO',
        consentimientoAt: new Date(),
        otpSecret,
      },
      include: { nivel: true },
    })

    // Generar JWT para que el cliente acceda a su Pass
    const token = await signClienteJWT({
      clienteId: clienteActualizado.id,
      phone: clienteActualizado.phone,
    })

    // Registrar evento de activación
    const localPrincipal = await prisma.local.findFirst({
      where: { tipo: 'cafeteria', activo: true },
    })

    if (localPrincipal) {
      await prisma.eventoScan.create({
        data: {
          clienteId: clienteActualizado.id,
          localId: localPrincipal.id,
          tipoEvento: 'ACTIVACION',
          metodoValidacion: 'QR',
        },
      })
    }

    return NextResponse.json({
      data: {
        token,
        cliente: {
          id: clienteActualizado.id,
          nombre: clienteActualizado.nombre,
          nivel: clienteActualizado.nivel?.nombre || 'Bronce',
        },
      },
    })
  } catch (error) {
    console.error('[POST /api/clientes/:id/activar]', error)
    return serverError()
  }
}
