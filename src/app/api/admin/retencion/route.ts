// src/app/api/admin/retencion/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    // Fechas de referencia
    const ahora = new Date()
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
    const hace90 = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000)

    // 1. Tasa de retorno: clientes con >= 2 visitas reales vs >= 1 visita
    const [totalConUnaVisita, totalConDosOMas] = await Promise.all([
        prisma.eventoScan.groupBy({
            by: ['clienteId'],
            where: { tipoEvento: 'VISITA', contabilizada: true },
            _count: { clienteId: true },
            having: { clienteId: { _count: { gte: 1 } } },
        }),
        prisma.eventoScan.groupBy({
            by: ['clienteId'],
            where: { tipoEvento: 'VISITA', contabilizada: true },
            _count: { clienteId: true },
            having: { clienteId: { _count: { gte: 2 } } },
        }),
    ])

    const tasaRetorno = totalConUnaVisita.length > 0
        ? Math.round((totalConDosOMas.length / totalConUnaVisita.length) * 100)
        : 0

    // 2. Frecuencia promedio por nivel (días entre visitas)
    const frecuenciaPorNivel: Record<string, { nombre: string; promedioDias: number; clientesCount: number }> = {}

    const visitas = await prisma.eventoScan.findMany({
        where: { tipoEvento: 'VISITA', contabilizada: true },
        select: {
            clienteId: true,
            timestamp: true,
            cliente: { select: { nivel: { select: { nombre: true } } } },
        },
        orderBy: { timestamp: 'asc' },
    })

    // Agrupar visitas por cliente
    const visitasPorCliente: Record<string, Date[]> = {}
    for (const v of visitas) {
        if (!visitasPorCliente[v.clienteId]) visitasPorCliente[v.clienteId] = []
        visitasPorCliente[v.clienteId].push(v.timestamp)
    }

    // Calcular intervalos promedio por nivel
    const intervalosPorNivel: Record<string, { suma: number; count: number; nivel: string }> = {}
    for (const v of visitas) {
        const nivel = v.cliente.nivel?.nombre || 'Sin nivel'
        if (!intervalosPorNivel[nivel]) intervalosPorNivel[nivel] = { suma: 0, count: 0, nivel }
    }

    for (const [clienteId, timestamps] of Object.entries(visitasPorCliente)) {
        if (timestamps.length < 2) continue
        const clienteVisitas = visitas.filter(v => v.clienteId === clienteId)
        const nivel = clienteVisitas[0]?.cliente.nivel?.nombre || 'Sin nivel'
        for (let i = 1; i < timestamps.length; i++) {
            const dias = (timestamps[i].getTime() - timestamps[i - 1].getTime()) / (1000 * 60 * 60 * 24)
            if (intervalosPorNivel[nivel]) {
                intervalosPorNivel[nivel].suma += dias
                intervalosPorNivel[nivel].count += 1
            }
        }
    }

    const frecuencia = Object.values(intervalosPorNivel).map(n => ({
        nivel: n.nivel,
        promedioDias: n.count > 0 ? Math.round(n.suma / n.count) : null,
    })).filter(n => n.promedioDias !== null)

    // 3. Clientes en riesgo: visitaron entre hace 90 y hace 30 días, pero NO en los últimos 30 días
    const clientesConVisitaReciente = await prisma.eventoScan.groupBy({
        by: ['clienteId'],
        where: { tipoEvento: 'VISITA', contabilizada: true, timestamp: { gte: hace30 } },
    })
    const idsRecientes = new Set(clientesConVisitaReciente.map(r => r.clienteId))

    const clientesConVisitaAnterior = await prisma.eventoScan.groupBy({
        by: ['clienteId'],
        where: { tipoEvento: 'VISITA', contabilizada: true, timestamp: { gte: hace90, lt: hace30 } },
    })
    const idsEnRiesgo = clientesConVisitaAnterior
        .map(r => r.clienteId)
        .filter(id => !idsRecientes.has(id))

    const clientesEnRiesgo = await prisma.cliente.findMany({
        where: { id: { in: idsEnRiesgo }, estado: 'ACTIVO' },
        select: {
            id: true,
            nombre: true,
            email: true,
            phone: true,
            nivel: { select: { nombre: true } },
            eventos: {
                where: { tipoEvento: 'VISITA', contabilizada: true },
                orderBy: { timestamp: 'desc' },
                take: 1,
                select: { timestamp: true },
            },
        },
        orderBy: { nombre: 'asc' },
    })

    const enRiesgo = clientesEnRiesgo.map(c => ({
        id: c.id,
        nombre: c.nombre,
        email: c.email,
        phone: c.phone,
        nivel: c.nivel?.nombre || 'Sin nivel',
        ultimaVisita: c.eventos[0]?.timestamp || null,
    }))

    return NextResponse.json({
        tasaRetorno,
        totalConUnaVisita: totalConUnaVisita.length,
        totalConDosOMas: totalConDosOMas.length,
        frecuencia,
        enRiesgo,
        enRiesgoCount: enRiesgo.length,
    })
}