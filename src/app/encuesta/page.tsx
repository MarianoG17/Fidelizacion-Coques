'use client'
// src/app/encuesta/page.tsx
// Página pública de encuesta de satisfacción — accessible via link en email, sin login
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense, type ReactNode } from 'react'

type Estado = 'loading' | 'seleccion' | 'comentario' | 'gracias' | 'error'

const ESTRELLAS = ['', '😞', '😕', '😐', '😊', '🤩']

function EncuestaContent() {
    const params = useSearchParams()
    const r = params.get('r')      // rating pre-seleccionado desde link de email
    const t = params.get('t')      // token firmado

    const [estado, setEstado] = useState<Estado>('loading')
    const [calificacion, setCalificacion] = useState(r ? parseInt(r) : 0)
    const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null)
    const [comentario, setComentario] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [hoverStar, setHoverStar] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (!t) { setEstado('error'); setErrorMsg('Enlace sin token. Usá el botón del email.'); return }
        const rating = r ? parseInt(r) : 0
        if (rating >= 4) {
            // Auto-submit para ratings altos — mínima fricción
            submitFeedback(rating, t)
        } else {
            // Mostrar formulario para ratings bajos (comentario opcional) o sin rating
            setEstado(rating > 0 ? 'comentario' : 'seleccion')
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function submitFeedback(rating: number, token: string, comentarioText?: string) {
        setEnviando(true)
        try {
            const res = await fetch('/api/feedback/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, calificacion: rating, comentario: comentarioText }),
            })
            const data = await res.json()
            if (!res.ok) {
                setEstado('error')
                setErrorMsg(data.error || 'Error al procesar la encuesta')
                return
            }
            setCalificacion(rating)
            setGoogleMapsUrl(data.googleMapsUrl)
            setEstado('gracias')
        } catch {
            setEstado('error')
            setErrorMsg('Error de conexión. Intentá de nuevo.')
        } finally {
            setEnviando(false)
        }
    }

    function handleStarClick(n: number) {
        setCalificacion(n)
        if (n >= 4) {
            submitFeedback(n, t!)
        } else {
            setEstado('comentario')
        }
    }

    if (estado === 'loading') {
        return (
            <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400" />
            </div>
        )
    }

    if (estado === 'error') {
        return (
            <Shell>
                <div className="text-5xl mb-4">😕</div>
                <h1 className="text-lg font-bold text-slate-800 mb-2">Enlace inválido o expirado</h1>
                <p className="text-slate-500 text-sm">{errorMsg || 'Este enlace ya no está disponible. Los links de encuesta expiran después de 7 días.'}</p>
            </Shell>
        )
    }

    if (estado === 'seleccion') {
        const stars = hoverStar || calificacion
        return (
            <Shell>
                <div className="text-4xl mb-3">☕</div>
                <h1 className="text-xl font-bold text-slate-800 mb-1">¿Cómo estuvo tu visita?</h1>
                <p className="text-slate-500 text-sm mb-6">Elegí una calificación</p>
                <div className="flex justify-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map(n => (
                        <button
                            key={n}
                            onClick={() => handleStarClick(n)}
                            onMouseEnter={() => setHoverStar(n)}
                            onMouseLeave={() => setHoverStar(0)}
                            disabled={enviando}
                            className="text-4xl transition-transform hover:scale-125 disabled:opacity-50"
                            aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
                        >
                            {n <= stars ? '⭐' : '☆'}
                        </button>
                    ))}
                </div>
                {stars > 0 && (
                    <p className="text-slate-400 text-sm mt-1">{ESTRELLAS[stars]} {stars} estrella{stars > 1 ? 's' : ''}</p>
                )}
            </Shell>
        )
    }

    if (estado === 'comentario') {
        return (
            <Shell>
                <div className="text-3xl mb-2">
                    {[1, 2, 3, 4, 5].map(n => n <= calificacion ? '⭐' : '☆').join('')}
                </div>
                <h1 className="text-lg font-bold text-slate-800 mb-1">¿Qué podemos mejorar?</h1>
                <p className="text-slate-500 text-sm mb-4">Tu opinión nos ayuda a crecer (opcional)</p>
                <textarea
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    placeholder="Contanos qué pasó..."
                    rows={4}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:border-blue-400 mb-4"
                />
                <div className="flex gap-3">
                    <button
                        onClick={() => submitFeedback(calificacion, t!, comentario.trim() || undefined)}
                        disabled={enviando}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold text-sm transition-colors"
                    >
                        {enviando ? 'Enviando…' : 'Enviar'}
                    </button>
                    <button
                        onClick={() => submitFeedback(calificacion, t!)}
                        disabled={enviando}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 rounded-xl py-2.5 font-semibold text-sm transition-colors"
                    >
                        Omitir
                    </button>
                </div>
            </Shell>
        )
    }

    // Estado 'gracias'
    return (
        <Shell>
            <div className="text-5xl mb-4">{calificacion >= 4 ? '🎉' : '🙏'}</div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">
                {calificacion >= 4 ? '¡Gracias por tu calificación!' : '¡Gracias por tu opinión!'}
            </h1>
            <p className="text-slate-500 text-sm mb-6">
                {calificacion >= 4
                    ? 'Nos alegra que hayas tenido una buena experiencia.'
                    : 'Tomamos nota de tu feedback para seguir mejorando.'}
            </p>
            {googleMapsUrl && (
                <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-colors text-center"
                >
                    ⭐ Dejar reseña en Google Maps
                </a>
            )}
        </Shell>
    )
}

function Shell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
                <div className="mb-1 text-sm font-semibold text-slate-400 uppercase tracking-wide">Coques Bakery</div>
                {children}
            </div>
        </div>
    )
}

export default function EncuestaPage() {
    return (
        <Suspense>
            <EncuestaContent />
        </Suspense>
    )
}
