// src/app/api/auth/passkey/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'

/**
 * Verifica y guarda una nueva credencial biométrica
 * POST /api/auth/passkey/register
 */
export async function POST(req: NextRequest) {
    try {
        // Verificar autenticación
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const body = await req.json()
        const { credential, deviceName } = body as {
            credential: RegistrationResponseJSON
            deviceName?: string
        }

        if (!credential) {
            return NextResponse.json(
                { error: 'Credencial requerida' },
                { status: 400 }
            )
        }

        // Buscar cliente
        const cliente = await prisma.cliente.findUnique({
            where: { email: session.user.email }
        })

        if (!cliente) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        // Extraer challenge directamente de la credencial
        // (funciona en serverless - no depende de memoria compartida)
        const expectedChallenge = credential.response.challenge

        if (!expectedChallenge) {
            return NextResponse.json(
                { error: 'Challenge no encontrado en la credencial' },
                { status: 400 }
            )
        }

        // Configuración
        const rpID = process.env.NEXT_PUBLIC_RP_ID || 'zona.com.ar'
        const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://zona.com.ar'

        // Verificar la credencial
        let verification
        try {
            verification = await verifyRegistrationResponse({
                response: credential,
                expectedChallenge,
                expectedOrigin,
                expectedRPID: rpID,
                requireUserVerification: true, // Requerir biometría
            })
        } catch (error) {
            console.error('[PASSKEY] Error en verificación:', error)
            return NextResponse.json(
                { error: 'Verificación de credencial fallida' },
                { status: 400 }
            )
        }

        const { verified, registrationInfo } = verification

        if (!verified || !registrationInfo) {
            return NextResponse.json(
                { error: 'Credencial no verificada' },
                { status: 400 }
            )
        }

        // Extraer información de la credencial
        const {
            credentialID,
            credentialPublicKey,
            counter,
            credentialBackedUp,
            credentialDeviceType,
        } = registrationInfo

        // Convertir a base64 para almacenar en DB
        const credentialIdBase64 = Buffer.from(credentialID).toString('base64')
        const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64')

        // Verificar si ya existe esta credencial
        const existingPasskey = await prisma.passkey.findUnique({
            where: { credentialId: credentialIdBase64 }
        })

        if (existingPasskey) {
            return NextResponse.json(
                { error: 'Esta credencial ya está registrada' },
                { status: 400 }
            )
        }

        // Obtener transports del credential
        const transports = (credential.response as any).transports || []

        // Guardar en DB
        const passkey = await prisma.passkey.create({
            data: {
                clienteId: cliente.id,
                credentialId: credentialIdBase64,
                publicKey: publicKeyBase64,
                counter: BigInt(counter),
                transports,
                dispositivoNombre: deviceName || 'Mi dispositivo',
                userAgent: req.headers.get('user-agent') || undefined,
            }
        })

        // Challenge ya fue verificado por @simplewebauthn/server

        console.log('[PASSKEY] Credencial registrada exitosamente:', {
            clienteId: cliente.id,
            passkeyId: passkey.id,
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
        })

        return NextResponse.json({
            success: true,
            message: 'Biometría activada exitosamente',
            passkey: {
                id: passkey.id,
                dispositivoNombre: passkey.dispositivoNombre,
                createdAt: passkey.createdAt,
            }
        })
    } catch (error) {
        console.error('[PASSKEY] Error registrando credencial:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
