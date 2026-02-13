// src/app/api/perfil/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarToken } from '@/lib/auth'

// GET /api/perfil - Obtener perfil del cliente
export async function GET(req: NextRequest) {
    const startTime = Date.now()

    try {
        console.log('[API /api/perfil GET] Iniciando petición')

        const clienteId = await verificarToken(req)
        if (!clienteId) {
            console.log('[API /api/perfil GET] Token inválido o no proporcionado')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        console.log(`[API /api/perfil GET] Cliente autenticado: ${clienteId}`)

        const cliente = await prisma.cliente.findUnique({
            where: { id: clienteId },
            select: {
                nombre: true,
                email: true,
                phone: true,
                fechaCumpleanos: true,
                codigoReferido: true,
                referidosActivados: true,
                estado: true,
                createdAt: true,
                nivel: {
                    select: {
                        nombre: true,
                        orden: true,
                        descripcionBeneficios: true,
                    },
                },
                logros: {
                    select: {
                        logro: {
                            select: {
                                puntosXp: true,
                            },
                        },
                    },
                },
            },
        })

        if (!cliente) {
            console.log(`[API /api/perfil GET] Cliente ${clienteId} no encontrado`)
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        }

        console.log(`[API /api/perfil GET] Perfil encontrado para: ${cliente.nombre}`)

        // Calculate total XP from achievements
        const totalXp = cliente.logros.reduce((sum: number, logroCliente: any) => {
            return sum + (logroCliente.logro.puntosXp || 0)
        }, 0)

        console.log(`[API /api/perfil GET] Total XP calculado: ${totalXp}`)

        const duration = Date.now() - startTime
        console.log(`[API /api/perfil GET] Completado en ${duration}ms`)

        return NextResponse.json({
            data: {
                nombre: cliente.nombre,
                email: cliente.email,
                telefono: cliente.phone,
                phone: cliente.phone,
                fechaCumpleanos: cliente.fechaCumpleanos?.toISOString().split('T')[0], // YYYY-MM-DD
                codigoReferido: cliente.codigoReferido,
                referidosActivados: cliente.referidosActivados,
                estado: cliente.estado,
                createdAt: cliente.createdAt.toISOString(),
                totalXp: totalXp,
                nivel: cliente.nivel,
            },
        })
    } catch (error) {
        const duration = Date.now() - startTime
        console.error(`[API /api/perfil GET] Error después de ${duration}ms:`, error)
        console.error('[API /api/perfil GET] Stack:', error instanceof Error ? error.stack : 'No stack available')

        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

// PATCH /api/perfil - Actualizar perfil del cliente
export async function PATCH(req: NextRequest) {
    const startTime = Date.now()

    try {
        console.log('[API /api/perfil PATCH] Iniciando petición')

        const clienteId = await verificarToken(req)
        if (!clienteId) {
            console.log('[API /api/perfil PATCH] Token inválido o no proporcionado')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        console.log(`[API /api/perfil PATCH] Cliente autenticado: ${clienteId}`)

        const body = await req.json()
        const { nombre, email, fechaCumpleanos } = body

        console.log(`[API /api/perfil PATCH] Datos a actualizar:`, { nombre, email, fechaCumpleanos })

        // Construir objeto de actualización solo con campos proporcionados
        const dataToUpdate: any = {}

        if (nombre !== undefined) {
            if (!nombre || nombre.trim().length < 2) {
                console.log('[API /api/perfil PATCH] Nombre inválido')
                return NextResponse.json({ error: 'Nombre debe tener al menos 2 caracteres' }, { status: 400 })
            }
            dataToUpdate.nombre = nombre.trim()
        }

        if (email !== undefined) {
            if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                console.log('[API /api/perfil PATCH] Email inválido')
                return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
            }
            dataToUpdate.email = email || null
        }

        if (fechaCumpleanos !== undefined) {
            if (fechaCumpleanos) {
                const fecha = new Date(fechaCumpleanos)
                if (isNaN(fecha.getTime())) {
                    console.log('[API /api/perfil PATCH] Fecha de cumpleaños inválida')
                    return NextResponse.json({ error: 'Fecha de cumpleaños inválida' }, { status: 400 })
                }
                dataToUpdate.fechaCumpleanos = fecha
            } else {
                dataToUpdate.fechaCumpleanos = null
            }
        }

        // Si el email cambió, verificar que no esté en uso
        if (dataToUpdate.email) {
            const existente = await prisma.cliente.findFirst({
                where: {
                    email: dataToUpdate.email,
                    id: { not: clienteId },
                },
            })

            if (existente) {
                console.log(`[API /api/perfil PATCH] Email ${dataToUpdate.email} ya en uso`)
                return NextResponse.json({ error: 'El email ya está en uso' }, { status: 409 })
            }
        }

        // Actualizar
        const cliente = await prisma.cliente.update({
            where: { id: clienteId },
            data: dataToUpdate,
            select: {
                nombre: true,
                email: true,
                phone: true,
                fechaCumpleanos: true,
            },
        })

        console.log(`[API /api/perfil PATCH] Perfil actualizado exitosamente`)

        const duration = Date.now() - startTime
        console.log(`[API /api/perfil PATCH] Completado en ${duration}ms`)

        return NextResponse.json({
            data: {
                nombre: cliente.nombre,
                email: cliente.email,
                phone: cliente.phone,
                fechaCumpleanos: cliente.fechaCumpleanos?.toISOString().split('T')[0],
            },
            message: 'Perfil actualizado exitosamente',
        })
    } catch (error) {
        const duration = Date.now() - startTime
        console.error(`[API /api/perfil PATCH] Error después de ${duration}ms:`, error)
        console.error('[API /api/perfil PATCH] Stack:', error instanceof Error ? error.stack : 'No stack available')

        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
