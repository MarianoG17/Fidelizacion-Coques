// src/app/api/auth/passkey/login-options/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'

/**
 * Genera opciones para autenticación con passkey
 * POST /api/auth/passkey/login-options
 */
export async function POST(req: NextRequest) {
    try {
        // Para passkeys, no necesitamos email previo
        // El dispositivo reconocerá automáticamente las credenciales disponibles

        const rpID = process.env.NEXT_PUBLIC_RP_ID || 'zona.com.ar'

        // Generar opciones de autenticación
        const options = await generateAuthenticationOptions({
            rpID,
            timeout: 60000, // 1 minuto
            userVerification: 'required', // Requiere biometría
            // No especificamos allowCredentials para permitir "discoverable credentials"
            // (el dispositivo mostrará todas las credenciales disponibles)
        })

        // Guardar challenge temporalmente
        if (!global.loginChallenges) {
            global.loginChallenges = new Map()
        }

        // Usar el challenge como key y guardar timestamp
        global.loginChallenges.set(options.challenge, Date.now())

        // Limpiar challenges antiguos (más de 2 minutos)
        const now = Date.now()
        for (const [challenge, timestamp] of global.loginChallenges.entries()) {
            if (now - timestamp > 120000) {
                global.loginChallenges.delete(challenge)
            }
        }

        console.log('[PASSKEY] Opciones de login generadas')

        return NextResponse.json(options)
    } catch (error) {
        console.error('[PASSKEY] Error generando opciones de login:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
