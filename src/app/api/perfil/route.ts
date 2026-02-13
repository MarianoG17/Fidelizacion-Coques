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

        // Use raw query to avoid Prisma type issues during transition
        const cliente: any = await prisma.$queryRaw`
            SELECT 
                c.id,
                c.nombre,
                c.email,
                c.phone,
                c."fechaCumpleanos",
                c."codigoReferido",
                c."referidosActivados",
                c.estado,
                c."createdAt",
                n.nombre as "nivelNombre",
                n."descripcionBeneficios"
            FROM "Cliente" c
            LEFT JOIN "Nivel" n ON c."nivelId" = n.id
            WHERE c.id = ${clienteId}::text
            LIMIT 1
        `

        if (!cliente || cliente.length === 0) {
            console.log(`[API /api/perfil GET] Cliente ${clienteId} no encontrado`)
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        }

        const clienteData = cliente[0]

        console.log(`[API /api/perfil GET] Perfil encontrado para: ${clienteData.nombre}`)

        // Calculate total XP from achievements
        let totalXp = 0
        try {
            const xpResult: any = await prisma.$queryRaw`
                SELECT COALESCE(SUM(l."puntosXp"), 0) as "totalXp"
                FROM "LogroCliente" lc
                INNER JOIN "Logro" l ON lc."logroId" = l.id
                WHERE lc."clienteId" = ${clienteId}::text
            `
            
            if (xpResult && xpResult.length > 0) {
                totalXp = Number(xpResult[0].totalXp) || 0
            }
            console.log(`[API /api/perfil GET] Total XP calculado: ${totalXp}`)
        } catch (error) {
            console.error('[API /api/perfil GET] Error calculando XP:', error)
            // Continue without XP if there's an error
        }

        const duration = Date.now() - startTime
        console.log(`[API /api/perfil GET] Completado en ${duration}ms`)

        return NextResponse.json({
            data: {
                nombre: clienteData.nombre || '',
                email: clienteData.email || '',
                telefono: clienteData.phone || '',
                phone: clienteData.phone || '',
                fechaCumpleanos: clienteData.fechaCumpleanos 
                    ? new Date(clienteData.fechaCumpleanos).toISOString().split('T')[0]
                    : null,
                codigoReferido: clienteData.codigoReferido || null,
                referidosActivados: clienteData.referidosActivados || 0,
                estado: clienteData.estado || 'ACTIVO',
                createdAt: clienteData.createdAt 
                    ? new Date(clienteData.createdAt).toISOString()
                    : new Date().toISOString(),
                totalXp: totalXp,
                nivel: {
                    nombre: clienteData.nivelNombre || 'Bronce',
                    descripcionBeneficios: clienteData.descripcionBeneficios || ''
                },
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

        // Validations
        if (nombre !== undefined) {
            if (!nombre || nombre.trim().length < 2) {
                console.log('[API /api/perfil PATCH] Nombre inválido')
                return NextResponse.json({ error: 'Nombre debe tener al menos 2 caracteres' }, { status: 400 })
            }
        }

        if (email !== undefined && email) {
            if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                console.log('[API /api/perfil PATCH] Email inválido')
                return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
            }

            // Check if email is already in use
            const existente: any = await prisma.$queryRaw`
                SELECT id FROM "Cliente"
                WHERE email = ${email}
                AND id != ${clienteId}::text
                LIMIT 1
            `

            if (existente && existente.length > 0) {
                console.log(`[API /api/perfil PATCH] Email ${email} ya en uso`)
                return NextResponse.json({ error: 'El email ya está en uso' }, { status: 409 })
            }
        }

        if (fechaCumpleanos !== undefined && fechaCumpleanos) {
            const fecha = new Date(fechaCumpleanos)
            if (isNaN(fecha.getTime())) {
                console.log('[API /api/perfil PATCH] Fecha de cumpleaños inválida')
                return NextResponse.json({ error: 'Fecha de cumpleaños inválida' }, { status: 400 })
            }
        }

        // Build update query dynamically
        const updates: string[] = []
        const values: any[] = []
        let paramIndex = 1

        if (nombre !== undefined) {
            updates.push(`nombre = $${paramIndex}`)
            values.push(nombre.trim())
            paramIndex++
        }

        if (email !== undefined) {
            updates.push(`email = $${paramIndex}`)
            values.push(email || null)
            paramIndex++
        }

        if (fechaCumpleanos !== undefined) {
            updates.push(`"fechaCumpleanos" = $${paramIndex}`)
            values.push(fechaCumpleanos ? new Date(fechaCumpleanos) : null)
            paramIndex++
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No hay datos para actualizar' }, { status: 400 })
        }

        // Execute update
        values.push(clienteId)
        const updateQuery = `
            UPDATE "Cliente"
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING nombre, email, phone, "fechaCumpleanos"
        `

        const result: any = await prisma.$queryRawUnsafe(updateQuery, ...values)

        if (!result || result.length === 0) {
            return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })
        }

        const cliente = result[0]

        console.log(`[API /api/perfil PATCH] Perfil actualizado exitosamente`)

        const duration = Date.now() - startTime
        console.log(`[API /api/perfil PATCH] Completado en ${duration}ms`)

        return NextResponse.json({
            data: {
                nombre: cliente.nombre,
                email: cliente.email,
                phone: cliente.phone,
                fechaCumpleanos: cliente.fechaCumpleanos 
                    ? new Date(cliente.fechaCumpleanos).toISOString().split('T')[0]
                    : null,
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
