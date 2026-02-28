'use client'
// src/app/admin/page.tsx
import { useState, useEffect } from 'react'
import { EventosEspeciales } from './components/EventosEspeciales'
import { Clientes } from './components/Clientes'
import { Metricas } from './components/Metricas'

export default function AdminPage() {
    const [autenticado, setAutenticado] = useState(false)
    const [adminKey, setAdminKey] = useState('')
    const [error, setError] = useState('')
    const [seccionActiva, setSeccionActiva] = useState<'metricas' | 'eventos' | 'clientes' | 'beneficios' | 'niveles' | 'configuracion'>('metricas')

    useEffect(() => {
        const key = localStorage.getItem('admin_key')
        if (key) {
            setAdminKey(key)
            setAutenticado(true)
        }
    }, [])

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

    if (!autenticado) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
                <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md">
                    <h1 className="text-2xl font-bold text-white mb-6">Panel Admin</h1>
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
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => (window.location.href = '/')}
                            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Volver</span>
                        </button>
                        <h1 className="text-xl font-bold text-white">Panel Admin - Coques Points</h1>
                    </div>
                    <button
                        onClick={logout}
                        className="text-slate-400 hover:text-white text-sm transition"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-1 overflow-x-auto">
                        {[
                            { key: 'metricas', label: 'Métricas' },
                            { key: 'eventos', label: 'Eventos Especiales' },
                            { key: 'clientes', label: 'Clientes' },
                            { key: 'niveles', label: '⭐ Niveles' },
                            { key: 'beneficios', label: '🎁 Beneficios' },
                            { key: 'configuracion', label: '⚙️ Configuración' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setSeccionActiva(tab.key as any)}
                                className={`px-6 py-3 font-semibold transition ${seccionActiva === tab.key
                                    ? 'text-white border-b-2 border-blue-500'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {seccionActiva === 'metricas' && <Metricas adminKey={adminKey} />}
                {seccionActiva === 'eventos' && <EventosEspeciales adminKey={adminKey} />}
                {seccionActiva === 'clientes' && <Clientes adminKey={adminKey} />}
                {seccionActiva === 'niveles' && (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-4">⭐</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Gestión de Niveles</h2>
                        <p className="text-slate-400 mb-6">Configurá criterios de visitas para cada nivel</p>
                        <button
                            onClick={() => window.location.href = '/admin/niveles'}
                            className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-yellow-700 hover:to-orange-700 transition inline-flex items-center gap-2"
                        >
                            <span>Ir a Configuración de Niveles</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
                {seccionActiva === 'beneficios' && (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-4">🎁</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Panel de Beneficios</h2>
                        <p className="text-slate-400 mb-6">Gestión completa de beneficios por nivel</p>
                        <button
                            onClick={() => window.location.href = '/admin/beneficios'}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition inline-flex items-center gap-2"
                        >
                            <span>Ir a Gestión de Beneficios</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
                {seccionActiva === 'configuracion' && (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-4">⚙️</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Configuración del Sistema</h2>
                        <p className="text-slate-400 mb-6">Feedback, notificaciones push y más</p>
                        <button
                            onClick={() => window.location.href = `/admin/configuracion?key=${adminKey}`}
                            className="bg-gradient-to-r from-slate-600 to-slate-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-slate-700 hover:to-slate-800 transition inline-flex items-center gap-2"
                        >
                            <span>Ir a Configuración</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
