// src/app/api/auth/complete-phone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { normalizarTelefono } from '@/lib/phone'

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

        if (!phone) {
            return NextResponse.json(
                { error: 'El teléfono es requerido' },
                { status: 400 }
            )
        }

        // Normalizar teléfono
        const normalizedPhone = normalizarTelefono(phone)

        if (!normalizedPhone) {
            return NextResponse.json(
                { error: 'Formato de teléfono inválido' },
                { status: 400 }
            )
        }

        // Verificar que el teléfono no esté en uso
        const existingClient = await prisma.cliente.findUnique({
            where: { phone: normalizedPhone }
        })

        if (existingClient && existingClient.email !== session.user.email) {
            return NextResponse.json(
                { error: 'Este teléfono ya está registrado en otra cuenta' },
                { status: 400 }
            )
        }

        // Actualizar cliente con el teléfono
        const cliente = await prisma.cliente.update({
            where: { email: session.user.email },
            data: {
                phone: normalizedPhone,
                estado: 'ACTIVO', // Activar cuenta al completar teléfono
            },
            select: {
                id: true,
                phone: true,
                email: true,
                nombre: true,
                estado: true,
            }
        })

        return NextResponse.json({
            success: true,
            data: cliente
        })
    } catch (error) {
        console.error('Error completando teléfono:', error)
        return NextResponse.json(
            { error: 'Error al actualizar teléfono' },
            { status: 500 }
        )
    }
}
