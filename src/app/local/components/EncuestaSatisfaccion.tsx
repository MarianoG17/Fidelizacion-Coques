 cer'use client'
import { useState } from 'react'

interface Props {
  clienteId: string
  clienteNombre: string
  onComplete: () => void
  onCancel: () => void
}

const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/n6q5HNELZuwDyT556'

export default function EncuestaSatisfaccion({
  clienteId,
  clienteNombre,
  onComplete,
  onCancel,
}: Props) {
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mostrarGoogleMaps, setMostrarGoogleMaps] = useState(false)

  async function handleSubmit() {
    if (calificacion === 0) {
      alert('Por favor seleccioná una calificación')
      return
    }

    if (calificacion <= 3 && !comentario.trim()) {
      alert('Por favor contanos qué podemos mejorar')
      return
    }

    setEnviando(true)

    try {
      const localKey = localStorage.getItem('local_api_key')
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-api-key': localKey!,
        },
        body: JSON.stringify({
          clienteId,
          calificacion,
          comentario: comentario.trim() || undefined,
          enviadoGoogleMaps: calificacion >= 4,
        }),
      })

      // Si calificación alta, mostrar opción de Google Maps
      if (calificacion >= 4) {
        setMostrarGoogleMaps(true)
      } else {
        // Si calificación baja, cerrar directo
        onComplete()
      }
    } catch (error) {
      console.error('[Encuesta] Error:', error)
      alert('Error al guardar feedback')
    } finally {
      setEnviando(false)
    }
  }

  if (mostrarGoogleMaps) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">⭐</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Gracias por tu calificación!
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Nos ayudarías dejando tu opinión en Google Maps?
            </p>
            <div className="space-y-3">
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onComplete}
                className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
              >
                🗺️ Dejar reseña en Google Maps
              </a>
              <button
                onClick={onComplete}
                className="block w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                Omitir
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          ¿Cómo fue tu experiencia?
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          {clienteNombre}, tu opinión nos ayuda a mejorar
        </p>

        {/* Calificación con estrellas */}
        <div className="mb-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setCalificacion(star)}
                className="text-4xl transition-transform hover:scale-110"
              >
                {star <= calificacion ? '⭐' : '☆'}
              </button>
            ))}
          </div>
          {calificacion > 0 && (
            <p className="text-center text-sm text-gray-600 mt-2">
              {calificacion >= 4 ? '¡Genial!' : 'Queremos mejorar'}
            </p>
          )}
        </div>

        {/* Campo de comentario (solo si calificación baja) */}
        {calificacion > 0 && calificacion <= 3 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Qué podemos mejorar?
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Contanos tu experiencia..."
              rows={3}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-purple-500 focus:outline-none"
            />
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={enviando || calificacion === 0}
            className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
