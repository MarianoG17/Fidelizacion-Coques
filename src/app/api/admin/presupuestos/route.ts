// src/app/api/admin/presupuestos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// GET /api/admin/presupuestos - Listar todos los presupuestos para admin
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams
        const estado = searchParams.get('estado')
        const busqueda = searchParams.get('busqueda')
        const desde = searchParams.get('desde')
        const hasta = searchParams.get('hasta')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        const where: any = {}

        // Filtro por estado
        if (estado && ['PENDIENTE', 'COMPLETO', 'CONFIRMADO', 'CANCELADO'].includes(estado)) {
            where.estado = estado
        }

        // Búsqueda por código, nombre, teléfono o email
        if (busqueda) {
            where.OR = [
                { codigo: { contains: busqueda, mode: 'insensitive' } },
                { nombreCliente: { contains: busqueda, mode: 'insensitive' } },
                { telefonoCliente: { contains: busqueda, mode: 'insensitive' } },
                { emailCliente: { contains: busqueda, mode: 'insensitive' } }
            ]
        }

        // Filtro por rango de fechas
        if (desde || hasta) {
            where.creadoEn = {}
            if (desde) where.creadoEn.gte = new Date(desde)
            if (hasta) where.creadoEn.lte = new Date(hasta)
        }

        // Contar total
        const total = await prisma.presupuesto.count({ where })

        // Obtener presupuestos con paginación
        const presupuestos = await prisma.presupuesto.findMany({
            where,
            include: {
                cliente: {
                    select: {
                        id: true,
                        nombre: true,
                        phone: true,
                        email: true,
                        nivel: {
                            select: {
                                nombre: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                creadoEn: 'desc'
            },
            skip: (page - 1) * limit,
            take: limit
        })

        // Calcular estadísticas
        const stats = await prisma.presupuesto.groupBy({
            by: ['estado'],
            _count: true,
            _sum: {
                precioTotal: true
            }
        })

        return NextResponse.json({
            success: true,
            presupuestos,
            paginacion: {
                pagina: page,
                limite: limit,
                total,
                totalPaginas: Math.ceil(total / limit)
            },
            estadisticas: stats
        })

    } catch (error: any) {
        console.error('Error al listar presupuestos (admin):', error)
        return NextResponse.json(
            { error: 'Error al listar presupuestos', detalles: error.message },
            { status: 500 }
        )
    }
}
