'use client'
import { useState, useEffect } from 'react'

interface MetricasData {
    totalClientes: number
    clientesActivos: number
    visitasUltimos30Dias: number
    distribucionNiveles: { nivel: string; count: number }[]
    eventosProximos: number
}

export function Metricas({ adminKey }: { adminKey: string }) {
    const [data, setData] = useState<MetricasData | null>(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        fetchMetricas()
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
