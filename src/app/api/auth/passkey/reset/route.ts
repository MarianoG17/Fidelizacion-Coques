// src/app/api/auth/passkey/reset/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

/**
 * Elimina todas las passkeys del usuario autenticado
 * Útil para resolver problemas de passkeys fallidas o duplicadas
 * POST /api/auth/passkey/reset
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
                    select: { id: true }
                }
            }
        })

        if (!cliente) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        // Contar passkeys antes de eliminar
        const countBefore = cliente.passkeys.length

        // Eliminar todas las passkeys del usuario
        await prisma.passkey.deleteMany({
            where: { clienteId: cliente.id }
        })

        console.log('[PASSKEY] Reset exitoso:', {
            clienteId: cliente.id,
            email: cliente.email,
            passkeysEliminadas: countBefore,
        })

        return NextResponse.json({
            success: true,
            message: 'Passkeys eliminadas exitosamente',
            count: countBefore,
        })
    } catch (error) {
        console.error('[PASSKEY] Error en reset:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

/**
 * Obtener lista de passkeys del usuario (opcional, para mostrar en UI)
 * GET /api/auth/passkey/reset
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const cliente = await prisma.cliente.findUnique({
            where: { email: session.user.email },
            include: {
                passkeys: {
                    select: {
                        id: true,
                        dispositivoNombre: true,
                        createdAt: true,
                        lastUsedAt: true,
                        userAgent: true,
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!cliente) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            passkeys: cliente.passkeys,
            count: cliente.passkeys.length,
        })
    } catch (error) {
        console.error('[PASSKEY] Error listando passkeys:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
