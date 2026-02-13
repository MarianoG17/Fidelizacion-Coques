// src/app/api/referidos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarToken } from '@/lib/auth'

// GET /api/referidos - Ver mis referidos
export async function GET(req: NextRequest) {
    try {
        const clienteId = await verificarToken(req)
        if (!clienteId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Obtener información del cliente con sus referidos
        const cliente = await prisma.cliente.findUnique({
            where: { id: clienteId },
            select: {
                codigoReferido: true,
                referidosActivados: true,
                referidos: {
                    select: {
                        nombre: true,
                        estado: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        })

        if (!cliente) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        }

        return NextResponse.json({
            data: {
                codigoReferido: cliente.codigoReferido,
                referidosActivados: cliente.referidosActivados,
                referidos: cliente.referidos,
            },
        })
    } catch (error) {
        console.error('Error al obtener referidos:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

// POST /api/referidos/validar - Validar código de referido (usado en registro)
export async function POST(req: NextRequest) {
    try {
        const { codigoReferido } = await req.json()

        if (!codigoReferido) {
            return NextResponse.json({ error: 'Código de referido requerido' }, { status: 400 })
        }

        // Buscar el cliente que tiene este código
        const referidor = await prisma.cliente.findUnique({
            where: { codigoReferido: codigoReferido.toUpperCase() },
            select: {
                id: true,
                nombre: true,
            },
        })

        if (!referidor) {
            return NextResponse.json({ error: 'Código de referido no válido' }, { status: 404 })
        }

        return NextResponse.json({
            data: {
                valido: true,
                referidorNombre: referidor.nombre,
            },
        })
    } catch (error) {
        console.error('Error al validar código de referido:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
