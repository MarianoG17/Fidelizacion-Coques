// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

/**
 * API: Resetear contraseña con token
 * POST /api/auth/reset-password
 * 
 * Body: { token: string, newPassword: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()

    // Validaciones
    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Token y contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Buscar cliente por token
    const cliente = await prisma.cliente.findUnique({
      where: { resetPasswordToken: token },
      select: {
        id: true,
        email: true,
        nombre: true,
        resetPasswordExpires: true,
      },
    })

    if (!cliente) {
      return NextResponse.json(
        { success: false, message: 'Token inválido o expirado' },
        { status: 400 }
      )
    }

    // Verificar que el token no haya expirado
    const now = new Date()
    const expiresAt = cliente.resetPasswordExpires
    
    if (!expiresAt || now > expiresAt) {
      return NextResponse.json(
        { success: false, message: 'Este link ha expirado. Solicitá uno nuevo.' },
        { status: 400 }
      )
    }

    // Hashear la nueva contraseña
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Actualizar la contraseña y limpiar el token
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        password: passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    })

    console.log(`[Reset Password] Contraseña actualizada para: ${cliente.email}`)

    return NextResponse.json({
      success: true,
      message: '¡Contraseña actualizada exitosamente! Ya podés iniciar sesión.',
      email: cliente.email,
    })
  } catch (error) {
    console.error('[Reset Password] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error al resetear la contraseña. Intenta nuevamente.',
      },
      { status: 500 }
    )
  }
}
