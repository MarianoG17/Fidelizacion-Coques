// src/app/api/admin/beneficios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Listar todos los beneficios con estadísticas de uso
export async function GET(req: NextRequest) {
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const beneficios = await prisma.beneficio.findMany({
            include: {
                niveles: {
                    include: {
                        nivel: {
                            select: {
                                id: true,
                                nombre: true,
                                orden: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        eventos: true, // Cuenta cuántas veces se usó este beneficio
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        // Formatear los datos para incluir estadísticas
        const beneficiosConStats = beneficios.map((beneficio) => {
            const condiciones = beneficio.condiciones as any
            return {
                id: beneficio.id,
                nombre: beneficio.nombre,
                descripcionCaja: beneficio.descripcionCaja,
                tipo: condiciones?.tipo || 'OTRO',
                descuento: condiciones?.descuento || null,
                icono: condiciones?.icono || '🎁',
                descripcion: condiciones?.descripcion || '',
                maxPorDia: condiciones?.maxPorDia || 0,
                activo: beneficio.activo,
                requiereEstadoExterno: beneficio.requiereEstadoExterno,
                estadoExternoTrigger: beneficio.estadoExternoTrigger,
                niveles: beneficio.niveles.map((nb) => nb.nivel),
                usosTotal: beneficio._count.eventos,
                createdAt: beneficio.createdAt,
                updatedAt: beneficio.updatedAt,
            }
        })

        return NextResponse.json({ data: beneficiosConStats })
    } catch (error) {
        console.error('Error al obtener beneficios:', error)
        return NextResponse.json(
            { error: 'Error al obtener beneficios' },
            { status: 500 }
        )
    }
}

// POST - Crear nuevo beneficio
export async function POST(req: NextRequest) {
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const {
            nombre,
            descripcionCaja,
            tipo,
            descuento,
            icono,
            descripcion,
            maxPorDia,
            activo,
            requiereEstadoExterno,
            estadoExternoTrigger,
            localDestinoId,
            niveles, // Array de IDs de niveles
        } = body

        // Validaciones
        if (!nombre || !descripcionCaja || !tipo) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios' },
                { status: 400 }
            )
        }

        if (tipo === 'DESCUENTO' && (!descuento || descuento <= 0 || descuento > 1)) {
            return NextResponse.json(
                { error: 'El descuento debe estar entre 0.01 y 1 (1% a 100%)' },
                { status: 400 }
            )
        }

        // Construir objeto de condiciones
        const condiciones: any = {
            tipo,
            icono: icono || '🎁',
            descripcion: descripcion || '',
            maxPorDia: maxPorDia || 0,
        }

        if (tipo === 'DESCUENTO') {
            condiciones.descuento = descuento
        }

        // Crear el beneficio
        const nuevoBeneficio = await prisma.beneficio.create({
            data: {
                nombre,
                descripcionCaja,
                condiciones,
                activo: activo !== undefined ? activo : true,
                requiereEstadoExterno: requiereEstadoExterno || false,
                estadoExternoTrigger: estadoExternoTrigger || null,
                localDestinoId: localDestinoId || null,
                // Si se proporcionan niveles, crear las relaciones
                ...(niveles && niveles.length > 0
                    ? {
                        niveles: {
                            create: niveles.map((nivelId: string) => ({
                                nivelId,
                            })),
                        },
                    }
                    : {}),
            },
            include: {
                niveles: {
                    include: {
                        nivel: {
                            select: {
                                id: true,
                                nombre: true,
                                orden: true,
                            },
                        },
                    },
                },
            },
        })

        return NextResponse.json(
            {
                message: 'Beneficio creado exitosamente',
                data: nuevoBeneficio,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error al crear beneficio:', error)
        return NextResponse.json(
            { error: 'Error al crear beneficio' },
            { status: 500 }
        )
    }
}
