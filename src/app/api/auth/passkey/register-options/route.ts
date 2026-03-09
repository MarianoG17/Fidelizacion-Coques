// src/app/api/auth/passkey/register-options/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { generateRegistrationOptions } from '@simplewebauthn/server'

/**
 * Genera opciones para registrar una nueva credencial biométrica
 * POST /api/auth/passkey/register-options
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

        // Buscar cliente
        const cliente = await prisma.cliente.findUnique({
            where: { email: session.user.email },
            include: {
                passkeys: {
                    select: {
                        credentialId: true,
                        transports: true,
                    }
                }
            }
        })

        if (!cliente) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        // Obtener credenciales existentes (para excluirlas)
        const existingCredentials = cliente.passkeys.map(pk => ({
            id: Buffer.from(pk.credentialId, 'base64'),
            type: 'public-key' as const,
            transports: pk.transports as AuthenticatorTransport[],
        }))

        // Generar opciones de registro
        const rpID = process.env.NEXT_PUBLIC_RP_ID || 'zona.com.ar'
        const rpName = 'Fidelización Zona'
        const userID = new TextEncoder().encode(cliente.id) // Uint8Array
        const userName = cliente.email!
        const userDisplayName = cliente.nombre || cliente.email!

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID,
            userName,
            userDisplayName,
            timeout: 60000, // 1 minuto
            attestationType: 'none', // No requerimos attestation statement
            excludeCredentials: existingCredentials, // No permitir re-registro
            authenticatorSelection: {
                authenticatorAttachment: 'platform', // Solo sensores del dispositivo (no USB keys)
                userVerification: 'required', // Requerir biometría
                residentKey: 'preferred', // Preferir passkeys sin username
            },
            supportedAlgorithmIDs: [-7, -257], // ES256 y RS256
        })

        // Guardar challenge temporalmente en memoria
        // NOTA: En producción considera usar Redis o DB para persistencia
        if (!global.passkeyChallenges) {
            global.passkeyChallenges = new Map()
        }
        global.passkeyChallenges.set(userID, {
            challenge: options.challenge,
            timestamp: Date.now(),
        })

        // Limpiar challenges antiguos (más de 2 minutos)
        const now = Date.now()
        for (const [key, value] of global.passkeyChallenges.entries()) {
            if (now - value.timestamp > 120000) {
                global.passkeyChallenges.delete(key)
            }
        }

        console.log('[PASSKEY] Opciones de registro generadas para:', cliente.email)

        return NextResponse.json(options)
    } catch (error) {
        console.error('[PASSKEY] Error generando opciones de registro:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
