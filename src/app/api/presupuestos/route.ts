// src/app/api/presupuestos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generarCodigoPresupuesto(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = randomBytes(3).toString('hex').toUpperCase()
    return `PRE-${timestamp}-${random}`
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            clienteId,
            nombreCliente,
            telefonoCliente,
            emailCliente,
            items,
            precioTotal,
            descuento,
            fechaEntrega,
            horaEntrega,
            camposPendientes,
            notasCliente,
            notasInternas,
            creadoPor
        } = body

        // Validaciones básicas
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'Debe incluir al menos un producto en el presupuesto' },
                { status: 400 }
            )
        }

        if (typeof precioTotal !== 'number' || precioTotal < 0) {
            return NextResponse.json(
                { error: 'El precio total debe ser un número válido' },
                { status: 400 }
            )
        }

        // Generar código único
        const codigo = generarCodigoPresupuesto()

        // Crear presupuesto
        const presupuesto = await prisma.presupuesto.create({
            data: {
                codigo,
                clienteId: clienteId || null,
                nombreCliente: nombreCliente || null,
                telefonoCliente: telefonoCliente || null,
                emailCliente: emailCliente || null,
                items: items,
                precioTotal,
                descuento: descuento || 0,
                fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
                horaEntrega: horaEntrega || null,
                camposPendientes: camposPendientes || null,
                notasCliente: notasCliente || null,
                notasInternas: notasInternas || null,
                creadoPor: creadoPor || null,
                estado: 'PENDIENTE'
            },
            include: {
                cliente: {
                    select: {
                        id: true,
                        nombre: true,
                        phone: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            presupuesto,
            mensaje: `Presupuesto creado exitosamente con código: ${codigo}`
        })

    } catch (error: any) {
        console.error('Error al crear presupuesto:', error)
        return NextResponse.json(
            { error: 'Error al crear presupuesto', detalles: error.message },
            { status: 500 }
        )
    }
}

// GET /api/presupuestos - Listar presupuestos (con filtros opcionales)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const clienteId = searchParams.get('clienteId')
        const estado = searchParams.get('estado')
        const codigo = searchParams.get('codigo')

        const where: any = {}

        if (clienteId) {
            where.clienteId = clienteId
        }

        if (estado && ['PENDIENTE', 'COMPLETO', 'CONFIRMADO', 'CANCELADO'].includes(estado)) {
            where.estado = estado
        }

        if (codigo) {
            where.codigo = codigo
        }

        const presupuestos = await prisma.presupuesto.findMany({
            where,
            include: {
                cliente: {
                    select: {
                        id: true,
                        nombre: true,
                        phone: true,
                        email: true
                    }
                }
            },
            orderBy: {
                creadoEn: 'desc'
            }
        })

        return NextResponse.json({
            success: true,
            presupuestos,
            total: presupuestos.length
        })

    } catch (error: any) {
        console.error('Error al listar presupuestos:', error)
        return NextResponse.json(
            { error: 'Error al listar presupuestos', detalles: error.message },
            { status: 500 }
        )
    }
}
