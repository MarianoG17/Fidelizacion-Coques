// src/app/api/auth/passkey/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import jwt from 'jsonwebtoken'

/**
 * Verifica autenticación con passkey y genera token JWT
 * POST /api/auth/passkey/login
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { credential } = body as {
            credential: AuthenticationResponseJSON
        }

        if (!credential || !credential.id) {
            return NextResponse.json(
                { error: 'Credencial requerida' },
                { status: 400 }
            )
        }

        // Buscar la credencial en la base de datos
        // El credential.id viene en formato base64url del navegador
        // Lo guardamos en ese mismo formato, así que buscamos directo
        console.log('[PASSKEY] Buscando credencial con ID:', credential.id.substring(0, 20) + '...')
        
        const passkey = await prisma.passkey.findUnique({
          where: { credentialId: credential.id },
            include: {
                cliente: {
                    include: {
                        nivel: true
                    }
                }
            }
        })

        if (!passkey) {
            console.error('[PASSKEY] Credencial no encontrada:', credentialIdBase64.substring(0, 20) + '...')
            return NextResponse.json(
                { error: 'Credencial no encontrada' },
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

        // Preparar authenticator para verificación
        const authenticator = {
            credentialID: passkey.credentialId, // string en base64
            credentialPublicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64')), // Uint8Array
            counter: Number(passkey.counter),
            transports: passkey.transports as AuthenticatorTransport[],
        }

        // Verificar la autenticación
        let verification
        try {
            verification = await verifyAuthenticationResponse({
                response: credential,
                expectedChallenge,
                expectedOrigin,
                expectedRPID: rpID,
                authenticator,
                requireUserVerification: true,
            })
        } catch (error) {
            console.error('[PASSKEY] Error en verificación de autenticación:', error)
            return NextResponse.json(
                { error: 'Verificación de credencial fallida' },
                { status: 400 }
            )
        }

        const { verified, authenticationInfo } = verification

        if (!verified) {
            return NextResponse.json(
                { error: 'Autenticación no verificada' },
                { status: 401 }
            )
        }

        // Actualizar contador y timestamp
        await prisma.passkey.update({
            where: { id: passkey.id },
            data: {
                counter: BigInt(authenticationInfo.newCounter),
                lastUsedAt: new Date()
            }
        })

        // Challenge ya fue verificado por @simplewebauthn/server

        // Generar JWT (igual que otros métodos de login)
        const token = jwt.sign(
            {
                clienteId: passkey.cliente.id,
                email: passkey.cliente.email,
                nombre: passkey.cliente.nombre,
                phone: passkey.cliente.phone,
                nivel: passkey.cliente.nivel?.nombre || 'Bronce',
            },
            process.env.JWT_SECRET || 'secret-key-coques-2024',
            { expiresIn: '30d' }
        )

        console.log('[PASSKEY] Login exitoso:', {
            clienteId: passkey.cliente.id,
            email: passkey.cliente.email,
            passkeyId: passkey.id,
            dispositivo: passkey.dispositivoNombre,
        })

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: passkey.cliente.id,
                email: passkey.cliente.email,
                nombre: passkey.cliente.nombre,
                phone: passkey.cliente.phone,
                nivel: passkey.cliente.nivel?.nombre || 'Bronce',
            }
        })
    } catch (error) {
        console.error('[PASSKEY] Error en login:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
