'use client'
import { useState, useEffect } from 'react'

interface StaffTotal {
    staff: string
    total: number
}

interface StaffPorDia {
    dia: string
    staff: string
    cantidad: number
}

const STAFF_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    Yesi: { bg: 'bg-amber-900', text: 'text-amber-200', dot: 'bg-amber-400' },
    Alex: { bg: 'bg-sky-900', text: 'text-sky-200', dot: 'bg-sky-400' },
    Kari: { bg: 'bg-rose-900', text: 'text-rose-200', dot: 'bg-rose-400' },
}

function staffColor(staff: string) {
    return STAFF_COLORS[staff] || { bg: 'bg-slate-700', text: 'text-slate-200', dot: 'bg-slate-400' }
}

export function StaffStats({ adminKey }: { adminKey: string }) {
    const [totales, setTotales] = useState<StaffTotal[]>([])
    const [porDia, setPorDia] = useState<StaffPorDia[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchStats()
    }, [])

    async function fetchStats() {
        const key = localStorage.getItem('admin_key')
        if (!key) { setCargando(false); return }
        try {
            const res = await fetch('/api/admin/staff-stats', { headers: { 'x-admin-key': key } })
            if (res.ok) {
                const json = await res.json()
                setTotales(json.data.totales || [])
                setPorDia(json.data.porDia || [])
            } else {
                setError('Error al cargar estadísticas')
            }
        } catch (e) {
            setError('Error de conexión')
        } finally {
            setCargando(false)
        }
    }

    // Group porDia by dia
    const diasUnicos = [...new Set(porDia.map(r => r.dia))].sort((a, b) => b.localeCompare(a))
    const staffMembers = [...new Set([...totales.map(t => t.staff), ...porDia.map(r => r.staff)])].sort()

    const totalGeneral = totales.reduce((sum, t) => sum + t.total, 0)

    if (cargando) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (error) {
        return <div className="text-red-400 py-8 text-center">{error}</div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Registros por Vendedora</h2>

            {/* Totales generales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-sm">Total registros</p>
                    <p className="text-3xl font-bold text-white">{totalGeneral}</p>
                </div>
                {totales.map(t => {
                    const c = staffColor(t.staff)
                    return (
                        <div key={t.staff} className={`rounded-xl p-4 ${c.bg}`}>
                            <p className={`text-sm font-semibold ${c.text}`}>{t.staff}</p>
                            <p className={`text-3xl font-bold ${c.text}`}>{t.total}</p>
                            <p className={`text-xs mt-1 opacity-70 ${c.text}`}>
                                {totalGeneral > 0 ? Math.round((t.total / totalGeneral) * 100) : 0}% del total
                            </p>
                        </div>
                    )
                })}
            </div>

            {totalGeneral === 0 && (
                <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
                    Todavía no hay registros vinculados a ninguna vendedora.
                    <p className="text-sm mt-2 text-slate-500">Los nuevos registros con QR de Yesi, Alex o Kari aparecerán aquí.</p>
                </div>
            )}

            {/* Tabla por día */}
            {diasUnicos.length > 0 && (
                <div className="bg-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-700">
                        <h3 className="text-lg font-semibold text-white">Registros por día (últimos 30 días)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-700">
                                    <th className="text-left p-4 text-slate-300 font-semibold">Fecha</th>
                                    {staffMembers.map(s => {
                                        const c = staffColor(s)
                                        return (
                                            <th key={s} className="text-left p-4 font-semibold">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>{s}</span>
                                            </th>
                                        )
                                    })}
                                    <th className="text-left p-4 text-slate-300 font-semibold">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {diasUnicos.map(dia => {
                                    const filaStaff = Object.fromEntries(
                                        porDia.filter(r => r.dia === dia).map(r => [r.staff, r.cantidad])
                                    )
                                    const totalDia = Object.values(filaStaff).reduce((s, v) => s + v, 0)
                                    const [year, month, day] = dia.split('-')
                                    const fechaDisplay = `${day}/${month}/${year}`
                                    return (
                                        <tr key={dia} className="border-t border-slate-700 hover:bg-slate-750 transition">
                                            <td className="p-4 text-slate-300 font-mono text-sm">{fechaDisplay}</td>
                                            {staffMembers.map(s => {
                                                const c = staffColor(s)
                                                const val = filaStaff[s] || 0
                                                return (
                                                    <td key={s} className="p-4">
                                                        {val > 0 ? (
                                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${c.bg} ${c.text}`}>
                                                                {val}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-600 text-sm">—</span>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                            <td className="p-4 text-white font-semibold">{totalDia}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
