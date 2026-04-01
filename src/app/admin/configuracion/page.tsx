'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Nivel {
    id: string
    nombre: string
    orden: number
}

interface ConfiguracionApp {
    nivelesPeriodoDias: number
    tortasMultiplicador: number
    nivelRegistroId: string | null
    feedbackHabilitado: boolean
    feedbackTiempoVisitaMinutos: number
    feedbackDiasPedidoTorta: number
    feedbackFrecuenciaDias: number
    feedbackMinEstrellas: number
    googleMapsUrl: string
    pushHabilitado: boolean
    pushAutoListo: boolean
    pushNuevoNivel: boolean
    pushBeneficioDisponible: boolean
    pushBeneficioVence: boolean
    pushCumpleanos: boolean
}

export default function ConfiguracionPage() {
    const router = useRouter()
    const [config, setConfig] = useState<ConfiguracionApp | null>(null)
    const [niveles, setNiveles] = useState<Nivel[]>([])
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState('')
    const [refrescandoCatalogo, setRefrescandoCatalogo] = useState(false)
    const [mensajeCatalogo, setMensajeCatalogo] = useState('')
    const [repararFechas, setRepararFechas] = useState(false)
    const [mensajeRepararFechas, setMensajeRepararFechas] = useState('')
    const [reevaluandoNiveles, setReevaluandoNiveles] = useState(false)
    const [mensajeNiveles, setMensajeNiveles] = useState('')

    useEffect(() => {
        const adminKey = localStorage.getItem('admin_key')
        if (!adminKey) {
            router.push('/admin')
            return
        }
        cargarConfiguracion()
        cargarNiveles()
    }, [router])

    async function cargarNiveles() {
        try {
            const adminKey = localStorage.getItem('admin_key')
            const res = await fetch('/api/admin/niveles', {
                headers: { 'x-admin-key': adminKey || '' }
            })
            if (res.ok) {
                const data = await res.json()
                setNiveles(data.data.map((n: any) => ({ id: n.id, nombre: n.nombre, orden: n.orden })))
            }
        } catch (error) {
            console.error('Error al cargar niveles:', error)
        }
    }

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

    async function refrescarCatalogo() {
        setRefrescandoCatalogo(true)
        setMensajeCatalogo('')
        try {
            const adminKey = localStorage.getItem('admin_key')
            const res = await fetch('/api/admin/refresh-catalogo', {
                method: 'POST',
                headers: { 'x-admin-key': adminKey || '' }
            })
            const data = await res.json()
            if (res.ok) {
                setMensajeCatalogo(`✅ ${data.message}`)
            } else {
                setMensajeCatalogo(`❌ Error: ${data.error}`)
            }
        } catch {
            setMensajeCatalogo('❌ Error al conectar con el servidor')
        } finally {
            setRefrescandoCatalogo(false)
            setTimeout(() => setMensajeCatalogo(''), 5000)
        }
    }

    async function ejecutarRepararFechas() {
        setRepararFechas(true)
        setMensajeRepararFechas('')
        try {
            const adminKey = localStorage.getItem('admin_key')
            const res = await fetch('/api/admin/reparar-fechas-woo', {
                method: 'POST',
                headers: { 'x-admin-key': adminKey || '' }
            })
            const data = await res.json()
            if (res.ok) {
                setMensajeRepararFechas(`✅ ${data.actualizados} pedidos actualizados (${data.noEncontrados} no encontrados en WooCommerce)`)
            } else {
                setMensajeRepararFechas(`❌ Error: ${data.error}`)
            }
        } catch {
            setMensajeRepararFechas('❌ Error al conectar con el servidor')
        } finally {
            setRepararFechas(false)
        }
    }

    async function ejecutarReevaluarNiveles() {
        setReevaluandoNiveles(true)
        setMensajeNiveles('')
        try {
            const adminKey = localStorage.getItem('admin_key')
            const res = await fetch('/api/admin/reevaluar-niveles', {
                method: 'POST',
                headers: { 'x-admin-key': adminKey || '' }
            })
            const data = await res.json()
            if (res.ok) {
                setMensajeNiveles(`✅ ${data.estadisticas.cambiosDeNivel} clientes cambiaron de nivel (${data.estadisticas.totalClientes} evaluados)`)
            } else {
                setMensajeNiveles(`❌ Error: ${data.error}`)
            }
        } catch {
            setMensajeNiveles('❌ Error al conectar con el servidor')
        } finally {
            setReevaluandoNiveles(false)
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

                {/* Catálogo WooCommerce */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">🛍️ Catálogo de Tortas</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        El catálogo se guarda en cache por 30 días. Usá este botón cuando cambiés precios o productos en WooCommerce.
                    </p>
                    {mensajeCatalogo && (
                        <div className={`mb-3 p-3 rounded-lg text-sm ${mensajeCatalogo.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {mensajeCatalogo}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={refrescarCatalogo}
                        disabled={refrescandoCatalogo}
                        className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {refrescandoCatalogo ? '⏳ Actualizando catálogo...' : '🔄 Actualizar Catálogo desde WooCommerce'}
                    </button>
                </div>

                {/* Reparar fechas pedidos WooCommerce */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">🔧 Reparar Fechas de Pedidos</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Corrige los timestamps de pedidos de tortas que fueron importados masivamente y quedaron con la fecha de importación en vez de la fecha real del pedido.
                    </p>
                    {mensajeRepararFechas && (
                        <div className={`mb-3 p-3 rounded-lg text-sm ${mensajeRepararFechas.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {mensajeRepararFechas}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={ejecutarRepararFechas}
                        disabled={repararFechas}
                        className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {repararFechas ? '⏳ Reparando fechas...' : '🔧 Reparar Fechas de Pedidos WooCommerce'}
                    </button>
                </div>

                {/* Re-evaluar niveles */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">📊 Re-evaluar Niveles</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Recalcula el nivel de todos los clientes activos. Usá esto después de corregir fechas de pedidos o cambiar los criterios de niveles.
                    </p>
                    {mensajeNiveles && (
                        <div className={`mb-3 p-3 rounded-lg text-sm ${mensajeNiveles.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {mensajeNiveles}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={ejecutarReevaluarNiveles}
                        disabled={reevaluandoNiveles}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {reevaluandoNiveles ? '⏳ Evaluando niveles...' : '📊 Re-evaluar Niveles de Todos los Clientes'}
                    </button>
                </div>

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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Multiplicador de pedidos de tortas
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={config.tortasMultiplicador}
                                    onChange={(e) => setConfig({ ...config, tortasMultiplicador: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Cuántas visitas equivale cada pedido de torta (ej: 3 = cada pedido cuenta como 3 visitas)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nivel inicial de nuevos registros
                                </label>
                                <select
                                    value={config.nivelRegistroId || ''}
                                    onChange={(e) => setConfig({ ...config, nivelRegistroId: e.target.value || null })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">🥉 Bronce (por defecto)</option>
                                    {niveles.map((nivel) => (
                                        <option key={nivel.id} value={nivel.id}>
                                            {nivel.nombre === 'Bronce' && '🥉'}
                                            {nivel.nombre === 'Plata' && '🥈'}
                                            {nivel.nombre === 'Oro' && '🥇'}
                                            {nivel.nombre}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-sm text-gray-500">
                                    Nivel que se asigna automáticamente a los usuarios al registrarse
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
                                    Días después de entrega de torta
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={config.feedbackDiasPedidoTorta}
                                    onChange={(e) => setConfig({ ...config, feedbackDiasPedidoTorta: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Días después de la entrega de un pedido de torta para solicitar feedback
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
        
                    {/* Sistema de Notificaciones Push */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">🔔 Notificaciones Push</h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="pushHabilitado"
                                    checked={config.pushHabilitado}
                                    onChange={(e) => setConfig({ ...config, pushHabilitado: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="pushHabilitado" className="text-sm font-medium text-gray-700">
                                    Sistema de notificaciones push habilitado
                                </label>
                            </div>
        
                            <div className="ml-8 space-y-3 border-l-2 border-gray-200 pl-4">
                                <p className="text-sm text-gray-600 mb-3">Tipos de notificaciones específicas:</p>
                                
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="pushAutoListo"
                                        checked={config.pushAutoListo}
                                        onChange={(e) => setConfig({ ...config, pushAutoListo: e.target.checked })}
                                        disabled={!config.pushHabilitado}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <label htmlFor="pushAutoListo" className="text-sm text-gray-700">
                                        🚗 Auto listo en lavadero
                                    </label>
                                </div>
        
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="pushNuevoNivel"
                                        checked={config.pushNuevoNivel}
                                        onChange={(e) => setConfig({ ...config, pushNuevoNivel: e.target.checked })}
                                        disabled={!config.pushHabilitado}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <label htmlFor="pushNuevoNivel" className="text-sm text-gray-700">
                                        🎉 Subida de nivel
                                    </label>
                                </div>
        
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="pushBeneficioDisponible"
                                        checked={config.pushBeneficioDisponible}
                                        onChange={(e) => setConfig({ ...config, pushBeneficioDisponible: e.target.checked })}
                                        disabled={!config.pushHabilitado}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <label htmlFor="pushBeneficioDisponible" className="text-sm text-gray-700">
                                        🎁 Nuevo beneficio disponible
                                    </label>
                                </div>
        
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="pushBeneficioVence"
                                        checked={config.pushBeneficioVence}
                                        onChange={(e) => setConfig({ ...config, pushBeneficioVence: e.target.checked })}
                                        disabled={!config.pushHabilitado}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <label htmlFor="pushBeneficioVence" className="text-sm text-gray-700">
                                        ⏰ Beneficio por vencer
                                    </label>
                                </div>
        
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="pushCumpleanos"
                                        checked={config.pushCumpleanos}
                                        onChange={(e) => setConfig({ ...config, pushCumpleanos: e.target.checked })}
                                        disabled={!config.pushHabilitado}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <label htmlFor="pushCumpleanos" className="text-sm text-gray-700">
                                        🎂 Cumpleaños del cliente
                                    </label>
                                </div>
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
