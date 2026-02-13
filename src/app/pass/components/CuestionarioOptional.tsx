'use client'
import { useState } from 'react'

interface Props {
  fechaCumpleanos?: string
  fuenteConocimiento?: string
  onComplete: () => void
}

const FUENTES = ['Amigos', 'Instagram', 'Google Maps', 'Vi luz y entré']

export default function CuestionarioOptional({
  fechaCumpleanos,
  fuenteConocimiento,
  onComplete,
}: Props) {
  const [fecha, setFecha] = useState(fechaCumpleanos || '')
  const [fuente, setFuente] = useState(fuenteConocimiento || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Solo mostrar si falta algún dato
  const faltaFecha = !fechaCumpleanos
  const faltaFuente = !fuenteConocimiento
  
  if (!faltaFecha && !faltaFuente) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (faltaFecha && !fecha) {
      setError('Por favor ingresá tu fecha de cumpleaños')
      return
    }

    if (faltaFuente && !fuente) {
      setError('Por favor seleccioná cómo nos conociste')
      return
    }

    setGuardando(true)

    try {
      const token = localStorage.getItem('fidelizacion_token')
      const res = await fetch('/api/perfil/cuestionario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fechaCumpleanos: faltaFecha ? fecha : undefined,
          fuenteConocimiento: faltaFuente ? fuente : undefined,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        alert(json.message) // Mensaje de éxito con visita extra
        onComplete() // Refrescar datos del pass
      } else {
        const json = await res.json()
        setError(json.error || 'Error al guardar')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl shadow-sm p-4 mb-4 border-2 border-green-200">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-2xl">🎁</span>
        <div className="flex-1">
          <h3 className="font-bold text-green-800">¡Completá tu perfil!</h3>
          <p className="text-sm text-green-700">
            Ganás <strong>1 visita extra</strong> hacia tu próximo nivel
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {faltaFecha && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📅 Fecha de cumpleaños
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-white border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none"
              required={faltaFecha}
            />
          </div>
        )}

        {faltaFuente && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              💡 ¿Cómo nos conociste?
            </label>
            <select
              value={fuente}
              onChange={(e) => setFuente(e.target.value)}
              className="w-full bg-white border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none"
              required={faltaFuente}
            >
              <option value="">Seleccioná una opción</option>
              {FUENTES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {guardando ? 'Guardando...' : '✓ Completar'}
        </button>
      </form>
    </div>
  )
}
