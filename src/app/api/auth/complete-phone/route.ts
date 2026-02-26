// src/app/api/auth/complete-phone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { normalizarTelefono } from '@/lib/phone'
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
            include: {
                nivel: true
            }
        })

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
        console.error('Error completando teléfono:', error)
        return NextResponse.json(
            { error: 'Error al actualizar teléfono' },
            { status: 500 }
        )
    }
}
