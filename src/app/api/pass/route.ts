// src/app/api/pass/route.ts
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth, unauthorized, serverError } from '@/lib/auth'
import { generarToken, generarOtpauthUrl, tiempoRestante } from '@/lib/otp'
import { getBeneficiosActivos } from '@/lib/beneficios'
import { ESTADO_AUTO_LABELS } from '@/types'

export const dynamic = 'force-dynamic'

// GET /api/pass — datos completos del Pass del cliente
// Requiere Authorization: Bearer <jwt>
export async function GET(req: NextRequest) {
  try {
    const payload = await requireClienteAuth(req)
    if (!payload) return unauthorized()

    const cliente = await prisma.cliente.findUnique({
      where: { id: payload.clienteId, estado: 'ACTIVO' },
      include: {
        nivel: true,
        estadoAuto: true,
      },
    })

    if (!cliente?.otpSecret) return unauthorized('Cliente no activo')

    // Generar OTP y QR
    const token = generarToken(cliente.otpSecret)
    const otpauthUrl = generarOtpauthUrl(cliente.otpSecret, cliente.nombre || cliente.phone)
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#1A3C5E', light: '#FFFFFF' },
    })

    // Obtener beneficios activos
    const beneficios = await getBeneficiosActivos(cliente.id)

    return NextResponse.json({
      data: {
        clienteId: cliente.id,
        nombre: cliente.nombre || 'Cliente',
        phone: cliente.phone,
        nivel: cliente.nivel
          ? { nombre: cliente.nivel.nombre, orden: cliente.nivel.orden }
          : null,
        beneficiosActivos: beneficios.map((b) => ({
          id: b!.id,
          nombre: b!.nombre,
          descripcionCaja: b!.descripcionCaja,
          requiereEstadoExterno: b!.requiereEstadoExterno,
          condiciones: b!.condiciones,
        })),
        estadoAuto: cliente.estadoAuto
          ? {
              estado: cliente.estadoAuto.estado,
              label: ESTADO_AUTO_LABELS[cliente.estadoAuto.estado],
              updatedAt: cliente.estadoAuto.updatedAt.toISOString(),
            }
          : null,
        otp: {
          token,
          qrDataUrl,
          otpauthUrl,
          tiempoRestante: tiempoRestante(),
          step: Number(process.env.OTP_STEP) || 30,
        },
      },
    })
  } catch (error) {
    console.error('[GET /api/pass]', error)
    return serverError()
  }
}
