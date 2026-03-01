'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'

interface FeedbackItem {
    id: string
    calificacion: number
    comentario: string | null
    enviadoGoogleMaps: boolean
    createdAt: string
    cliente: {
        nombre: string | null
        phone: string
    }
    local: {
        nombre: string
    }
}

export default function AdminFeedbackPage() {
    const router = useRouter()
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filtroCalificacion, setFiltroCalificacion] = useState<number | null>(null)
    const [stats, setStats] = useState({
        total: 0,
        promedio: 0,
        positivos: 0, // 4-5 estrellas
        neutros: 0, // 3 estrellas
        negativos: 0, // 1-2 estrellas
        conComentario: 0,
        enviadosGoogleMaps: 0,
    })

    useEffect(() => {
        cargarFeedbacks()
    }, [])

    async function cargarFeedbacks() {
        try {
            const localKey = localStorage.getItem('local_api_key')
            if (!localKey) {
                router.push('/local/login')
                return
            }

            const res = await fetch('/api/admin/feedback', {
                headers: { 'x-local-api-key': localKey },
            })

            if (res.status === 401) {
                router.push('/local/login')
                return
            }

            if (!res.ok) throw new Error('Error al cargar feedbacks')

            const data = await res.json()
            setFeedbacks(data.data.feedbacks)

            // Calcular estadísticas
            const total = data.data.feedbacks.length
            const suma = data.data.feedbacks.reduce((acc: number, f: FeedbackItem) => acc + f.calificacion, 0)
            const promedio = total > 0 ? suma / total : 0
            const positivos = data.data.feedbacks.filter((f: FeedbackItem) => f.calificacion >= 4).length
            const neutros = data.data.feedbacks.filter((f: FeedbackItem) => f.calificacion === 3).length
            const negativos = data.data.feedbacks.filter((f: FeedbackItem) => f.calificacion <= 2).length
            const conComentario = data.data.feedbacks.filter((f: FeedbackItem) => f.comentario).length
            const enviadosGoogleMaps = data.data.feedbacks.filter((f: FeedbackItem) => f.enviadoGoogleMaps).length

            setStats({ total, promedio, positivos, neutros, negativos, conComentario, enviadosGoogleMaps })
        } catch (error) {
            console.error('Error:', error)
            alert('Error al cargar feedbacks')
        } finally {
            setLoading(false)
        }
    }

    const feedbacksFiltrados = filtroCalificacion
        ? feedbacks.filter(f => f.calificacion === filtroCalificacion)
        : feedbacks

    const getEstrellasColor = (calificacion: number) => {
        if (calificacion >= 4) return 'text-green-500'
        if (calificacion === 3) return 'text-yellow-500'
        return 'text-red-500'
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Cargando feedbacks...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <div className="max-w-7xl mx-auto">
                <BackButton href="/admin" />

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 shadow-2xl">
                    <h1 className="text-3xl font-bold text-white">📊 Feedbacks de Clientes</h1>
                    <p className="text-purple-100 mt-2">Encuestas de satisfacción</p>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <div className="text-slate-400 text-sm">Total</div>
                        <div className="text-white text-2xl font-bold">{stats.total}</div>
                    </div>

                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <div className="text-slate-400 text-sm">Promedio</div>
                        <div className="text-yellow-400 text-2xl font-bold">{stats.promedio.toFixed(1)} ⭐</div>
                    </div>

                    <div className="bg-green-900/30 rounded-xl p-4 border border-green-700">
                        <div className="text-green-400 text-sm">Positivos</div>
                        <div className="text-white text-2xl font-bold">{stats.positivos}</div>
                        <div className="text-green-400 text-xs">4-5 ⭐</div>
                    </div>

                    <div className="bg-yellow-900/30 rounded-xl p-4 border border-yellow-700">
                        <div className="text-yellow-400 text-sm">Neutros</div>
                        <div className="text-white text-2xl font-bold">{stats.neutros}</div>
                        <div className="text-yellow-400 text-xs">3 ⭐</div>
                    </div>

                    <div className="bg-red-900/30 rounded-xl p-4 border border-red-700">
                        <div className="text-red-400 text-sm">Negativos</div>
                        <div className="text-white text-2xl font-bold">{stats.negativos}</div>
                        <div className="text-red-400 text-xs">1-2 ⭐</div>
                    </div>

                    <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-700">
                        <div className="text-blue-400 text-sm">Con comentario</div>
                        <div className="text-white text-2xl font-bold">{stats.conComentario}</div>
                    </div>

                    <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700">
                        <div className="text-purple-400 text-sm">Google Maps</div>
                        <div className="text-white text-2xl font-bold">{stats.enviadosGoogleMaps}</div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-700">
                    <div className="text-slate-300 mb-3 font-semibold">Filtrar por calificación:</div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFiltroCalificacion(null)}
                            className={`px-4 py-2 rounded-lg transition-colors ${filtroCalificacion === null
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            Todas ({feedbacks.length})
                        </button>
                        {[5, 4, 3, 2, 1].map((rating) => (
                            <button
                                key={rating}
                                onClick={() => setFiltroCalificacion(rating)}
                                className={`px-4 py-2 rounded-lg transition-colors ${filtroCalificacion === rating
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                {rating} ⭐ ({feedbacks.filter(f => f.calificacion === rating).length})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista de feedbacks */}
                <div className="space-y-4">
                    {feedbacksFiltrados.length === 0 ? (
                        <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
                            <p className="text-slate-400">No hay feedbacks para mostrar</p>
                        </div>
                    ) : (
                        feedbacksFiltrados.map((feedback) => (
                            <div
                                key={feedback.id}
                                className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-purple-500 transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-white font-semibold text-lg">
                                            {feedback.cliente.nombre || 'Cliente'}
                                        </div>
                                        <div className="text-slate-400 text-sm">{feedback.cliente.phone}</div>
                                        <div className="text-slate-500 text-xs mt-1">
                                            {new Date(feedback.createdAt).toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-3xl font-bold ${getEstrellasColor(feedback.calificacion)}`}>
                                            {'⭐'.repeat(feedback.calificacion)}
                                        </div>
                                        <div className="text-slate-400 text-sm mt-1">{feedback.local.nombre}</div>
                                    </div>
                                </div>

                                {feedback.comentario && (
                                    <div className="bg-slate-900 rounded-lg p-4 mb-3">
                                        <div className="text-slate-400 text-sm mb-2">💬 Comentario:</div>
                                        <div className="text-white">{feedback.comentario}</div>
                                    </div>
                                )}

                                {feedback.enviadoGoogleMaps && (
                                    <div className="inline-block bg-purple-900/50 border border-purple-600 rounded-full px-3 py-1">
                                        <span className="text-purple-300 text-sm">✅ Dejó reseña en Google Maps</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
