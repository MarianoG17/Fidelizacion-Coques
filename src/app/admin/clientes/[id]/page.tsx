'use client'
// src/app/admin/clientes/[id]/page.tsx
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface Auto {
    id: string
    patente: string
    marca: string | null
    modelo: string | null
    alias: string | null
    estadoActual: { estado: string; updatedAt: string } | null
}

interface Evento {
    id: string
    timestamp: string
    tipoEvento: string
    notas: string | null
    local: { nombre: string } | null
}

interface Cliente {
    id: string
    nombre: string | null
    phone: string | null
    email: string | null
    estado: string
    nivel: { nombre: string; orden: number } | null
    fechaCumpleanos: string | null
    fuenteConocimiento: string | null
    authProvider: string | null
    referidosActivados: number
    createdAt: string
    tienePush: boolean
    visitasReales: number
    visitasBonus: number
    autos: Auto[]
    eventos: Evento[]
}

function getNivelColor(orden: number) {
    const colores: Record<number, string> = {
        1: 'text-orange-400',
        2: 'text-slate-300',
        3: 'text-yellow-400',
        4: 'text-cyan-400',
    }
    return colores[orden] || 'text-white'
}

function getTipoEventoLabel(tipo: string) {
    const labels: Record<string, string> = {
        VISITA: '🏪 Visita',
        BENEFICIO_APLICADO: '🎁 Beneficio',
        PEDIDO_TORTA: '🎂 Pedido',
        EVENTO_ESPECIAL: '⭐ Evento especial',
    }
    return labels[tipo] || tipo
}

export default function ClientePerfilPage() {
    const params = useParams()
    const clienteId = params.id as string

    const [adminKey, setAdminKey] = useState('')
    const [autenticado, setAutenticado] = useState(false)
    const [inputKey, setInputKey] = useState('')
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const key = localStorage.getItem('admin_key')
        if (key) { setAdminKey(key); setAutenticado(true) }
    }, [])

    useEffect(() => {
        if (!autenticado || !adminKey || !clienteId) return
        setCargando(true)
        fetch(`/api/admin/clientes/${clienteId}`, {
            headers: { 'x-admin-key': adminKey },
        })
            .then(r => {
                if (!r.ok) throw new Error('No autorizado')
                return r.json()
            })
            .then(json => setCliente(json.data))
            .catch(() => setError('Error al cargar el cliente'))
            .finally(() => setCargando(false))
    }, [autenticado, adminKey, clienteId])

    function login() {
        if (!inputKey) return
        localStorage.setItem('admin_key', inputKey)
        setAdminKey(inputKey)
        setAutenticado(true)
    }

    if (!autenticado) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
                <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md">
                    <h1 className="text-2xl font-bold text-white mb-6">Panel Admin</h1>
                    <input type="password" value={inputKey} onChange={e => setInputKey(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && login()}
                        placeholder="Admin Key"
                        className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
                    <button onClick={login} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
                        Acceder
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver
                    </button>
                    <h1 className="text-xl font-bold text-white">Perfil de Cliente</h1>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8">
                {cargando && (
                    <div className="flex justify-center py-24">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
                    </div>
                )}
                {error && <p className="text-red-400 text-center py-12">{error}</p>}

                {cliente && (
                    <div className="space-y-6">
                        {/* Datos principales */}
                        <div className="bg-slate-800 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{cliente.nombre || 'Sin nombre'}</h2>
                                    {cliente.nivel && (
                                        <span className={`text-sm font-semibold ${getNivelColor(cliente.nivel.orden)}`}>
                                            {cliente.nivel.nombre}
                                        </span>
                                    )}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cliente.estado === 'ACTIVO' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                    {cliente.estado}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-400 mb-1">Teléfono</p>
                                    <p className="text-white">{cliente.phone || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 mb-1">Email</p>
                                    <p className="text-white break-all">{cliente.email || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 mb-1">Cumpleaños</p>
                                    <p className="text-white">
                                        {cliente.fechaCumpleanos
                                            ? new Date(cliente.fechaCumpleanos).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 mb-1">Registrado</p>
                                    <p className="text-white">{new Date(cliente.createdAt).toLocaleDateString('es-AR')}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 mb-1">Cómo nos conoció</p>
                                    <p className="text-white">{cliente.fuenteConocimiento || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 mb-1">Login con</p>
                                    <p className="text-white capitalize">{cliente.authProvider || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Estadísticas */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-800 rounded-2xl p-5 text-center">
                                <p className="text-3xl font-bold text-blue-400">{cliente.visitasReales}</p>
                                <p className="text-slate-400 text-sm mt-1">Visitas reales</p>
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-5 text-center">
                                <p className="text-3xl font-bold text-purple-400">{cliente.visitasBonus}</p>
                                <p className="text-slate-400 text-sm mt-1">Visitas bonus</p>
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-5 text-center">
                                <p className="text-3xl font-bold text-green-400">{cliente.referidosActivados}</p>
                                <p className="text-slate-400 text-sm mt-1">Referidos</p>
                            </div>
                        </div>

                        {/* Autos */}
                        {cliente.autos.length > 0 && (
                            <div className="bg-slate-800 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">🚗 Autos</h3>
                                <div className="space-y-3">
                                    {cliente.autos.map(auto => (
                                        <div key={auto.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
                                            <div>
                                                <p className="text-white font-medium">{auto.patente}</p>
                                                <p className="text-slate-400 text-sm">
                                                    {[auto.marca, auto.modelo, auto.alias].filter(Boolean).join(' · ') || '—'}
                                                </p>
                                            </div>
                                            {auto.estadoActual && (
                                                <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">
                                                    {auto.estadoActual.estado}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Últimos eventos */}
                        {cliente.eventos.length > 0 && (
                            <div className="bg-slate-800 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📋 Últimos eventos</h3>
                                <div className="space-y-2">
                                    {cliente.eventos.map(ev => (
                                        <div key={ev.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-700/50 last:border-0">
                                            <div>
                                                <p className="text-white">{getTipoEventoLabel(ev.tipoEvento)}</p>
                                                {ev.notas && <p className="text-slate-400 text-xs">{ev.notas}</p>}
                                                {ev.local && <p className="text-slate-500 text-xs">{ev.local.nombre}</p>}
                                            </div>
                                            <p className="text-slate-400 text-xs whitespace-nowrap ml-4">
                                                {new Date(ev.timestamp).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
