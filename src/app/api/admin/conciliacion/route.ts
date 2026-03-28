// src/app/api/admin/conciliacion/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

// POST /api/admin/conciliacion - Confirmar y guardar una conciliación
export async function POST(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try {
        const body = await req.json()
        const { fechaDesde, fechaHasta, estadisticas, resultados, notas } = body

        if (!fechaDesde || !fechaHasta || !estadisticas || !resultados) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
        }

        const auditoria = await prisma.conciliacionAuditoria.create({
            data: {
                fechaDesde,
                fechaHasta,
                totalAyres: estadisticas.totalAyres,
                coincidencias: estadisticas.coincidencias,
                posibles: estadisticas.posiblesMatches,
                noEncontrados: estadisticas.noEncontrados,
                montoTotal: estadisticas.montoTotalAyres,
                resultados,
                notas: notas || null,
            }
        })

        return NextResponse.json({ success: true, id: auditoria.id })
    } catch (error) {
        console.error('[Conciliacion] Error al confirmar:', error)
        return NextResponse.json({ error: 'Error al guardar la conciliación' }, { status: 500 })
    }
}

// GET /api/admin/conciliacion - Historial de conciliaciones
export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try {
        const auditorias = await prisma.conciliacionAuditoria.findMany({
            orderBy: { confirmadoEn: 'desc' },
            take: 50,
            select: {
                id: true,
                fechaDesde: true,
                fechaHasta: true,
                totalAyres: true,
                coincidencias: true,
                posibles: true,
                noEncontrados: true,
                montoTotal: true,
                notas: true,
                confirmadoEn: true,
                resultados: true,
            }
        })

        return NextResponse.json({ success: true, data: auditorias })
    } catch (error) {
        console.error('[Conciliacion] Error al obtener historial:', error)
        return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
    }
}
