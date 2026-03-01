'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ConfiguracionApp {
    nivelesPeriodoDias: number
    feedbackHabilitado: boolean
    feedbackTiempoVisitaMinutos: number
    feedbackFrecuenciaDias: number
    feedbackMinEstrellas: number
    googleMapsUrl: string
}

export default function ConfiguracionPage() {
    const router = useRouter()
    const [config, setConfig] = useState<ConfiguracionApp | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState('')

    useEffect(() => {
        const adminKey = localStorage.getItem('admin_key')
        if (!adminKey) {
            router.push('/admin')
            return
        }
        cargarConfiguracion()
    }, [router])

    async function cargarConfiguracion() {
        try {
            const adminKey = localStorage.getItem('admin_key')
            const res = await fetch('/api/admin/configuracion', {
                headers: { 'x-admin-key': adminKey || '' }
            })
            
            if (!res.ok) throw new Error('Error al cargar configuración')
            
            const data = await res.json()
            setConfig(data.config)
        } catch (error) {
            console.error('Error:', error)
            setMensaje('Error al cargar configuración')
        }
    }

    async function guardarConfiguracion(e: React.FormEvent) {
        e.preventDefault()
        if (!config) return

        setGuardando(true)
        setMensaje('')

        try {
            const adminKey = localStorage.getItem('admin_key')
            const res = await fetch('/api/admin/configuracion', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': adminKey || ''
                },
                body: JSON.stringify(config)
            })

            if (!res.ok) throw new Error('Error al guardar')

            setMensaje('✅ Configuración guardada correctamente')
            setTimeout(() => setMensaje(''), 3000)
        } catch (error) {
            console.error('Error:', error)
            setMensaje('❌ Error al guardar configuración')
        } finally {
            setGuardando(false)
        }
    }

    if (!config) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.push('/admin')}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        ← Volver
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración</h1>
                </div>

                {mensaje && (
                    <div className={`mb-4 p-4 rounded-lg ${mensaje.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {mensaje}
                    </div>
                )}

                <form onSubmit={guardarConfiguracion} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                    {/* Sistema de Niveles */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Sistema de Niveles</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Período de evaluación (días)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={config.nivelesPeriodoDias}
                                    onChange={(e) => setConfig({ ...config, nivelesPeriodoDias: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Período de tiempo en días para contar visitas y evaluar cambios de nivel
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sistema de Feedback */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">⭐ Sistema de Feedback</h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="feedbackHabilitado"
                                    checked={config.feedbackHabilitado}
                                    onChange={(e) => setConfig({ ...config, feedbackHabilitado: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="feedbackHabilitado" className="text-sm font-medium text-gray-700">
                                    Habilitar solicitud de feedback
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tiempo después de visita (minutos)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={config.feedbackTiempoVisitaMinutos}
                                    onChange={(e) => setConfig({ ...config, feedbackTiempoVisitaMinutos: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Minutos después de una visita para solicitar feedback
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Frecuencia mínima (días)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="90"
                                    value={config.feedbackFrecuenciaDias}
                                    onChange={(e) => setConfig({ ...config, feedbackFrecuenciaDias: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Días mínimos entre solicitudes de feedback al mismo cliente
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Estrellas mínimas para Google Maps
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={config.feedbackMinEstrellas}
                                    onChange={(e) => setConfig({ ...config, feedbackMinEstrellas: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Calificación mínima para sugerir reseña en Google Maps
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    URL de Google Maps
                                </label>
                                <input
                                    type="url"
                                    value={config.googleMapsUrl}
                                    onChange={(e) => setConfig({ ...config, googleMapsUrl: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://maps.app.goo.gl/..."
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Enlace para dejar reseña en Google Maps
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={guardando}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {guardando ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/admin')}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
