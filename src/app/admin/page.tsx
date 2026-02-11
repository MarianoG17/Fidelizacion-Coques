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
    const [seccionActiva, setSeccionActiva] = useState<'metricas' | 'eventos' | 'clientes'>('metricas')

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
                    <h1 className="text-xl font-bold text-white">Panel Admin - Coques Points</h1>
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
                    <div className="flex gap-1">
                        {[
                            { key: 'metricas', label: 'Métricas' },
                            { key: 'eventos', label: 'Eventos Especiales' },
                            { key: 'clientes', label: 'Clientes' },
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
            </div>
        </div>
    )
}
