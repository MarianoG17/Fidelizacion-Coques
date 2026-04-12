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

const PLANTILLAS = [
    {
        label: '🥉 Bronce',
        segmento: 'bronce',
        asunto: '{{nombre}}, tu beneficio de bienvenida te está esperando 🎁',
        cuerpo: `Hola {{nombre}},

Gracias por unirte al programa de fidelización de Coques. Ya sos parte del club y eso tiene ventajas reales desde el primer día.

✅ TUS BENEFICIOS ACTIVOS:
{{beneficios}}

🎁 RECORDÁ: tenés activado el 10% de descuento de bienvenida. Lo podés usar en tu próxima visita o en cualquier compra por nuestra web. ¡Usalo cuando quieras, es tuyo!

🌐 ¿SABÍAS QUE PODÉS SUMAR VISITAS DESDE CASA?
Cada compra que hacés por nuestra web equivale a 3 visitas al programa. Es la forma más rápida de subir de nivel sin moverte de tu casa.

📈 TU PRÓXIMO OBJETIVO: nivel {{proximo_nivel}}
Te faltan solo {{visitas_para_subir}} visitas para desbloquear beneficios exclusivos. ¡Estás muy cerca!

Cada vez que venís o comprás online sumás puntos. Mientras más seguido, más rápido subís.

¡Nos vemos pronto!
El equipo de Coques 🍰`,
    },
    {
        label: '🥈 Plata',
        segmento: 'plata',
        asunto: '{{nombre}}, sos Plata 🥈 — mirá todo lo que desbloqueaste',
        cuerpo: `Hola {{nombre}},

Llegaste al nivel Plata y eso no es casualidad: es el resultado de tu fidelidad. Queremos que sepas todo lo que tenés disponible hoy mismo.

🥈 TUS BENEFICIOS PLATA:
{{beneficios}}

Estos beneficios están activos en cada visita. No necesitás hacer nada especial para usarlos, nosotros los aplicamos automáticamente.

🌐 COMPRÁ ONLINE Y SUMÁ MÁS RÁPIDO
¿No podés venir esta semana? Cada compra por nuestra web cuenta como 3 visitas. Es la manera más inteligente de mantener tu nivel y seguir sumando.

🥇 ¿TE IMAGINÁS EN ORO?
Solo te faltan {{visitas_para_subir}} visitas para llegar al nivel {{proximo_nivel}} y acceder a beneficios aún más exclusivos.

Llevás {{visitas}} visitas con nosotros. Eso dice mucho.

¡Hasta la próxima!
El equipo de Coques 🍰`,
    },
    {
        label: '🥇 Oro',
        segmento: 'oro',
        asunto: '{{nombre}}, sos Oro 🥇 — esto es lo que significa para vos',
        cuerpo: `Hola {{nombre}},

Oro no es solo un nivel, es el reconocimiento a tu fidelidad. Sos parte del grupo más exclusivo de Coques y queremos que lo sientas en cada visita.

🥇 TUS BENEFICIOS EXCLUSIVOS ORO:
{{beneficios}}

Cada vez que venís, estas ventajas están ahí para vos. Sin condiciones, sin fecha de vencimiento, sin trámites.

🌐 RECORDÁ: LAS COMPRAS WEB TAMBIÉN CUENTAN
Cada pedido online equivale a 3 visitas al programa, así mantenés tu nivel Oro activo incluso en las semanas que no podés pasar por el local.

💛 LLEVÁS {{visitas}} VISITAS CON NOSOTROS
Eso es algo que valoramos enormemente. Gracias por elegirnos una y otra vez.

Nos vemos pronto,
El equipo de Coques 🍰`,
    },
    {
        label: '⚠️ Reactivación',
        segmento: 'en_riesgo',
        asunto: '{{nombre}}, hace {{dias_sin_visitar}} días que no te vemos 👀',
        cuerpo: `Hola {{nombre}},

Hace {{dias_sin_visitar}} días que no pasás por Coques y la verdad es que te extrañamos.

Como cliente {{nivel}}, tus beneficios siguen activos y esperándote:
{{beneficios}}

No queremos que los pierdas. Cada visita cuenta para mantener tu nivel y seguir sumando.

🌐 ¿NO PODÉS VENIR ESTA SEMANA?
Hacé un pedido online — cada compra equivale a 3 visitas al programa y te ayuda a mantener tu nivel {{nivel}} activo.

Volvé cuando puedas, acá te esperamos.

El equipo de Coques 🍰`,
    },
    {
        label: '🎂 Cumpleaños',
        segmento: 'todos',
        asunto: '{{nombre}}, ¡tu semana de cumple arranca en 7 días! 🎂',
        cuerpo: `Hola {{nombre}},

Dentro de una semana es tu cumpleaños y en Coques lo queremos celebrar con vos.

🎁 TU BENEFICIO DE CUMPLEAÑOS:
Durante los 3 días anteriores y los 3 días posteriores a tu cumpleaños tenés activo un beneficio especial exclusivo para vos.

No hace falta que hagas nada: cuando venís al local en esos días, el equipo lo aplica automáticamente. ¡Solo avisá que es tu semana de cumple!

📅 ¿CUÁNDO USARLO?
Tu ventana es de 7 días: 3 antes, el día de tu cumple y 3 después. Elegí el momento que más te convenga.

🌐 ¿NO PODÉS VENIR? TAMBIÉN PODÉS CELEBRAR ONLINE
Si querés hacer un pedido especial para tu cumpleaños, recordá que cada compra web suma como 3 visitas al programa.

¡Que sea una semana increíble!
El equipo de Coques 🍰`,
    },
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
    const [datosUsados, setDatosUsados] = useState<{ nombre: string; nivel: string; visitas: number; proximo_nivel: string; visitas_para_subir: number; dias_sin_visitar: number; beneficios: string } | null>(null)

    const cuerpoRef = useRef<HTMLTextAreaElement>(null)
    const key = typeof window !== 'undefined' ? (localStorage.getItem('admin_key') || adminKey) : adminKey

    const VARIABLES = [
        { label: '{{nombre}}', desc: 'Primer nombre del cliente' },
        { label: '{{nivel}}', desc: 'Nivel actual (Bronce, Plata, Oro)' },
        { label: '{{visitas}}', desc: 'Total de visitas acumuladas' },
        { label: '{{proximo_nivel}}', desc: 'Nombre del próximo nivel a alcanzar' },
        { label: '{{visitas_para_subir}}', desc: 'Visitas que le faltan para subir de nivel' },
        { label: '{{dias_sin_visitar}}', desc: 'Días desde la última visita' },
        { label: '{{beneficios}}', desc: 'Descripción de beneficios del nivel actual' },
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

            {/* Plantillas */}
            <div className="bg-slate-800 rounded-2xl p-6 space-y-3">
                <h3 className="text-white font-semibold">Plantillas predefinidas</h3>
                <p className="text-slate-400 text-xs">Cargá una plantilla como punto de partida y editala a tu gusto.</p>
                <div className="flex flex-wrap gap-2">
                    {PLANTILLAS.map(p => (
                        <button
                            key={p.label}
                            type="button"
                            onClick={() => {
                                setSegmento(p.segmento)
                                setAsunto(p.asunto)
                                setCuerpo(p.cuerpo)
                                setResultado(null)
                                setResultadoTest(null)
                                setDatosUsados(null)
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded-xl transition"
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
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
                            ['{{beneficios}}', datosUsados.beneficios],
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