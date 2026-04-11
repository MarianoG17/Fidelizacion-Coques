'use client'
// src/app/admin/components/Campanas.tsx
import { useState, useEffect, useRef } from 'react'

const SEGMENTOS = [
    { value: 'todos', label: '📋 Todos los clientes activos' },
    { value: 'bronce', label: '🥉 Nivel Bronce' },
    { value: 'plata', label: '🥈 Nivel Plata' },
    { value: 'oro', label: '🥇 Nivel Oro' },
    { value: 'sin_nivel', label: '⚪ Sin nivel asignado' },
    { value: 'en_riesgo', label: '⚠️ En riesgo (no vinieron en 30+ días)' },
]

export function Campanas({ adminKey }: { adminKey: string }) {
    const [segmento, setSegmento] = useState('todos')
    const [asunto, setAsunto] = useState('')
    const [cuerpo, setCuerpo] = useState('')
    const [preview, setPreview] = useState<{ count: number; destinatarios: { nombre: string | null; email: string }[] } | null>(null)
    const [cargandoPreview, setCargandoPreview] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [resultado, setResultado] = useState<{ enviados: number; errores: number; total: number } | null>(null)
    const [confirmando, setConfirmando] = useState(false)
    const [testEmail, setTestEmail] = useState('')
    const [enviandoTest, setEnviandoTest] = useState(false)
    const [resultadoTest, setResultadoTest] = useState<string | null>(null)
    const [datosUsados, setDatosUsados] = useState<{ nombre: string; nivel: string; visitas: number; proximo_nivel: string; visitas_para_subir: number; dias_sin_visitar: number } | null>(null)

    const cuerpoRef = useRef<HTMLTextAreaElement>(null)
    const key = typeof window !== 'undefined' ? (localStorage.getItem('admin_key') || adminKey) : adminKey

    const VARIABLES = [
        { label: '{{nombre}}', desc: 'Primer nombre del cliente' },
        { label: '{{nivel}}', desc: 'Nivel actual (Bronce, Plata, Oro)' },
        { label: '{{visitas}}', desc: 'Total de visitas acumuladas' },
        { label: '{{proximo_nivel}}', desc: 'Nombre del próximo nivel a alcanzar' },
        { label: '{{visitas_para_subir}}', desc: 'Visitas que le faltan para subir de nivel' },
        { label: '{{dias_sin_visitar}}', desc: 'Días desde la última visita' },
    ]

    function insertarVariable(variable: string) {
        const el = cuerpoRef.current
        if (!el) return
        const start = el.selectionStart
        const end = el.selectionEnd
        const nuevo = cuerpo.slice(0, start) + variable + cuerpo.slice(end)
        setCuerpo(nuevo)
        setResultado(null)
        // Restore cursor after variable
        requestAnimationFrame(() => {
            el.focus()
            el.setSelectionRange(start + variable.length, start + variable.length)
        })
    }

    useEffect(() => {
        cargarPreview()
    }, [segmento])

    async function cargarPreview() {
        setCargandoPreview(true)
        setPreview(null)
        try {
            const res = await fetch(`/api/admin/campanas?segmento=${segmento}`, {
                headers: { 'x-admin-key': key },
            })
            const data = await res.json()
            setPreview(data)
        } catch {
            //
        } finally {
            setCargandoPreview(false)
        }
    }

    async function enviarTest() {
        if (!testEmail.trim() || !asunto.trim() || !cuerpo.trim()) return
        setEnviandoTest(true)
        setResultadoTest(null)
        try {
            const res = await fetch('/api/admin/campanas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
                body: JSON.stringify({ segmento, asunto, cuerpo, testEmail: testEmail.trim() }),
            })
            const data = await res.json()
            setResultadoTest(data.ok ? '✓ Email de prueba enviado' : `✗ Error: ${data.error || 'desconocido'}`)
            if (data.ok && data.datosUsados) setDatosUsados(data.datosUsados)
        } catch {
            setResultadoTest('✗ Error de conexión')
        } finally {
            setEnviandoTest(false)
        }
    }

    async function enviarCampana() {
        if (!asunto.trim() || !cuerpo.trim()) return
        setEnviando(true)
        setResultado(null)
        setConfirmando(false)
        try {
            const res = await fetch('/api/admin/campanas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
                body: JSON.stringify({ segmento, asunto, cuerpo }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al enviar')
            setResultado(data)
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Error al enviar la campaña')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h2 className="text-2xl font-bold text-white">Campañas por Email</h2>
                <p className="text-slate-400 text-sm mt-1">
                    Enviá comunicaciones a tus clientes. Podés usar <code className="bg-slate-700 px-1 rounded text-blue-300">{'{{nombre}}'}</code> para personalizar.
                </p>
            </div>

            {/* Segmento */}
            <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-semibold">1. Destinatarios</h3>
                <select
                    value={segmento}
                    onChange={e => { setSegmento(e.target.value); setResultado(null) }}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {SEGMENTOS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>

                {cargandoPreview && (
                    <p className="text-slate-400 text-sm">Calculando destinatarios...</p>
                )}
                {preview && !cargandoPreview && (
                    <div className="bg-slate-700/50 rounded-xl p-4">
                        <p className="text-white font-semibold">
                            {preview.count} destinatario{preview.count !== 1 ? 's' : ''} con email
                        </p>
                        {preview.destinatarios.length > 0 && (
                            <p className="text-slate-400 text-xs mt-1">
                                Ej: {preview.destinatarios.slice(0, 3).map(d => d.nombre || d.email).join(', ')}
                                {preview.count > 3 ? ` y ${preview.count - 3} más...` : ''}
                            </p>
                        )}
                        {preview.count === 0 && (
                            <p className="text-amber-400 text-xs mt-1">No hay clientes con email en este segmento</p>
                        )}
                    </div>
                )}
            </div>

            {/* Contenido */}
            <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-semibold">2. Contenido</h3>
                <div>
                    <label className="block text-slate-300 text-sm mb-2">Asunto</label>
                    <input
                        type="text"
                        value={asunto}
                        onChange={e => { setAsunto(e.target.value); setResultado(null) }}
                        placeholder="Ej: ¡Te extrañamos! Volvé y aprovechá tu descuento"
                        className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-slate-300 text-sm">Cuerpo del email</label>
                        <div className="flex gap-2 flex-wrap justify-end">
                            {VARIABLES.map(v => (
                                <button
                                    key={v.label}
                                    type="button"
                                    onClick={() => insertarVariable(v.label)}
                                    title={v.desc}
                                    className="bg-slate-600 hover:bg-slate-500 text-blue-300 text-xs px-2 py-1 rounded-lg font-mono transition"
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <textarea
                        ref={cuerpoRef}
                        value={cuerpo}
                        onChange={e => { setCuerpo(e.target.value); setResultado(null) }}
                        rows={10}
                        placeholder={`Hola {{nombre}},\n\nTe extrañamos en Coques Bakery. Esta semana tenemos una oferta especial para vos...\n\n¡Esperamos verte pronto!\nEl equipo de Coques`}
                        className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
                    />
                    <p className="text-slate-500 text-xs mt-1">
                        Hacé clic en una variable para insertarla donde está el cursor. Los saltos de línea se respetan.
                    </p>
                </div>
            </div>

            {/* Prueba */}
            <div className="bg-slate-800 rounded-2xl p-6 space-y-3">
                <h3 className="text-white font-semibold">3. Probar antes de enviar</h3>
                <p className="text-slate-400 text-xs">Enviá el email a tu propio correo para ver cómo queda antes del envío masivo.</p>
                <div className="flex gap-3">
                    <input
                        type="email"
                        value={testEmail}
                        onChange={e => { setTestEmail(e.target.value); setResultadoTest(null); setDatosUsados(null) }}
                        placeholder="tu@email.com"
                        className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                        onClick={enviarTest}
                        disabled={!testEmail.trim() || !asunto.trim() || !cuerpo.trim() || enviandoTest}
                        className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm whitespace-nowrap"
                    >
                        {enviandoTest ? 'Enviando...' : 'Enviar prueba'}
                    </button>
                </div>
                {resultadoTest && (
                    <p className={`text-sm font-medium ${resultadoTest.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                        {resultadoTest}
                    </p>
                )}
                {datosUsados && resultadoTest?.startsWith('✓') && (
                    <div className="bg-slate-700/50 rounded-xl px-4 py-3 text-xs text-slate-400 space-y-1">
                        <p className="text-slate-300 font-semibold mb-1">Valores usados en el email:</p>
                        {[
                            ['{{nombre}}', datosUsados.nombre],
                            ['{{nivel}}', datosUsados.nivel],
                            ['{{visitas}}', datosUsados.visitas],
                            ['{{proximo_nivel}}', datosUsados.proximo_nivel],
                            ['{{visitas_para_subir}}', datosUsados.visitas_para_subir],
                            ['{{dias_sin_visitar}}', datosUsados.dias_sin_visitar],
                        ].map(([variable, valor]) => (
                            <p key={String(variable)}>
                                <span className="font-mono text-blue-300">{variable}</span>
                                {' → '}
                                <span className="text-white">{valor}</span>
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Envío */}
            {resultado ? (
                <div className="bg-green-900/30 border border-green-700 rounded-2xl p-6">
                    <p className="text-green-400 font-bold text-lg">✓ Campaña enviada</p>
                    <p className="text-white mt-2">
                        {resultado.enviados} de {resultado.total} emails enviados correctamente
                        {resultado.errores > 0 && (
                            <span className="text-amber-400"> · {resultado.errores} con error</span>
                        )}
                    </p>
                    <button
                        onClick={() => { setResultado(null); setAsunto(''); setCuerpo(''); setConfirmando(false) }}
                        className="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm transition"
                    >
                        Nueva campaña
                    </button>
                </div>
            ) : confirmando ? (
                <div className="bg-amber-900/30 border border-amber-700 rounded-2xl p-6 space-y-4">
                    <p className="text-amber-300 font-semibold">
                        ¿Confirmás el envío a {preview?.count} destinatarios?
                    </p>
                    <p className="text-slate-300 text-sm">
                        <strong>Asunto:</strong> {asunto}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setConfirmando(false)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={enviarCampana}
                            disabled={enviando}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold transition"
                        >
                            {enviando ? 'Enviando...' : 'Confirmar envío'}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setConfirmando(true)}
                    disabled={!asunto.trim() || !cuerpo.trim() || !preview?.count || enviando}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition"
                >
                    Enviar campaña a {preview?.count ?? '—'} destinatarios
                </button>
            )}
        </div>
    )
}