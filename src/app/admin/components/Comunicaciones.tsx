'use client'
// src/app/admin/components/Comunicaciones.tsx
import { useState, useEffect } from 'react'

interface Plantilla {
    id: string
    nombre: string
    asunto: string
    cuerpo: string
    activa: boolean
    variables: string[]
    updatedAt: string | null
    esDefault: boolean
}

const ETIQUETAS_VARS: Record<string, string> = {
    '{{nombre}}': 'Nombre del cliente',
    '{{nivel}}': 'Nivel actual',
    '{{dias_antes}}': 'Días antes del cumple',
    '{{dias_despues}}': 'Días después del cumple',
    '{{estrellas}}': 'Botones de calificación (generados automáticamente)',
}

// Info del trigger de cada mail automático
const TRIGGERS: Record<string, { icono: string; descripcion: string; configKey?: string; configLabel?: string }> = {
    bienvenida: {
        icono: '🎉',
        descripcion: 'Se envía cuando un cliente completa su registro (nombre + teléfono verificado).',
    },
    reactivacion: {
        icono: '💤',
        descripcion: 'Se envía una vez por día a clientes que no visitaron en un período prolongado.',
        configKey: 'reactivacion',
        configLabel: 'Días sin visitar → ⚙️ Configuración',
    },
    cumpleanos_7dias: {
        icono: '🎂',
        descripcion: 'Se envía exactamente 7 días antes del cumpleaños del cliente (cron diario 8 AM).',
    },
    feedback_email: {
        icono: '⭐',
        descripcion: 'Se envía a clientes sin notificaciones push, pasado el tiempo de espera post-visita.',
        configKey: 'feedback',
        configLabel: 'Tiempo de espera y frecuencia → ⚙️ Configuración',
    },
}

