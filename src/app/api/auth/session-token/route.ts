// src/app/api/auth/session-token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

/**
 * Endpoint para generar token JWT compatible con el sistema existente
 * a partir de una sesión de NextAuth (Google OAuth)
 * POST /api/auth/session-token
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

        // Buscar cliente en la base de datos
        const cliente = await prisma.cliente.findUnique({
            where: { email: session.user.email },
            include: { nivel: true }
        })

        if (!cliente) {
            return NextResponse.json(
                { error: 'Cliente no encontrado' },
                { status: 404 }
            )
        }

        // Verificar que el teléfono esté completo
        if (cliente.phone.includes('TEMP')) {
            return NextResponse.json(
                { error: 'Debe completar el teléfono primero' },
                { status: 400 }
            )
        }

        // Generar token JWT compatible con el sistema existente
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
            token,
            cliente: {
                id: cliente.id,
                email: cliente.email,
                nombre: cliente.nombre,
                phone: cliente.phone,
                nivel: cliente.nivel?.nombre,
            }
        })
    } catch (error) {
        console.error('Error generando token de sesión:', error)
        return NextResponse.json(
            { error: 'Error al generar token' },
            { status: 500 }
        )
    }
}
