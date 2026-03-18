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

        // Extraer challenge del clientDataJSON (funciona en serverless)
        let expectedChallenge: string
        try {
            const clientDataJSON = Buffer.from(credential.response.clientDataJSON, 'base64').toString('utf-8')
            const clientData = JSON.parse(clientDataJSON)
            expectedChallenge = clientData.challenge

            if (!expectedChallenge) {
                throw new Error('Challenge not found in clientData')
            }
        } catch (error) {
            console.error('[PASSKEY] Error extrayendo challenge:', error)
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

        // IMPORTANTE: Usar el mismo formato que en login
        // El credential.id del navegador viene en base64url, guardamos ese
        const credentialIdBase64 = credential.id // Ya viene en base64url del navegador
        const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64')

        console.log('[PASSKEY] Guardando credencial con ID:', credentialIdBase64.substring(0, 20) + '...')

        // Verificar si ya existe esta credencial
        const existingPasskey = await prisma.passkey.findUnique({
            where: { credentialId: credentialIdBase64 }
        })

        let passkey

        if (existingPasskey) {
            // ✅ MEJORADO: Si ya existe, actualizar en vez de rechazar
            // Esto previene errores cuando un registro anterior falló parcialmente
            console.log('[PASSKEY] Credencial ya existe, actualizando...', {
                passkeyId: existingPasskey.id,
                clienteId: existingPasskey.clienteId,
                clienteActual: cliente.id,
            })

            // Verificar que sea del mismo cliente (seguridad)
            if (existingPasskey.clienteId !== cliente.id) {
                return NextResponse.json(
                    { error: 'Esta credencial pertenece a otro usuario' },
                    { status: 403 }
                )
            }

            // Actualizar la credencial existente
            passkey = await prisma.passkey.update({
                where: { id: existingPasskey.id },
                data: {
                    publicKey: publicKeyBase64,
                    counter: BigInt(counter),
                    transports: (credential.response as any).transports || [],
                    dispositivoNombre: deviceName || existingPasskey.dispositivoNombre,
                    userAgent: req.headers.get('user-agent') || undefined,
                    lastUsedAt: new Date(), // Actualizar timestamp
                }
            })

            console.log('[PASSKEY] Credencial actualizada exitosamente')
        } else {
            // Obtener transports del credential
            const transports = (credential.response as any).transports || []

            // Crear nueva credencial
            passkey = await prisma.passkey.create({
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

            console.log('[PASSKEY] Credencial creada exitosamente')
        }

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
