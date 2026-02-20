// src/app/api/admin/beneficios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Obtener un beneficio específico
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const beneficio = await prisma.beneficio.findUnique({
            where: { id: params.id },
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
                        eventos: true,
                    },
                },
            },
        })

        if (!beneficio) {
            return NextResponse.json(
                { error: 'Beneficio no encontrado' },
                { status: 404 }
            )
        }

        const condiciones = beneficio.condiciones as any

        const beneficioFormateado = {
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
            localDestinoId: beneficio.localDestinoId,
            niveles: beneficio.niveles.map((nb) => nb.nivel),
            usosTotal: beneficio._count.eventos,
            createdAt: beneficio.createdAt,
            updatedAt: beneficio.updatedAt,
        }

        return NextResponse.json({ data: beneficioFormateado })
    } catch (error) {
        console.error('Error al obtener beneficio:', error)
        return NextResponse.json(
            { error: 'Error al obtener beneficio' },
            { status: 500 }
        )
    }
}

// PATCH - Actualizar un beneficio
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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
            usoUnico,
            activo,
            requiereEstadoExterno,
            estadoExternoTrigger,
            localDestinoId,
            niveles, // Array de IDs de niveles
        } = body

        // Verificar que el beneficio existe
        const beneficioExistente = await prisma.beneficio.findUnique({
            where: { id: params.id },
        })

        if (!beneficioExistente) {
            return NextResponse.json(
                { error: 'Beneficio no encontrado' },
                { status: 404 }
            )
        }

        // Validaciones
        if (tipo === 'DESCUENTO' && descuento !== undefined && (descuento <= 0 || descuento > 1)) {
            return NextResponse.json(
                { error: 'El descuento debe estar entre 0.01 y 1 (1% a 100%)' },
                { status: 400 }
            )
        }

        // Construir objeto de condiciones actualizado
        const condicionesActuales = beneficioExistente.condiciones as any
        const condiciones: any = {
            tipo: tipo || condicionesActuales?.tipo || 'OTRO',
            icono: icono !== undefined ? icono : (condicionesActuales?.icono || '🎁'),
            descripcion: descripcion !== undefined ? descripcion : (condicionesActuales?.descripcion || ''),
            maxPorDia: maxPorDia !== undefined ? maxPorDia : (condicionesActuales?.maxPorDia || 0),
            usoUnico: usoUnico !== undefined ? usoUnico : (condicionesActuales?.usoUnico || false),
        }

        if (tipo === 'DESCUENTO' || condicionesActuales?.tipo === 'DESCUENTO') {
            condiciones.descuento = descuento !== undefined ? descuento : condicionesActuales?.descuento
        }

        // Preparar datos de actualización
        const dataActualizar: any = {
            ...(nombre !== undefined && { nombre }),
            ...(descripcionCaja !== undefined && { descripcionCaja }),
            condiciones,
            ...(activo !== undefined && { activo }),
            ...(requiereEstadoExterno !== undefined && { requiereEstadoExterno }),
            ...(estadoExternoTrigger !== undefined && { estadoExternoTrigger }),
            ...(localDestinoId !== undefined && { localDestinoId }),
        }

        // Si se proporcionan niveles, actualizar las relaciones
        if (niveles !== undefined) {
            // Primero eliminar las relaciones existentes
            await prisma.nivelBeneficio.deleteMany({
                where: { beneficioId: params.id },
            })

            // Luego crear las nuevas relaciones
            if (niveles.length > 0) {
                dataActualizar.niveles = {
                    create: niveles.map((nivelId: string) => ({
                        nivelId,
                    })),
                }
            }
        }

        // Actualizar el beneficio
        const beneficioActualizado = await prisma.beneficio.update({
            where: { id: params.id },
            data: dataActualizar,
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

        return NextResponse.json({
            message: 'Beneficio actualizado exitosamente',
            data: beneficioActualizado,
        })
    } catch (error) {
        console.error('Error al actualizar beneficio:', error)
        return NextResponse.json(
            { error: 'Error al actualizar beneficio' },
            { status: 500 }
        )
    }
}

// DELETE - Eliminar un beneficio (soft delete, marca como inactivo)
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        // Verificar que el beneficio existe
        const beneficio = await prisma.beneficio.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: {
                        eventos: true,
                    },
                },
            },
        })

        if (!beneficio) {
            return NextResponse.json(
                { error: 'Beneficio no encontrado' },
                { status: 404 }
            )
        }

        // Soft delete: marcar como inactivo
        const beneficioEliminado = await prisma.beneficio.update({
            where: { id: params.id },
            data: { activo: false },
        })

        return NextResponse.json({
            message: 'Beneficio desactivado exitosamente',
            data: beneficioEliminado,
            info: `Este beneficio fue usado ${beneficio._count.eventos} veces`,
        })
    } catch (error) {
        console.error('Error al eliminar beneficio:', error)
        return NextResponse.json(
            { error: 'Error al eliminar beneficio' },
            { status: 500 }
        )
    }
}
