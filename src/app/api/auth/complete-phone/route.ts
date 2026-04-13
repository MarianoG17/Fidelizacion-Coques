// src/app/api/auth/complete-phone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { normalizarTelefono } from '@/lib/phone'
import { generarSecretoOTP } from '@/lib/otp'
import { sendEmail } from '@/lib/email'
import { getPlantilla, aplicarVars, buildHtmlPlantilla } from '@/lib/email-plantillas'
import { signClienteJWT } from '@/lib/auth'

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
            getPlantilla('bienvenida').then(plantilla => {
                const nombre = (cliente.nombre || 'cliente').split(' ')[0]
                return sendEmail({
                    to: cliente.email!,
                    subject: aplicarVars(plantilla.asunto, { nombre }),
                    html: buildHtmlPlantilla(aplicarVars(plantilla.cuerpo, { nombre })),
                })
            }).catch(err => console.error('[COMPLETE-PHONE] Error enviando email de bienvenida:', err))
        }

        // Generar nuevo token JWT con el estado actualizado (mismo método que /api/pass)
        const token = await signClienteJWT({
            clienteId: cliente.id,
            phone: cliente.phone,
        })

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
