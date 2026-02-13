// src/app/api/logros/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarToken } from '@/lib/auth'

// GET /api/logros - Obtener logros del cliente y disponibles
export async function GET(req: NextRequest) {
    const startTime = Date.now()

    try {
        console.log('[API /api/logros GET] Iniciando petición')

        const clienteId = await verificarToken(req)
        if (!clienteId) {
            console.log('[API /api/logros GET] Token inválido o no proporcionado')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        console.log(`[API /api/logros GET] Cliente autenticado: ${clienteId}`)

        // Obtener logros obtenidos por el cliente
        const logrosObtenidos = await prisma.logroCliente.findMany({
            where: { clienteId },
            include: {
                logro: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        tipo: true,
                        icono: true,
                        puntosXp: true,
                    },
                },
            },
            orderBy: { obtenidoEn: 'desc' },
        })

        console.log(`[API /api/logros GET] Cliente tiene ${logrosObtenidos.length} logros obtenidos`)

        // Obtener todos los logros activos para mostrar "próximos"
        const todosLosLogros = await prisma.logro.findMany({
            where: { activo: true },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                tipo: true,
                icono: true,
                puntosXp: true,
                criterios: true,
            },
        })

        // Filtrar logros no obtenidos
        const idsObtenidos = new Set(logrosObtenidos.map((lo) => lo.logro.id))
        const logrosDisponibles = todosLosLogros.filter((l) => !idsObtenidos.has(l.id))

        console.log(`[API /api/logros GET] ${logrosDisponibles.length} logros disponibles para obtener`)

        // Calcular XP total
        const totalXp = logrosObtenidos.reduce((sum, lo) => sum + lo.logro.puntosXp, 0)

        console.log(`[API /api/logros GET] XP total del cliente: ${totalXp}`)

        // Contar logros no vistos
        const logrosNoVistos = logrosObtenidos.filter((lo) => !lo.visto).length
        console.log(`[API /api/logros GET] ${logrosNoVistos} logros no vistos`)

        // Formatear respuesta
        const obtenidos = logrosObtenidos.map((lo) => ({
            id: lo.logro.id,
            nombre: lo.logro.nombre,
            descripcion: lo.logro.descripcion,
            tipo: lo.logro.tipo,
            icono: lo.logro.icono,
            puntosXp: lo.logro.puntosXp,
            obtenidoEn: lo.obtenidoEn.toISOString(),
            visto: lo.visto,
        }))

        const disponibles = logrosDisponibles.map((l) => ({
            id: l.id,
            nombre: l.nombre,
            descripcion: l.descripcion,
            tipo: l.tipo,
            icono: l.icono,
            puntosXp: l.puntosXp,
            criterios: l.criterios,
        }))

        const duration = Date.now() - startTime
        console.log(`[API /api/logros GET] Completado en ${duration}ms`)

        return NextResponse.json({
            data: {
                obtenidos,
                disponibles,
                totalXp,
                logrosNoVistos,
            },
        })
    } catch (error) {
        const duration = Date.now() - startTime
        console.error(`[API /api/logros GET] Error después de ${duration}ms:`, error)
        console.error('[API /api/logros GET] Stack:', error instanceof Error ? error.stack : 'No stack available')

        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

// PATCH /api/logros/marcar-vistos - Marcar logros como vistos
export async function PATCH(req: NextRequest) {
    const startTime = Date.now()

    try {
        console.log('[API /api/logros PATCH] Iniciando petición')

        const clienteId = await verificarToken(req)
        if (!clienteId) {
            console.log('[API /api/logros PATCH] Token inválido o no proporcionado')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        console.log(`[API /api/logros PATCH] Cliente autenticado: ${clienteId}`)

        const { logroIds } = await req.json()

        if (!Array.isArray(logroIds) || logroIds.length === 0) {
            console.log('[API /api/logros PATCH] logroIds inválido o vacío')
            return NextResponse.json({ error: 'logroIds debe ser un array no vacío' }, { status: 400 })
        }

        console.log(`[API /api/logros PATCH] Marcando ${logroIds.length} logros como vistos`)

        // Marcar logros como vistos
        const result = await prisma.logroCliente.updateMany({
            where: {
                clienteId,
                logroId: { in: logroIds },
                visto: false,
            },
            data: {
                visto: true,
            },
        })

        console.log(`[API /api/logros PATCH] ${result.count} logros marcados como vistos`)

        const duration = Date.now() - startTime
        console.log(`[API /api/logros PATCH] Completado en ${duration}ms`)

        return NextResponse.json({
            data: {
                marcados: result.count,
            },
            message: 'Logros marcados como vistos',
        })
    } catch (error) {
        const duration = Date.now() - startTime
        console.error(`[API /api/logros PATCH] Error después de ${duration}ms:`, error)
        console.error('[API /api/logros PATCH] Stack:', error instanceof Error ? error.stack : 'No stack available')

        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
