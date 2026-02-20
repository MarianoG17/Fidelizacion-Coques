'use client'
// src/app/admin/beneficios/page.tsx
import { useState, useEffect } from 'react'
import { BeneficiosList } from './components/BeneficiosList'
import { BeneficioForm } from './components/BeneficioForm'

interface Beneficio {
    id: string
    nombre: string
    descripcionCaja: string
    tipo: string
    descuento: number | null
    icono: string
    descripcion: string
    maxPorDia: number
    usoUnico?: boolean
    activo: boolean
    niveles: Array<{ id: string; nombre: string; orden: number }>
    usosTotal: number
}

export default function BeneficiosAdminPage() {
    const [autenticado, setAutenticado] = useState(false)
    const [adminKey, setAdminKey] = useState('')
    const [error, setError] = useState('')
    const [beneficios, setBeneficios] = useState<Beneficio[]>([])
    const [loading, setLoading] = useState(true)
    const [mostrarForm, setMostrarForm] = useState(false)
    const [beneficioEditar, setBeneficioEditar] = useState<Beneficio | null>(null)
    const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos')

    useEffect(() => {
        const key = localStorage.getItem('admin_key')
        if (key) {
            setAdminKey(key)
            setAutenticado(true)
        }
    }, [])

    useEffect(() => {
        if (autenticado) {
            cargarBeneficios()
        }
    }, [autenticado])

    async function cargarBeneficios() {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/beneficios', {
                headers: {
                    'x-admin-key': adminKey,
                },
            })

            if (res.ok) {
                const data = await res.json()
                setBeneficios(data.data || [])
            } else {
                setError('Error al cargar beneficios')
            }
        } catch (err) {
            setError('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    function login() {
        if (!adminKey) {
            setError('Ingresá la admin key')
            return
        }
        localStorage.setItem('admin_key', adminKey)
        setAutenticado(true)
        setError('')
    }

    function logout() {
        localStorage.removeItem('admin_key')
        setAutenticado(false)
        setAdminKey('')
    }

    function handleNuevoBeneficio() {
        setBeneficioEditar(null)
        setMostrarForm(true)
    }

    function handleEditarBeneficio(beneficio: Beneficio) {
        setBeneficioEditar(beneficio)
        setMostrarForm(true)
    }

    function handleCerrarForm() {
        setMostrarForm(false)
        setBeneficioEditar(null)
    }

    async function handleGuardar() {
        setMostrarForm(false)
        setBeneficioEditar(null)
        await cargarBeneficios()
    }

    async function handleEliminar(id: string) {
        if (!confirm('¿Estás seguro de desactivar este beneficio?')) return

        try {
            const res = await fetch(`/api/admin/beneficios/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-admin-key': adminKey,
                },
            })

            if (res.ok) {
                await cargarBeneficios()
            } else {
                alert('Error al eliminar beneficio')
            }
        } catch (err) {
            alert('Error de conexión')
        }
    }

    const beneficiosFiltrados = beneficios.filter((b) => {
        if (filtroActivo === 'activos') return b.activo
        if (filtroActivo === 'inactivos') return !b.activo
        return true
    })

    if (!autenticado) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
                <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md">
                    <h1 className="text-2xl font-bold text-white mb-6">Panel Admin - Beneficios</h1>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Admin Key
                            </label>
                            <input
                                type="password"
                                value={adminKey}
                                onChange={(e) => setAdminKey(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && login()}
                                placeholder="Ingresá la admin key"
                                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button
                            onClick={login}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                        >
                            Acceder
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900">
            {/* Header */}
            <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => (window.location.href = '/admin')}
                            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Panel Admin</span>
                        </button>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            🎁 Gestión de Beneficios
                        </h1>
                    </div>
                    <button
                        onClick={logout}
                        className="text-slate-400 hover:text-white text-sm transition"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Filtros y Acciones */}
                <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-2">
                        {['todos', 'activos', 'inactivos'].map((filtro) => (
                            <button
                                key={filtro}
                                onClick={() => setFiltroActivo(filtro as any)}
                                className={`px-4 py-2 rounded-xl font-medium transition ${filtroActivo === filtro
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                                    }`}
                            >
                                {filtro.charAt(0).toUpperCase() + filtro.slice(1)}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleNuevoBeneficio}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Crear Beneficio
                    </button>
                </div>

                {/* Stats rápidos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                        <div className="text-slate-400 text-sm mb-1">Total Beneficios</div>
                        <div className="text-3xl font-bold text-white">{beneficios.length}</div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                        <div className="text-slate-400 text-sm mb-1">Activos</div>
                        <div className="text-3xl font-bold text-green-400">
                            {beneficios.filter((b) => b.activo).length}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                        <div className="text-slate-400 text-sm mb-1">Usos Totales</div>
                        <div className="text-3xl font-bold text-blue-400">
                            {beneficios.reduce((acc, b) => acc + b.usosTotal, 0)}
                        </div>
                    </div>
                </div>

                {/* Lista de beneficios */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="text-slate-400">Cargando beneficios...</div>
                    </div>
                ) : (
                    <BeneficiosList
                        beneficios={beneficiosFiltrados}
                        onEditar={handleEditarBeneficio}
                        onEliminar={handleEliminar}
                    />
                )}
            </div>

            {/* Modal de formulario */}
            {mostrarForm && (
                <BeneficioForm
                    beneficio={beneficioEditar}
                    adminKey={adminKey}
                    onGuardar={handleGuardar}
                    onCancelar={handleCerrarForm}
                />
            )}
        </div>
    )
}
