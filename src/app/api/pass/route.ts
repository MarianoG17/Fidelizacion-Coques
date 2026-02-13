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
        autos: {
          where: { activo: true },
          include: { estadoActual: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    })

    if (!cliente?.otpSecret) return unauthorized('Cliente no activo')

    // Generar OTP y QR
    const token = generarToken(cliente.otpSecret)
    const otpauthUrl = generarOtpauthUrl(cliente.otpSecret, cliente.nombre || cliente.phone)
    
    // Generar QR con el token directamente (para scanner del local)
    const qrDataUrl = await QRCode.toDataURL(token, {
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
        fechaCumpleanos: cliente.fechaCumpleanos
          ? cliente.fechaCumpleanos.toISOString().split('T')[0]
          : undefined,
        fuenteConocimiento: cliente.fuenteConocimiento || undefined,
        codigoReferido: cliente.codigoReferido || undefined,
        referidosActivados: cliente.referidosActivados || 0,
        nivel: cliente.nivel
          ? { nombre: cliente.nivel.nombre, orden: cliente.nivel.orden, descripcionBeneficios: cliente.nivel.descripcionBeneficios }
          : null,
        beneficiosActivos: beneficios.map((b: any) => ({
          id: b!.id,
          nombre: b!.nombre,
          descripcionCaja: b!.descripcionCaja,
          requiereEstadoExterno: b!.requiereEstadoExterno,
          condiciones: b!.condiciones,
        })),
        autos: cliente.autos.map((auto) => ({
          id: auto.id,
          patente: auto.patente,
          marca: auto.marca,
          modelo: auto.modelo,
          alias: auto.alias,
          estadoActual: auto.estadoActual
            ? {
                estado: auto.estadoActual.estado,
                updatedAt: auto.estadoActual.updatedAt.toISOString(),
              }
            : null,
        })),
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
