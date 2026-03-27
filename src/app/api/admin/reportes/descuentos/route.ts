// src/app/api/admin/reportes/descuentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try{

        const { searchParams } = new URL(req.url)
        const fechaDesde = searchParams.get('fechaDesde') // YYYY-MM-DD
        const fechaHasta = searchParams.get('fechaHasta') // YYYY-MM-DD
        const formato = searchParams.get('formato') || 'json' // 'json' o 'csv'

        // Rango de fechas
        const desde = fechaDesde
            ? new Date(fechaDesde + 'T00:00:00-03:00')
            : new Date(new Date().setDate(new Date().getDate() - 30)) // últimos 30 días por defecto

        const hasta = fechaHasta
            ? new Date(fechaHasta + 'T23:59:59-03:00')
            : new Date()

        // Beneficios a excluir (no son parte del programa de fidelización)
        const beneficiosExcluidos = [
            'Descuento Generico Integracion Woo',
            'Promo mini tortas 4x3',
            'Descuento 20%',
            'Promo macarons 7x6'
        ]

        // Obtener todos los eventos de beneficios aplicados
        const eventos = await prisma.eventoScan.findMany({
            where: {
                tipoEvento: 'BENEFICIO_APLICADO',
                beneficioId: { not: null }, // Asegurar que tiene beneficio asociado
                timestamp: {
                    gte: desde,
                    lte: hasta,
                },
                beneficio: {
                    nombre: {
                        notIn: beneficiosExcluidos
                    }
                }
            },
            include: {
                cliente: {
                    select: {
                        id: true,
                        nombre: true,
                        phone: true,
                        email: true,
                        nivel: {
                            select: {
                                nombre: true,
                            },
                        },
                    },
                },
                beneficio: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcionCaja: true,
                        condiciones: true,
                    },
                },
                local: {
                    select: {
                        nombre: true,
                        tipo: true,
                    },
                },
                mesa: {
                    select: {
                        nombre: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
        })

        console.log(`[DESCUENTOS] Eventos con beneficio aplicado: ${eventos.length}`)

        // Formatear datos para el reporte
        const reporte = eventos.map((evento) => {
            const timestamp = new Date(evento.timestamp)

            // Parsear condiciones del beneficio si existe
            let condiciones: any = {}
            try {
                condiciones = evento.beneficio?.condiciones ?
                    (typeof evento.beneficio.condiciones === 'string'
                        ? JSON.parse(evento.beneficio.condiciones)
                        : evento.beneficio.condiciones)
                    : {}
            } catch {
                condiciones = {}
            }

            return {
                id: evento.id,
                fecha: timestamp.toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    timeZone: 'America/Argentina/Buenos_Aires',
                }),
                hora: timestamp.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'America/Argentina/Buenos_Aires',
                    hour12: false,
                }),
                fechaHora: timestamp.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
                dia: timestamp.toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' }),
                timestamp: timestamp.toISOString(),

                // Cliente
                clienteId: evento.cliente.id,
                clienteNombre: evento.cliente.nombre || 'Sin nombre',
                clienteTelefono: evento.cliente.phone,
                clienteEmail: evento.cliente.email || '',
                clienteNivel: evento.cliente.nivel?.nombre || 'Sin nivel',

                // Beneficio
                beneficioId: evento.beneficio?.id || '',
                beneficioNombre: evento.beneficio?.nombre || 'Beneficio eliminado',
                beneficioDescripcionCaja: evento.beneficio?.descripcionCaja || '',
                descuentoPorcentaje: condiciones.descuento
                    ? Math.round(condiciones.descuento * 100)
                    : (condiciones.porcentajeDescuento || 0),
                codigoAyresIT: condiciones.codigoAyresIT || '',
                maxPorDia: condiciones.maxPorDia || '',
                maxPorMes: condiciones.maxPorMes || '',

                // Local
                local: evento.local.nombre,
                tipoLocal: evento.local.tipo,
                mesa: evento.mesa?.nombre || '',

                // Método
                metodoValidacion: evento.metodoValidacion,
                notas: evento.notas || '',
            }
        })

        // Si formato es CSV, generar CSV
        if (formato === 'csv') {
            const headers = [
                'Fecha',
                'Hora',
                'Día',
                'Cliente',
                'Teléfono',
                'Email',
                'Nivel',
                'Beneficio',
                'Descripción Caja',
                'Descuento %',
                'Código AyresIT',
                'Max Por Día',
                'Max Por Mes',
                'Local',
                'Sector',
                'Mesa',
                'Método',
                'Notas',
                'ID Evento',
                'ID Cliente',
                'ID Beneficio',
            ]

            const rows = reporte.map((r) => [
                r.fecha,
                r.hora,
                r.dia,
                r.clienteNombre,
                r.clienteTelefono,
                r.clienteEmail,
                r.clienteNivel,
                r.beneficioNombre,
                r.beneficioDescripcionCaja,
                r.descuentoPorcentaje,
                r.codigoAyresIT,
                r.maxPorDia,
                r.maxPorMes,
                r.local,
                r.tipoLocal,
                r.mesa,
                r.metodoValidacion,
                r.notas,
                r.id,
                r.clienteId,
                r.beneficioId,
            ])

            // Escapar valores CSV
            const escapeCsv = (val: any) => {
                if (val === null || val === undefined) return ''
                const str = String(val)
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`
                }
                return str
            }

            const csv = [
                headers.map(escapeCsv).join(','),
                ...rows.map((row) => row.map(escapeCsv).join(',')),
            ].join('\n')

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="descuentos_${fechaDesde || 'desde'}_${fechaHasta || 'hasta'}.csv"`,
                },
            })
        }

        // Retornar JSON
        return NextResponse.json({
            success: true,
            rangoFechas: {
                desde: desde.toISOString(),
                hasta: hasta.toISOString(),
            },
            total: reporte.length,
            data: reporte,
        })
    } catch (error) {
        console.error('Error al generar reporte de descuentos:', error)
        return NextResponse.json(
            { error: 'Error al generar reporte' },
            { status: 500 }
        )
    }
}
