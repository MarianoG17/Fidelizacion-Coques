// src/app/api/otp/generar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth, unauthorized, serverError } from '@/lib/auth'
import { generarToken, generarOtpauthUrl, tiempoRestante } from '@/lib/otp'

// GET /api/otp/generar
// Requiere JWT del cliente en Authorization: Bearer <token>
export async function GET(req: NextRequest) {
  try {
    const payload = await requireClienteAuth(req)
    if (!payload) return unauthorized()

    const cliente = await prisma.cliente.findUnique({
      where: { id: payload.clienteId, estado: 'ACTIVO' },
    })

    if (!cliente?.otpSecret) {
      return unauthorized('Cliente no activo o sin secreto OTP')
    }

    // Generar token OTP actual
    const token = generarToken(cliente.otpSecret)
    const otpauthUrl = generarOtpauthUrl(cliente.otpSecret, cliente.nombre || cliente.phone)
    const segundosRestantes = tiempoRestante()

    // Generar QR como data URL (base64 PNG)
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1A3C5E',
        light: '#FFFFFF',
      },
    })

    return NextResponse.json({
      data: {
        token,           // código de 6 dígitos para fallback manual
        qrDataUrl,       // imagen QR para mostrar en el Pass
        otpauthUrl,      // URL codificada en el QR
        tiempoRestante: segundosRestantes,
        step: Number(process.env.OTP_STEP) || 30,
      },
    })
  } catch (error) {
    console.error('[GET /api/otp/generar]', error)
    return serverError()
  }
}
