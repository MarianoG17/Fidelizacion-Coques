'use client'
// src/app/logros/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogroData } from '@/types'

export default function LogrosPage() {
    const router = useRouter()
    const [obtenidos, setObtenidos] = useState<LogroData[]>([])
    const [disponibles, setDisponibles] = useState<any[]>([])
    const [totalXp, setTotalXp] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchLogros = async () => {
            const token = localStorage.getItem('fidelizacion_token')
            if (!token) {
                router.push('/login')
                return
            }

            try {
                const res = await fetch('/api/logros', {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (res.status === 401) {
                    router.push('/login')
                    return
                }

                const json = await res.json()
                setObtenidos(json.data.obtenidos)
                setDisponibles(json.data.disponibles)
                setTotalXp(json.data.totalXp)

                // Marcar logros como vistos
                if (json.data.obtenidos.some((l: LogroData) => !l.visto)) {
                    const logrosNoVistos = json.data.obtenidos
                        .filter((l: LogroData) => !l.visto)
                        .map((l: LogroData) => l.id)

                    await fetch('/api/logros/marcar-vistos', {
                        method: 'PATCH',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ logroIds: logrosNoVistos }),
                    })
                }
            } catch (err) {
                setError('Error al cargar logros')
            } finally {
                setLoading(false)
            }
        }

        fetchLogros()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Cargando logros...</p>
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
                        className="mt-4 text-purple-600 underline text-sm"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        )
    }

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

                    <h1 className="text-3xl font-bold text-slate-800 mb-2">🏆 Mis Logros</h1>
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full">
                            <span className="font-bold text-lg">{totalXp} XP</span>
                        </div>
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold">{obtenidos.length}</span> de {obtenidos.length + disponibles.length} logros
                        </div>
                    </div>
                </div>

                {/* Logros Obtenidos */}
                {obtenidos.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span>✅</span>
                            Logros Desbloqueados
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {obtenidos.map((logro) => (
                                <div
                                    key={logro.id}
                                    className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-4 relative"
                                >
                                    {!logro.visto && (
                                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                            NUEVO
                                        </div>
                                    )}
                                    <div className="text-4xl mb-2">{logro.icono}</div>
                                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{logro.nombre}</h3>
                                    <p className="text-xs text-gray-600 mb-2">{logro.descripcion}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-yellow-600">+{logro.puntosXp} XP</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(logro.obtenidoEn).toLocaleDateString('es-AR', {
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Logros Disponibles */}
                {disponibles.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span>🎯</span>
                            Próximos Logros
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {disponibles.map((logro) => (
                                <div
                                    key={logro.id}
                                    className="bg-white border-2 border-gray-200 rounded-xl p-4 opacity-60"
                                >
                                    <div className="text-4xl mb-2 grayscale">{logro.icono}</div>
                                    <h3 className="font-semibold text-gray-600 text-sm mb-1">{logro.nombre}</h3>
                                    <p className="text-xs text-gray-500 mb-2">{logro.descripcion}</p>
                                    <div className="text-xs font-bold text-gray-400">+{logro.puntosXp} XP</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mensaje si no hay logros */}
                {obtenidos.length === 0 && disponibles.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🏆</div>
                        <p className="text-gray-600">¡Empezá a desbloquear logros visitándonos!</p>
                    </div>
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

                    <Link href="/logros" className="flex flex-col items-center gap-1 text-purple-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span className="text-xs font-medium">Logros</span>
                    </Link>

                    <Link href="/historial" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
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
