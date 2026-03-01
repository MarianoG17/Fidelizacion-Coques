'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface FeedbackConfig {
  feedbackHabilitado: boolean
  feedbackTiempoVisitaMinutos: number
  feedbackDiasPedidoTorta: number
  feedbackFrecuenciaDias: number
  feedbackMinEstrellas: number
  googleMapsUrl: string
}

interface FeedbackTrigger {
  type: 'VISITA_FISICA' | 'PEDIDO_TORTA'
  timestamp: number
  pedidoId?: number
}

export default function FeedbackModal() {
  const { data: session } = useSession()
  const [show, setShow] = useState(false)
  const [trigger, setTrigger] = useState<FeedbackTrigger | null>(null)
  const [config, setConfig] = useState<FeedbackConfig | null>(null)
  const [rating, setRating] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!session?.user) return

    // Cargar configuración
    fetch('/api/configuracion/feedback')
      .then(r => r.json())
      .then(data => {
        setConfig(data.config)
        if (data.config.feedbackHabilitado) {
          startChecking()
        }
      })
      .catch(err => console.error('Error al cargar config feedback:', err))
  }, [session])

  // Listener para abrir desde notificaciones
  useEffect(() => {
    function handleOpenFeedback() {
      console.log('[FEEDBACK] Abriendo modal desde notificación')
      const ultimoScan = localStorage.getItem('ultimo_scan')
      if (ultimoScan) {
        setTrigger({
          type: 'VISITA_FISICA',
          timestamp: parseInt(ultimoScan)
        })
        setShow(true)
        localStorage.setItem('feedback_scan_visto', 'true')
      }
    }

    window.addEventListener('openFeedbackModal', handleOpenFeedback)
    return () => window.removeEventListener('openFeedbackModal', handleOpenFeedback)
  }, [])

  function startChecking() {
    // Verificar inmediatamente
    checkVisitaFisica()
    checkPedidosTortas()

    // Timer para verificar cada minuto
    const interval = setInterval(() => {
      checkVisitaFisica()
      checkPedidosTortas()
    }, 60000) // 1 minuto

    return () => clearInterval(interval)
  }

  async function checkVisitaFisica() {
    if (!config) return

    const ultimoScan = localStorage.getItem('ultimo_scan')
    const feedbackVisto = localStorage.getItem('feedback_scan_visto')

    if (!ultimoScan || feedbackVisto) return

    // Verificar frecuencia mínima
    const ultimoFeedbackStr = localStorage.getItem('ultimo_feedback_timestamp')
    if (ultimoFeedbackStr) {
      const diasDesde = (Date.now() - parseInt(ultimoFeedbackStr)) / (1000 * 60 * 60 * 24)
      if (diasDesde < config.feedbackFrecuenciaDias) {
        return // Muy pronto para otro feedback
      }
    }

    const tiempoTranscurrido = Date.now() - parseInt(ultimoScan)
    const tiempoEspera = config.feedbackTiempoVisitaMinutos * 60 * 1000
    const unaHora = 60 * 60 * 1000

    // Mostrar después del tiempo configurado pero antes de 1 hora
    if (tiempoTranscurrido > tiempoEspera && tiempoTranscurrido < unaHora) {
      setTrigger({
        type: 'VISITA_FISICA',
        timestamp: parseInt(ultimoScan)
      })
      setShow(true)
      localStorage.setItem('feedback_scan_visto', 'true')
      localStorage.removeItem('ultimo_scan')
    }
  }

  async function checkPedidosTortas() {
    if (!config) return

    try {
      const res = await fetch('/api/pedidos/pendientes-feedback')
      if (!res.ok) return

      const data = await res.json()

      if (data.pedidos && data.pedidos.length > 0) {
        const pedido = data.pedidos[0]

        // Verificar frecuencia mínima
        const ultimoFeedbackStr = localStorage.getItem('ultimo_feedback_timestamp')
        if (ultimoFeedbackStr) {
          const diasDesde = (Date.now() - parseInt(ultimoFeedbackStr)) / (1000 * 60 * 60 * 24)
          if (diasDesde < config.feedbackFrecuenciaDias) {
            return
          }
        }

        setTrigger({
          type: 'PEDIDO_TORTA',
          timestamp: Date.now(),
          pedidoId: pedido.id
        })
        setShow(true)
      }
    } catch (err) {
      console.error('Error al verificar pedidos:', err)
    }
  }

  async function handleSubmit() {
    if (rating === 0 || !trigger || !config) return

    setEnviando(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calificacion: rating,
          comentario: comentario || null,
          eventoScanId: null, // Por ahora null, se asignará al primer local
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('[FEEDBACK] Error del servidor:', errorData)
        throw new Error(errorData.error || 'Error al enviar feedback')
      }

      const data = await res.json()
      console.log('[FEEDBACK] Respuesta exitosa:', data)

      // Guardar timestamp del último feedback
      localStorage.setItem('ultimo_feedback_timestamp', Date.now().toString())

      // Si es rating alto, redirigir a Google Maps
      if (rating >= config.feedbackMinEstrellas && config.googleMapsUrl) {
        window.open(config.googleMapsUrl, '_blank')
      }

      setShow(false)
      setRating(0)
      setComentario('')
      setTrigger(null)
    } catch (err: any) {
      console.error('[FEEDBACK] Error al enviar feedback:', err)
      alert(`Error al enviar tu opinión: ${err.message}`)
    } finally {
      setEnviando(false)
    }
  }

  function handleClose() {
    setShow(false)
    setRating(0)
    setComentario('')

    // Si era feedback de scan, marcarlo como visto para no volver a mostrar
    if (trigger?.type === 'VISITA_FISICA') {
      localStorage.setItem('feedback_scan_visto', 'true')
    }

    setTrigger(null)
  }

  if (!show || !trigger || !config) return null

  const titulo = trigger.type === 'VISITA_FISICA'
    ? '¿Cómo fue tu experiencia en Coques?'
    : '¿Cómo estuvo tu torta? 🎂'

  const subtitulo = trigger.type === 'VISITA_FISICA'
    ? 'Contanos cómo estuvo todo hoy'
    : 'Tu opinión nos ayuda a mejorar'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">
            {trigger.type === 'VISITA_FISICA' ? '☕' : '🎂'}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{titulo}</h2>
          <p className="text-gray-600 mt-1">{subtitulo}</p>
        </div>

        {/* Estrellas */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <svg
                className={`w-12 h-12 ${star <= rating ? 'fill-yellow-400' : 'fill-gray-300'
                  }`}
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </button>
          ))}
        </div>

        {/* Rating text */}
        {rating > 0 && (
          <p className="text-center text-sm text-gray-600 mb-4">
            {rating >= config.feedbackMinEstrellas ? (
              <span className="text-green-600 font-medium">
                ✨ ¡Gracias! Te redirigiremos a Google Maps para que puedas compartir tu experiencia
              </span>
            ) : (
              <span className="text-orange-600 font-medium">
                Gracias por tu honestidad. ¿Qué podemos mejorar?
              </span>
            )}
          </p>
        )}

        {/* Comentario (solo si rating <= 3) */}
        {rating > 0 && rating < config.feedbackMinEstrellas && (
          <div className="mb-4">
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Contanos qué podemos mejorar..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={4}
            />
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || enviando}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
