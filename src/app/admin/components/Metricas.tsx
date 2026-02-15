'use client'
import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

interface VisitaReciente {
    id: string
    clienteNombre: string
    clienteNivel: string
    mesa: string
    local: string
    fecha: string
    tipoEvento: string
    beneficio: string | null
    beneficioDescripcion: string | null
    contabilizada: boolean
}

interface MetricasData {
    totalClientes: number
    clientesActivos: number
    visitasUltimos30Dias: number
    distribucionNiveles: { nivel: string; count: number }[]
    eventosProximos: number
    visitasRecientes: VisitaReciente[]
}

export function Metricas({ adminKey }: { adminKey: string }) {
    const [data, setData] = useState<MetricasData | null>(null)
    const [cargando, setCargando] = useState(true)
    const [exportando, setExportando] = useState(false)
    
    // Filtros de exportación
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')

    useEffect(() => {
        fetchMetricas()
        
        // Setear fechas por defecto (últimos 30 días)
        const hoy = new Date()
        const hace30Dias = new Date()
        hace30Dias.setDate(hoy.getDate() - 30)
        
        setFechaHasta(hoy.toISOString().split('T')[0])
        setFechaDesde(hace30Dias.toISOString().split('T')[0])
    }, [])

    async function fetchMetricas() {
        try {
            const res = await fetch('/api/admin/metricas', {
                headers: { 'x-admin-key': adminKey },
            })
            if (res.ok) {
                const json = await res.json()
                setData(json.data)
            }
        } catch (e) {
            console.error('Error al cargar métricas:', e)
        } finally {
            setCargando(false)
        }
    }

    async function exportarAExcel() {
        if (!fechaDesde || !fechaHasta) {
            alert('Por favor seleccioná ambas fechas')
            return
        }

        setExportando(true)
        try {
            const params = new URLSearchParams({
                fechaDesde,
                fechaHasta,
            })

            const res = await fetch(`/api/admin/exportar-visitas?${params}`, {
                headers: { 'x-admin-key': adminKey },
            })

            if (!res.ok) {
                throw new Error('Error al exportar')
            }

            const json = await res.json()
            const { visitas, resumen, totales } = json.data

            // Crear libro de Excel
            const wb = XLSX.utils.book_new()

            // Hoja 1: Visitas detalladas
            const wsVisitas = XLSX.utils.json_to_sheet(visitas)
            XLSX.utils.book_append_sheet(wb, wsVisitas, 'Visitas')

            // Hoja 2: Resumen de beneficios
            const wsResumen = XLSX.utils.json_to_sheet(resumen)
            XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Beneficios')

            // Hoja 3: Totales
            const wsTotales = XLSX.utils.json_to_sheet([totales])
            XLSX.utils.book_append_sheet(wb, wsTotales, 'Totales')

            // Descargar archivo
            const nombreArchivo = `visitas_${fechaDesde}_${fechaHasta}.xlsx`
            XLSX.writeFile(wb, nombreArchivo)

            alert('✅ Excel descargado correctamente')
        } catch (error) {
            console.error('Error al exportar:', error)
            alert('❌ Error al exportar. Intentá de nuevo.')
        } finally {
            setExportando(false)
        }
    }

    if (cargando) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12 text-slate-400">
                Error al cargar métricas
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Métricas del Sistema</h2>

            {/* Cards de métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    titulo="Total Clientes"
                    valor={data.totalClientes}
                    color="blue"
                />
                <MetricCard
                    titulo="Clientes Activos"
                    valor={data.clientesActivos}
                    color="green"
                />
                <MetricCard
                    titulo="Visitas (30 días)"
                    valor={data.visitasUltimos30Dias}
                    color="purple"
                />
                <MetricCard
                    titulo="Eventos Próximos"
                    valor={data.eventosProximos}
                    color="orange"
                />
            </div>

            {/* Exportar a Excel */}
            <div className="bg-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    📊 Exportar Visitas a Excel
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Desde
                        </label>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Hasta
                        </label>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <button
                        onClick={exportarAExcel}
                        disabled={exportando || !fechaDesde || !fechaHasta}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {exportando ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Exportando...
                            </>
                        ) : (
                            <>
                                📥 Exportar a Excel
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-sm text-blue-300">
                        💡 <strong>El archivo Excel incluye:</strong>
                    </p>
                    <ul className="text-sm text-blue-200 mt-2 space-y-1 ml-4">
                        <li>• <strong>Hoja 1:</strong> Visitas detalladas (fecha, cliente, teléfono, email, nivel, beneficio canjeado)</li>
                        <li>• <strong>Hoja 2:</strong> Resumen de beneficios canjeados por tipo (para cruzar con AyresIT)</li>
                        <li>• <strong>Hoja 3:</strong> Totales del período seleccionado</li>
                    </ul>
                </div>
            </div>

            {/* Distribución por niveles */}
            <div className="bg-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    Distribución por Niveles
                </h3>
                <div className="space-y-3">
                    {data.distribucionNiveles.map((item) => (
                        <div key={item.nivel} className="flex items-center gap-4">
                            <span className="text-slate-300 w-24">{item.nivel}</span>
                            <div className="flex-1 bg-slate-700 rounded-full h-8 relative overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full rounded-full flex items-center justify-end px-3"
                                    style={{
                                        width: `${Math.max(
                                            (item.count / data.totalClientes) * 100,
                                            5
                                        )}%`,
                                    }}
                                >
                                    <span className="text-white text-sm font-semibold">
                                        {item.count}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visitas recientes */}
            <div className="bg-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    Visitas Recientes (últimas 50)
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 px-2 text-slate-400 font-medium">Cliente</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium">Nivel</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium">Mesa</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium">Fecha y Hora</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium">Beneficio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.visitasRecientes.map((visita) => (
                                <tr key={visita.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                    <td className="py-3 px-2 text-white">{visita.clienteNombre}</td>
                                    <td className="py-3 px-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                                            {visita.clienteNivel}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-slate-300">{visita.mesa}</td>
                                    <td className="py-3 px-2 text-slate-300">
                                        {new Date(visita.fecha).toLocaleString('es-AR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </td>
                                    <td className="py-3 px-2">
                                        {visita.beneficio ? (
                                            <div>
                                                <span className="text-green-400 font-medium">✓ {visita.beneficio}</span>
                                                {visita.beneficioDescripcion && (
                                                    <div className="text-xs text-slate-400 mt-1">{visita.beneficioDescripcion}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function MetricCard({
    titulo,
    valor,
    color,
}: {
    titulo: string
    valor: number
    color: string
}) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
    }

    return (
        <div className="bg-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-sm mb-2">{titulo}</p>
            <p className="text-3xl font-bold text-white">{valor}</p>
            <div className={`h-1 ${colorMap[color]} rounded-full mt-3`} />
        </div>
    )
}
