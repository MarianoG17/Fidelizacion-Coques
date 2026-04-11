'use client'
// src/app/admin/components/Retencion.tsx
import { useState, useEffect } from 'react'

interface ClienteRiesgo {
    id: string
    nombre: string | null
    email: string | null
    phone: string | null
    nivel: string
    ultimaVisita: string | null
}

interface RetencionData {
    tasaRetorno: number
    totalConUnaVisita: number
    totalConDosOMas: number
    frecuencia: { nivel: string; promedioDias: number }[]
    enRiesgo: ClienteRiesgo[]
    enRiesgoCount: number
}

export function Retencion({ adminKey }: { adminKey: string }) {
    const [data, setData] = useState<RetencionData | null>(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const key = localStorage.getItem('admin_key') || adminKey
        setCargando(true)
        fetch('/api/admin/retencion', { headers: { 'x-admin-key': key } })
            .then(r => r.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setCargando(false))
    }, [])

    function diasDesde(timestamp: string | null): string {
        if (!timestamp) return '—'
        const dias = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24))
        return `hace ${dias} días`
    }

    function getNivelColor(nivel: string) {
        const colores: Record<string, string> = {
            'Oro': 'bg-yellow-900/50 text-yellow-300',
            'Plata': 'bg-slate-600/50 text-slate-300',
            'Bronce': 'bg-orange-900/50 text-orange-300',
        }
        return colores[nivel] || 'bg-slate-700 text-slate-400'
    }

    if (cargando) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
        )
    }

    if (!data) return <p className="text-red-400 text-center py-12">Error al cargar datos</p>

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Retención del Programa</h2>

            {/* KPIs principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-2xl p-6 text-center">
                    <p className="text-5xl font-bold text-blue-400">{data.tasaRetorno}%</p>
                    <p className="text-white font-semibold mt-2">Tasa de retorno</p>
                    <p className="text-slate-400 text-xs mt-1">
                        {data.totalConDosOMas} de {data.totalConUnaVisita} clientes volvieron más de una vez
                    </p>
                </div>
                <div className="bg-slate-800 rounded-2xl p-6">
                    <p className="text-white font-semibold mb-4">Frecuencia promedio de visita</p>
                    {data.frecuencia.length === 0 ? (
                        <p className="text-slate-400 text-sm">Sin datos suficientes</p>
                    ) : (
                        <div className="space-y-3">
                            {data.frecuencia.map(f => (
                                <div key={f.nivel} className="flex items-center justify-between">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getNivelColor(f.nivel)}`}>
                                        {f.nivel}
                                    </span>
                                    <span className="text-white font-bold">
                                        cada {f.promedioDias} días
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="bg-slate-800 rounded-2xl p-6 text-center">
                    <p className={`text-5xl font-bold ${data.enRiesgoCount > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                        {data.enRiesgoCount}
                    </p>
                    <p className="text-white font-semibold mt-2">Clientes en riesgo</p>
                    <p className="text-slate-400 text-xs mt-1">Visitaron hace 31–90 días y no volvieron</p>
                </div>
            </div>

            {/* Tabla de clientes en riesgo */}
            {data.enRiesgo.length > 0 && (
                <div className="bg-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-700">
                        <h3 className="text-lg font-semibold text-white">⚠️ Clientes en riesgo de perder</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            Visitaron entre 31 y 90 días atrás pero no volvieron. Buen momento para una campaña.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-700">
                                    <th className="text-left p-4 text-slate-300 font-semibold">Cliente</th>
                                    <th className="text-left p-4 text-slate-300 font-semibold">Nivel</th>
                                    <th className="text-left p-4 text-slate-300 font-semibold">Email</th>
                                    <th className="text-left p-4 text-slate-300 font-semibold">Teléfono</th>
                                    <th className="text-left p-4 text-slate-300 font-semibold">Última visita</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.enRiesgo.map(c => (
                                    <tr key={c.id} className="border-t border-slate-700 hover:bg-slate-750 transition">
                                        <td className="p-4 text-white font-medium">{c.nombre || 'Sin nombre'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getNivelColor(c.nivel)}`}>
                                                {c.nivel}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-300 text-sm">{c.email || '—'}</td>
                                        <td className="p-4 text-slate-300 text-sm font-mono">{c.phone || '—'}</td>
                                        <td className="p-4">
                                            <span className="text-amber-400 text-sm">{diasDesde(c.ultimaVisita)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {data.enRiesgo.length === 0 && (
                <div className="bg-slate-800 rounded-2xl p-12 text-center">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="text-white font-semibold">No hay clientes en riesgo</p>
                    <p className="text-slate-400 text-sm mt-1">Todos los clientes activos visitaron en los últimos 30 días</p>
                </div>
            )}
        </div>
    )
}