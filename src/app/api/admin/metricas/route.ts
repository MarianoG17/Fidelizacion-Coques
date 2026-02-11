// src/app/api/admin/metricas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getHaceNDias } from '@/lib/timezone'

export async function GET(req: NextRequest) {
    // Verificar admin key
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const [
            totalClientes,
            clientesActivos,
            visitasUltimos30Dias,
            distribucionNiveles,
            eventosProximos,
        ] = await Promise.all([
            // Total clientes
            prisma.cliente.count(),

            // Clientes activos
            prisma.cliente.count({ where: { estado: 'ACTIVO' } }),

            // Visitas últimos 30 días
            prisma.eventoScan.count({
                where: {
                    timestamp: { gte: getHaceNDias(30) },
                    contabilizada: true,
                    tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
                },
            }),

            // Distribución por niveles
            prisma.nivel.findMany({
                include: { _count: { select: { clientes: true } } },
                orderBy: { orden: 'asc' },
            }),

            // Eventos próximos
            prisma.eventoEspecial.count({
                where: {
                    estado: 'PUBLICADO',
                    fechaEvento: { gte: new Date() },
                },
            }),
        ])

        return NextResponse.json({
            data: {
                totalClientes,
                clientesActivos,
                visitasUltimos30Dias,
                eventosProximos,
                distribucionNiveles: distribucionNiveles.map((n) => ({
                    nivel: n.nombre,
                    count: n._count.clientes,
                })),
            },
        })
    } catch (error) {
        console.error('Error en métricas:', error)
        return NextResponse.json(
            { error: 'Error al obtener métricas' },
            { status: 500 }
        )
    }
}
