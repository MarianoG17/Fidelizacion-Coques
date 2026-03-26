// src/app/api/auth/complete-phone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { normalizarTelefono } from '@/lib/phone'
import { generarSecretoOTP } from '@/lib/otp'
import { sendEmail } from '@/lib/email'
import jwt from 'jsonwebtoken'

/**
 * Endpoint para completar el teléfono de usuarios que se registraron con Google
 * POST /api/auth/complete-phone
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const { phone } = await req.json()

        console.log('[COMPLETE-PHONE] Request from user:', session.user.email, 'phone:', phone)

        if (!phone) {
            return NextResponse.json(
                { error: 'El teléfono es requerido' },
                { status: 400 }
            )
        }

        // Normalizar teléfono - FLEXIBILIZADO para interior e internacionales
        const normalizedPhone = normalizarTelefono(phone)
        console.log('[COMPLETE-PHONE] Normalized phone:', normalizedPhone)

        if (!normalizedPhone) {
            return NextResponse.json(
                { error: 'Formato de teléfono inválido. Debe tener entre 8 y 15 dígitos. Ejemplos: 1112345678 (CABA), 3456268265 (Interior), +1234567890 (Internacional)' },
                { status: 400 }
            )
        }

        // Verificar que el teléfono no esté en uso
        const existingClient = await prisma.cliente.findUnique({
            where: { phone: normalizedPhone }
        })

        console.log('[COMPLETE-PHONE] Existing client with this phone:', existingClient ? 'YES' : 'NO')

        if (existingClient && existingClient.email !== session.user.email) {
            return NextResponse.json(
                { error: 'Este teléfono ya está registrado en otra cuenta' },
                { status: 400 }
            )
        }

        // Buscar el cliente actual
        const currentClient = await prisma.cliente.findUnique({
            where: { email: session.user.email }
        })

        if (!currentClient) {
            console.error('[COMPLETE-PHONE] Cliente no encontrado:', session.user.email)
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        console.log('[COMPLETE-PHONE] Current client estado:', currentClient.estado, 'phone:', currentClient.phone)

        // Generar OTP secret si no existe (usuarios de Google OAuth)
        const otpSecret = currentClient.otpSecret || generarSecretoOTP()

        // Actualizar cliente con el teléfono y otpSecret
        const cliente = await prisma.cliente.update({
            where: { email: session.user.email },
            data: {
                phone: normalizedPhone,
                estado: 'ACTIVO', // Activar cuenta al completar teléfono
                otpSecret: otpSecret, // Generar secret para QR del pass
            },
            include: {
                nivel: true
            }
        })

        console.log('[COMPLETE-PHONE] Cliente actualizado exitosamente:', {
            id: cliente.id,
            email: cliente.email,
            phone: cliente.phone,
            estado: cliente.estado,
            hasOtpSecret: !!cliente.otpSecret
        })

        // Enviar email de bienvenida (solo si es un registro nuevo, no una actualización)
        const esRegistroNuevo = currentClient.phone?.includes('TEMP')
        if (esRegistroNuevo && cliente.email) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coques.vercel.app'
            sendEmail({
                to: cliente.email,
                subject: '¡Bienvenido a Coques Bakery! 🎉',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #9333ea; margin: 0;">¡Bienvenido a Coques Bakery!</h1>
                      </div>

                      <p style="font-size: 16px;">Hola <strong>${cliente.nombre}</strong>,</p>

                      <p>¡Gracias por registrarte en nuestro programa de fidelización! 🎉</p>

                      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                        <h3 style="color: #9333ea; margin-top: 0;">¿Qué podés hacer ahora?</h3>
                        <ul style="line-height: 1.8;">
                          <li>✨ Acumulá visitas y subí de nivel (Bronce → Plata → Oro)</li>
                          <li>🎁 Desbloqueá beneficios exclusivos</li>
                          <li>🏆 Completá logros y ganás recompensas</li>
                          <li>👥 Referí amigos y ganás visitas bonus</li>
                          <li>📱 Mostrá tu QR en el local para sumar puntos</li>
                        </ul>
                      </div>

                      <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0;">
                        <p style="margin: 0; color: #92400e;">
                          <strong>💡 Tu código de referido:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;">${cliente.codigoReferido}</code>
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 14px; color: #78350f;">
                          Compartilo con tus amigos y ganás visitas bonus cuando se registren.
                        </p>
                      </div>

                      <div style="text-align: center; margin: 35px 0;">
                        <a href="${appUrl}/pass"
                           style="display: inline-block; padding: 14px 28px; background-color: #9333ea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                          Ver mi Pase de Fidelización
                        </a>
                      </div>

                      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
                      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                        Coques Bakery - Programa de Fidelización<br/>
                        <a href="${appUrl}" style="color: #9333ea; text-decoration: none;">Visitá nuestra app</a>
                      </p>
                    </div>
                `,
            }).catch(err => console.error('[COMPLETE-PHONE] Error enviando email de bienvenida:', err))
        }

        // Generar nuevo token JWT con el estado actualizado
        const token = jwt.sign(
            {
                clienteId: cliente.id,
                email: cliente.email,
                nombre: cliente.nombre,
                phone: cliente.phone,
                nivel: cliente.nivel?.nombre || 'Bronce',
            },
            process.env.JWT_SECRET || 'secret-key-coques-2024',
            { expiresIn: '30d' }
        )

        return NextResponse.json({
            success: true,
            token, // Incluir el nuevo token
            data: {
                id: cliente.id,
                phone: cliente.phone,
                email: cliente.email,
                nombre: cliente.nombre,
                estado: cliente.estado,
            }
        })
    } catch (error) {
        console.error('[COMPLETE-PHONE] Error completando teléfono:', error)

        // Proveer mensaje de error más específico
        let errorMessage = 'Error al actualizar teléfono'
        if (error instanceof Error) {
            errorMessage = error.message
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
