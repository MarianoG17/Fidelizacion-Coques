// src/app/api/admin/metricas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getHaceNDias } from '@/lib/timezone'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

// Helper para formatear fecha en timezone Argentina
function formatearFechaArgentina(fecha: Date): string {
    // Ajustar manualmente a UTC-3 (Argentina)
    // Crear nueva fecha ajustando el offset
    const offsetArgentina = -3 * 60; // -3 horas en minutos
    const offsetActual = fecha.getTimezoneOffset(); // offset actual en minutos (negativo para UTC+)
    const diferenciaMinutos = offsetActual - offsetArgentina;
    
    const fechaArgentina = new Date(fecha.getTime() + diferenciaMinutos * 60 * 1000);
    
    const dia = String(fechaArgentina.getUTCDate()).padStart(2, '0');
    const mes = String(fechaArgentina.getUTCMonth() + 1).padStart(2, '0');
    const año = fechaArgentina.getUTCFullYear();
    const hora = String(fechaArgentina.getUTCHours()).padStart(2, '0');
    const minuto = String(fechaArgentina.getUTCMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${año}, ${hora}:${minuto}`;
}

export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try {
        const [
            totalClientes,
            clientesActivos,
            visitasUltimos30Dias,
            distribucionNiveles,
            eventosProximos,
            visitasRecientes,
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

            // Visitas recientes con detalles (últimas 50)
            prisma.eventoScan.findMany({
                where: {
                    tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
                    metodoValidacion: { in: ['QR', 'OTP_MANUAL'] }, // Excluir visitas bonus
                },
                include: {
                    cliente: {
                        select: {
                            nombre: true,
                            phone: true,
                            nivel: { select: { nombre: true } },
                        },
                    },
                    mesa: {
                        select: { nombre: true },
                    },
                    local: {
                        select: { nombre: true },
                    },
                    beneficio: {
                        select: {
                            nombre: true,
                            descripcionCaja: true,
                        },
                    },
                },
                orderBy: { timestamp: 'desc' },
                take: 50,
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
                visitasRecientes: visitasRecientes.map((v) => ({
                    id: v.id,
                    clienteNombre: v.cliente.nombre || v.cliente.phone,
                    clienteNivel: v.cliente.nivel?.nombre || 'Sin nivel',
                    mesa: v.mesa?.nombre || 'Sin mesa',
                    local: v.local.nombre,
                    fecha: formatearFechaArgentina(v.timestamp),
                    tipoEvento: v.tipoEvento,
                    beneficio: v.beneficio?.nombre || null,
                    beneficioDescripcion: v.beneficio?.descripcionCaja || null,
                    contabilizada: v.contabilizada,
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
