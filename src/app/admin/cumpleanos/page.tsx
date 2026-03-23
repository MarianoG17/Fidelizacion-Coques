'use client'
// src/app/admin/cumpleanos/page.tsx
import { useState, useEffect, useCallback } from 'react'

interface ClienteCumple {
    id: string
    nombre: string
    mes: number
    dia: number
}

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function CumpleanosPage() {
    const [adminKey, setAdminKey] = useState('')
    const [autenticado, setAutenticado] = useState(false)
    const [inputKey, setInputKey] = useState('')
    const [error, setError] = useState('')
    const [clientes, setClientes] = useState<ClienteCumple[]>([])
    const [cargando, setCargando] = useState(false)

    const hoy = new Date()
    const [mesActual, setMesActual] = useState(hoy.getMonth() + 1) // 1-12
    const [anioActual, setAnioActual] = useState(hoy.getFullYear())

    useEffect(() => {
        const key = localStorage.getItem('admin_key')
        if (key) {
            setAdminKey(key)
            setAutenticado(true)
        }
    }, [])

    const cargarCumpleanos = useCallback(async (key: string) => {
        setCargando(true)
        try {
            const res = await fetch('/api/admin/cumpleanos', {
                headers: { 'x-admin-key': key },
            })
            if (!res.ok) throw new Error('No autorizado')
            const json = await res.json()
            setClientes(json.data)
        } catch {
            setError('Error al cargar cumpleaños')
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        if (autenticado && adminKey) cargarCumpleanos(adminKey)
    }, [autenticado, adminKey, cargarCumpleanos])

    function login() {
        if (!inputKey) { setError('Ingresá la admin key'); return }
        localStorage.setItem('admin_key', inputKey)
        setAdminKey(inputKey)
        setAutenticado(true)
        setError('')
    }

    function irMesAnterior() {
        if (mesActual === 1) { setMesActual(12); setAnioActual(a => a - 1) }
        else setMesActual(m => m - 1)
    }

    function irMesSiguiente() {
        if (mesActual === 12) { setMesActual(1); setAnioActual(a => a + 1) }
        else setMesActual(m => m + 1)
    }

    // Construir grilla del mes
    function buildCalendar() {
        const primerDia = new Date(anioActual, mesActual - 1, 1).getDay() // 0=Dom
        const diasEnMes = new Date(anioActual, mesActual, 0).getDate()

        const celdas: (number | null)[] = []
        for (let i = 0; i < primerDia; i++) celdas.push(null)
        for (let d = 1; d <= diasEnMes; d++) celdas.push(d)
        // Completar hasta múltiplo de 7
        while (celdas.length % 7 !== 0) celdas.push(null)
        return celdas
    }

    function clientesEnDia(dia: number) {
        return clientes.filter(c => c.mes === mesActual && c.dia === dia)
    }

    const esHoy = (dia: number) =>
        dia === hoy.getDate() && mesActual === hoy.getMonth() + 1 && anioActual === hoy.getFullYear()

    if (!autenticado) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
                <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md">
                    <h1 className="text-2xl font-bold text-white mb-6">Panel Admin</h1>
                    <div className="space-y-4">
                        <input
                            type="password"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && login()}
                            placeholder="Admin Key"
                            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button onClick={login} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
                            Acceder
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const celdas = buildCalendar()

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => window.location.href = '/admin'}
                        className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver al Admin
                    </button>
                    <h1 className="text-xl font-bold text-white">🎂 Cumpleaños</h1>
                    <div className="text-slate-400 text-sm">{clientes.length} clientes con fecha</div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
                {cargando ? (
                    <div className="flex justify-center py-24">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" />
                    </div>
                ) : (
                    <>
                        {/* Navegación de mes */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={irMesAnterior}
                                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h2 className="text-2xl font-bold text-white">
                                {MESES[mesActual - 1]} {anioActual}
                            </h2>
                            <button
                                onClick={irMesSiguiente}
                                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {/* Calendario */}
                        <div className="bg-slate-800 rounded-2xl overflow-hidden">
                            {/* Encabezado días */}
                            <div className="grid grid-cols-7 border-b border-slate-700">
                                {DIAS_SEMANA.map((d) => (
                                    <div key={d} className="text-center text-xs font-semibold text-slate-400 py-3">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Celdas */}
                            <div className="grid grid-cols-7">
                                {celdas.map((dia, idx) => {
                                    const cumples = dia ? clientesEnDia(dia) : []
                                    const today = dia ? esHoy(dia) : false
                                    return (
                                        <div
                                            key={idx}
                                            className={`min-h-[80px] p-2 border-b border-r border-slate-700/50 ${!dia ? 'bg-slate-900/30' : ''}`}
                                        >
                                            {dia && (
                                                <>
                                                    <span className={`text-sm font-semibold block mb-1 w-7 h-7 flex items-center justify-center rounded-full ${today ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>
                                                        {dia}
                                                    </span>
                                                    <div className="space-y-1">
                                                        {cumples.map((c) => (
                                                            <div
                                                                key={c.id}
                                                                className="text-xs bg-pink-600/30 text-pink-300 rounded px-1.5 py-0.5 truncate"
                                                                title={c.nombre}
                                                            >
                                                                🎂 {c.nombre}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