export function Comunicaciones({ adminKey }: { adminKey: string }) {
    const [plantillas, setPlantillas] = useState<Plantilla[]>([])
    const [loading, setLoading] = useState(true)
    const [editando, setEditando] = useState<Plantilla | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

    useEffect(() => { cargar() }, [])

    async function cargar() {
        setLoading(true)
        const res = await fetch('/api/admin/comunicaciones', { headers: { 'x-admin-key': adminKey } })
        if (res.ok) {
            const data = await res.json()
            setPlantillas(data.plantillas)
        }
        setLoading(false)
    }

    async function guardar() {
        if (!editando) return
        setGuardando(true)
        setMensaje(null)
        const res = await fetch('/api/admin/comunicaciones', {
            method: 'PATCH',
            headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editando.id, asunto: editando.asunto, cuerpo: editando.cuerpo, activa: editando.activa }),
        })
        if (res.ok) {
            setMensaje({ tipo: 'ok', texto: 'Plantilla guardada correctamente.' })
            setEditando(null)
            await cargar()
        } else {
            const d = await res.json()
            setMensaje({ tipo: 'error', texto: d.error || 'Error al guardar' })
        }
        setGuardando(false)
    }

    async function restaurar(id: string) {
        if (!confirm('¿Restaurar el texto original de esta plantilla?')) return
        const res = await fetch(`/api/admin/comunicaciones?id=${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-key': adminKey },
        })
        if (res.ok) {
            setMensaje({ tipo: 'ok', texto: 'Plantilla restaurada al texto original.' })
            await cargar()
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Emails automáticos</h2>
                <p className="text-slate-400 mt-1">Se envían sin intervención manual. Podés activarlos, pausarlos y editar su contenido.</p>
            </div>

            {mensaje && (
                <div className={`p-4 rounded-xl text-sm font-medium ${mensaje.tipo === 'ok' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                    {mensaje.texto}
                </div>
            )}

            {/* Lista de plantillas */}
            {!editando && (
                <div className="grid gap-4">
                    {plantillas.map(p => {
                        const trigger = TRIGGERS[p.id]
                        return (
                            <div key={p.id} className={`bg-slate-800 rounded-2xl p-6 border ${p.activa ? 'border-slate-700/50' : 'border-red-800/40 opacity-60'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Título y badges */}
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-white font-semibold">{p.nombre}</h3>
                                            {p.esDefault && (
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-400">texto original</span>
                                            )}
                                            {!p.activa && (
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">pausado</span>
                                            )}
                                        </div>

                                        {/* Trigger info */}
                                        {trigger && (
                                            <div className="flex items-start gap-2 mt-2 mb-3 bg-slate-700/40 rounded-xl px-3 py-2">
                                                <span className="text-base shrink-0">{trigger.icono}</span>
                                                <div className="min-w-0">
                                                    <p className="text-slate-300 text-xs leading-relaxed">{trigger.descripcion}</p>
                                                    {trigger.configLabel && (
                                                        <p className="text-slate-500 text-xs mt-0.5">{trigger.configLabel}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-slate-400 text-sm truncate">Asunto: {p.asunto}</p>
                                        <p className="text-slate-500 text-xs mt-1 line-clamp-2 whitespace-pre-wrap">{p.cuerpo.slice(0, 120)}…</p>
                                        {p.updatedAt && (
                                            <p className="text-slate-600 text-xs mt-2">
                                                Última edición: {new Date(p.updatedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        {!p.esDefault && (
                                            <button
                                                onClick={() => restaurar(p.id)}
                                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                                                title="Restaurar texto original"
                                            >
                                                ↩ Restaurar
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setEditando({ ...p }); setMensaje(null) }}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            ✏️ Editar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Editor */}
            {editando && (
                <div className="bg-slate-800 rounded-2xl p-6 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-bold text-lg">Editando: {editando.nombre}</h3>
                        <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-white">✕</button>
                    </div>

                    {/* Trigger info en el editor */}
                    {TRIGGERS[editando.id] && (
                        <div className="flex items-start gap-2 mb-5 bg-slate-700/40 rounded-xl px-3 py-2.5">
                            <span className="text-base shrink-0">{TRIGGERS[editando.id].icono}</span>
                            <div>
                                <p className="text-slate-300 text-xs leading-relaxed">{TRIGGERS[editando.id].descripcion}</p>
                                {TRIGGERS[editando.id].configLabel && (
                                    <p className="text-slate-500 text-xs mt-0.5">{TRIGGERS[editando.id].configLabel}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Variables disponibles */}
                    <div className="mb-5">
                        <p className="text-slate-400 text-xs mb-2 font-medium uppercase tracking-wide">Variables disponibles</p>
                        <div className="flex flex-wrap gap-2">
                            {editando.variables.map(v => (
                                <span key={v} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 font-mono" title={ETIQUETAS_VARS[v] || v}>
                                    {v}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Activa toggle */}
                    <div className="flex items-center gap-3 mb-5">
                        <label className="text-slate-300 text-sm font-medium">Envío activo</label>
                        <button
                            onClick={() => setEditando(e => e ? { ...e, activa: !e.activa } : e)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editando.activa ? 'bg-green-600' : 'bg-slate-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editando.activa ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-xs text-slate-500">{editando.activa ? 'Se envía automáticamente' : 'Envío pausado'}</span>
                    </div>

                    {/* Asunto */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Asunto del email</label>
                        <input
                            type="text"
                            value={editando.asunto}
                            onChange={e => setEditando(ed => ed ? { ...ed, asunto: e.target.value } : ed)}
                            className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                    </div>

                    {/* Cuerpo */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Cuerpo del email</label>
                        <textarea
                            value={editando.cuerpo}
                            onChange={e => setEditando(ed => ed ? { ...ed, cuerpo: e.target.value } : ed)}
                            rows={14}
                            className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none text-sm font-mono resize-y"
                        />
                        <p className="text-slate-500 text-xs mt-1">Cada salto de línea se convierte en un párrafo. Podés usar las variables de arriba.</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={guardar}
                            disabled={guardando}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
                        >
                            {guardando ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                        <button
                            onClick={() => setEditando(null)}
                            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>

                    {mensaje && (
                        <div className={`mt-4 p-3 rounded-xl text-sm ${mensaje.tipo === 'ok' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {mensaje.texto}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
