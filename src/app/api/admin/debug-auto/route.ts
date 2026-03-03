// src/app/api/admin/debug-auto/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        // Verificar admin key
        const adminKey = req.headers.get('x-admin-key')
        if (adminKey !== process.env.ADMIN_KEY) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = req.nextUrl
        const phone = searchParams.get('phone')

        if (!phone) {
            return NextResponse.json({ error: 'Phone requerido' }, { status: 400 })
        }

        // Buscar cliente y sus autos
        const cliente = await prisma.cliente.findUnique({
            where: { phone },
            select: {
                id: true,
                nombre: true,
                phone: true,
                email: true,
                autos: {
                    include: {
                        estadoActual: true,
                    },
                    orderBy: {
                        updatedAt: 'desc',
                    },
                },
            },
        })

        if (!cliente) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            cliente: {
                nombre: cliente.nombre,
                phone: cliente.phone,
                email: cliente.email,
            },
            autos: cliente.autos.map(auto => ({
                patente: auto.patente,
                marca: auto.marca,
                modelo: auto.modelo,
                alias: auto.alias,
                activo: auto.activo,
                estadoActual: auto.estadoActual
                    ? {
                        estado: auto.estadoActual.estado,
                        updatedAt: auto.estadoActual.updatedAt,
                    }
                    : null,
            })),
        })
    } catch (error) {
        console.error('Error en debug-auto:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
