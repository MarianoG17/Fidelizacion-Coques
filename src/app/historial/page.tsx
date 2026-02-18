'use client'
// src/app/historial/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { VisitaHistorial } from '@/types'

interface Pedido {
    id: number
    numero: string
    estado: string
    estadoTexto: string
    fechaCreacion: string
    fechaEntrega: string | null
    horaEntrega: string | null
    total: string
    moneda: string
    metodoPago: string
    items: {
        nombre: string
        cantidad: number
        precio: string
        total: string
        imagen: string | null
    }[]
}

type Tab = 'visitas' | 'pedidos'

export default function HistorialPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<Tab>('visitas')
    const [visitas, setVisitas] = useState<VisitaHistorial[]>([])
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [totalVisitas, setTotalVisitas] = useState(0)

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('fidelizacion_token')
            if (!token) {
                router.push('/login')
                return
            }

            try {
                // Fetch both visits and orders in parallel
                const [visitasRes, pedidosRes] = await Promise.all([
                    fetch('/api/historial?limit=50', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch('/api/woocommerce/mis-pedidos', {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                ])

                if (visitasRes.status === 401 || pedidosRes.status === 401) {
                    router.push('/login')
                    return
                }

                const visitasJson = await visitasRes.json()
                setVisitas(visitasJson.data.historial)
                setTotalVisitas(visitasJson.data.pagination.total)

                if (pedidosRes.ok) {
                    const pedidosJson = await pedidosRes.json()
                    setPedidos(pedidosJson.pedidos || [])
                }
            } catch (err) {
                setError('Error al cargar historial')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [router])

    function formatearPrecio(precio: string | number): string {
        const num = typeof precio === 'string' ? parseFloat(precio) : precio
        return num.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    }

    function getEstadoColor(estado: string): string {
        const colores: Record<string, string> = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'processing': 'bg-blue-100 text-blue-800',
            'on-hold': 'bg-orange-100 text-orange-800',
            'completed': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800',
            'refunded': 'bg-purple-100 text-purple-800',
            'failed': 'bg-red-100 text-red-800',
        }
        return colores[estado] || 'bg-gray-100 text-gray-800'
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Cargando historial...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
                <div className="text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 text-blue-600 underline text-sm"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        )
    }

    // Agrupar visitas por mes
    const visitasPorMes: Record<string, VisitaHistorial[]> = {}
    visitas.forEach((visita) => {
        const fecha = new Date(visita.timestamp)
        const mesKey = fecha.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' })
        if (!visitasPorMes[mesKey]) {
            visitasPorMes[mesKey] = []
        }
        visitasPorMes[mesKey].push(visita)
    })

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="max-w-lg mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/pass">
                        <button className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-4">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Volver</span>
                        </button>
                    </Link>

                    <h1 className="text-3xl font-bold text-slate-800 mb-2">📊 Mi Historial</h1>
                    <p className="text-gray-600">
                        {totalVisitas} {totalVisitas === 1 ? 'visita' : 'visitas'} • {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm">
                    <button
                        onClick={() => setActiveTab('visitas')}
                        className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                            activeTab === 'visitas'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        📍 Visitas
                    </button>
                    <button
                        onClick={() => setActiveTab('pedidos')}
                        className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                            activeTab === 'pedidos'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        🛒 Pedidos
                    </button>
                </div>

                {/* Content - Visitas */}
                {activeTab === 'visitas' && (
                    <>
                        {Object.keys(visitasPorMes).length > 0 ? (
                            <div className="space-y-6">
                                {Object.entries(visitasPorMes).map(([mes, visitasDelMes]) => (
                                    <div key={mes}>
                                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                            {mes}
                                        </h2>
                                        <div className="space-y-3">
                                            {visitasDelMes.map((visita) => {
                                                const fecha = new Date(visita.timestamp)
                                                const esHoy = fecha.toDateString() === new Date().toDateString()

                                                return (
                                                    <div
                                                        key={visita.id}
                                                        className={`bg-white rounded-xl p-4 shadow-sm border ${
                                                            esHoy ? 'border-blue-200 bg-blue-50' : 'border-gray-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h3 className="font-semibold text-gray-800">{visita.local.nombre}</h3>
                                                                    {esHoy && (
                                                                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                                                            Hoy
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-gray-500">
                                                                    {fecha.toLocaleDateString('es-AR', {
                                                                        weekday: 'long',
                                                                        day: 'numeric',
                                                                        month: 'long',
                                                                        timeZone: 'America/Argentina/Buenos_Aires'
                                                                    })} • {fecha.toLocaleTimeString('es-AR', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        timeZone: 'America/Argentina/Buenos_Aires'
                                                                    })}
                                                                </p>
                                                            </div>

                                                            {!visita.contabilizada && (
                                                                <span className="text-xs text-orange-600 font-medium">
                                                                    No contabilizada
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Mesa */}
                                                        {visita.mesa && (
                                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                <span>Mesa {visita.mesa.nombre}</span>
                                                            </div>
                                                        )}

                                                        {/* Beneficio aplicado */}
                                                        {visita.beneficio && (
                                                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium mt-2">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                <span>{visita.beneficio.nombre}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">📊</div>
                                <p className="text-gray-600 mb-2">Aún no tenés visitas registradas</p>
                                <p className="text-sm text-gray-500">¡Visitanos y empezá a acumular beneficios!</p>
                            </div>
                        )}
                    </>
                )}

                {/* Content - Pedidos */}
                {activeTab === 'pedidos' && (
                    <>
                        {pedidos.length > 0 ? (
                            <div className="space-y-4">
                                {pedidos.map((pedido) => {
                                    const fecha = new Date(pedido.fechaCreacion)
                                    const esHoy = fecha.toDateString() === new Date().toDateString()

                                    return (
                                        <div
                                            key={pedido.id}
                                            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                                        >
                                            {/* Header del pedido */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-gray-800">Pedido #{pedido.numero}</h3>
                                                        {esHoy && (
                                                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                                                Hoy
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Mostrar fecha de entrega si existe, sino fecha de creación */}
                                                    {pedido.fechaEntrega && pedido.horaEntrega ? (
                                                        <p className="text-sm text-gray-500">
                                                            <span className="font-medium">Entrega:</span> {pedido.fechaEntrega} • {pedido.horaEntrega}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">
                                                            {fecha.toLocaleDateString('es-AR', {
                                                                weekday: 'long',
                                                                day: 'numeric',
                                                                month: 'long',
                                                                timeZone: 'America/Argentina/Buenos_Aires'
                                                            })} • {fecha.toLocaleTimeString('es-AR', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                timeZone: 'America/Argentina/Buenos_Aires'
                                                            })}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getEstadoColor(pedido.estado)}`}>
                                                    {pedido.estadoTexto}
                                                </span>
                                            </div>

                                            {/* Items del pedido */}
                                            <div className="space-y-2 mb-3">
                                                {pedido.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 text-sm">
                                                        <span className="text-gray-600">{item.cantidad}x</span>
                                                        <span className="flex-1 text-gray-800">{item.nombre}</span>
                                                        <span className="text-gray-700 font-medium">
                                                            ${formatearPrecio(item.total)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Total y método de pago */}
                                            <div className="border-t border-gray-100 pt-3 mt-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-gray-600">Total</span>
                                                    <span className="text-lg font-bold text-gray-800">
                                                        ${formatearPrecio(pedido.total)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500">{pedido.metodoPago}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🛒</div>
                                <p className="text-gray-600 mb-2">Aún no realizaste ningún pedido</p>
                                <p className="text-sm text-gray-500 mb-4">¡Descubrí nuestras tortas clásicas!</p>
                                <Link href="/tortas">
                                    <button className="bg-gradient-to-r from-orange-400 to-pink-400 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow">
                                        Ver Tortas
                                    </button>
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Navegación inferior fija */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
                <div className="max-w-lg mx-auto flex justify-around items-center py-3 px-4">
                    <Link href="/pass" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                        </svg>
                        <span className="text-xs font-medium">Pass</span>
                    </Link>

                    <Link href="/logros" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span className="text-xs font-medium">Logros</span>
                    </Link>

                    <Link href="/historial" className="flex flex-col items-center gap-1 text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium">Historial</span>
                    </Link>

                    <Link href="/perfil" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs font-medium">Perfil</span>
                    </Link>
                </div>
            </nav>
        </div>
    )
}
