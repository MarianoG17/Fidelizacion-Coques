// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * API: Solicitar recuperación de contraseña
 * POST /api/auth/forgot-password
 * 
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    // Validar email
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email es requerido' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      )
    }

    // Buscar cliente por email
    const cliente = await prisma.cliente.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        nombre: true,
        estado: true,
      },
    })

    // Por seguridad, siempre retornar éxito (no revelar si el email existe)
    // Esto previene ataques de enumeración de usuarios
    if (!cliente) {
      console.log(`[Forgot Password] Email no encontrado: ${email}`)
      return NextResponse.json({
        success: true,
        message: 'Si el email existe, recibirás un link de recuperación en los próximos minutos.',
      })
    }

    // Verificar que el cliente esté activo
    if (cliente.estado === 'INACTIVO') {
      console.log(`[Forgot Password] Cliente inactivo: ${email}`)
      return NextResponse.json({
        success: true,
        message: 'Si el email existe, recibirás un link de recuperación en los próximos minutos.',
      })
    }

    // Generar token único
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // Válido por 1 hora

    // Guardar token en BD
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiresAt,
      },
    })

    // Construir link de reseteo
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://coques.vercel.app'}/reset-password/${token}`

    // Enviar email con Brevo
    try {
      // Log para debugging
      console.log('=====================================')
      console.log(`[Forgot Password] Email: ${email}`)
      console.log(`[Forgot Password] Link de reseteo:`)
      console.log(resetLink)
      console.log(`[Forgot Password] Token válido hasta: ${expiresAt.toLocaleString('es-AR')}`)
      console.log('=====================================')

      await sendEmail({
        to: email,
        subject: 'Recuperá tu contraseña - Coques Bakery',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #9333ea;">Recuperación de contraseña</h2>
              <p>Hola <strong>${cliente.nombre || 'Cliente'}</strong>,</p>
              <p>Recibimos una solicitud para recuperar tu contraseña de <strong>Coques Bakery</strong>.</p>
              <p>Hacé clic en el siguiente enlace para crear una nueva contraseña:</p>
              <p style="margin: 30px 0;">
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #9333ea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Cambiar mi contraseña</a>
              </p>
              <p style="color: #666;">O copiá y pegá este enlace en tu navegador:</p>
              <p style="color: #9333ea; word-break: break-all;">${resetLink}</p>
              <p style="margin-top: 30px;"><strong>Este enlace es válido por 1 hora.</strong></p>
              <p style="color: #666;">Si no solicitaste recuperar tu contraseña, ignorá este email.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #999; font-size: 12px; text-align: center;">Coques Bakery - Sistema de fidelización</p>
            </div>
          `,
      })

      console.log('[Forgot Password] Email de recuperación procesado')
    } catch (emailError) {
      console.error('[Forgot Password] Error al enviar email:', emailError)
      // No fallar la request por error de email
    }

    return NextResponse.json({
      success: true,
      message: 'Si el email existe, recibirás un link de recuperación en los próximos minutos.',
      // En development, incluir el link
      ...(process.env.NODE_ENV === 'development' && { resetLink, expiresAt }),
    })
  } catch (error) {
    console.error('[Forgot Password] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error al procesar la solicitud. Intenta nuevamente.',
      },
      { status: 500 }
    )
  }
}
