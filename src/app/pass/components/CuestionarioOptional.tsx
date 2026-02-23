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
  // Parsear fecha existente si la hay
  const fechaExistente = fechaCumpleanos ? new Date(fechaCumpleanos) : null
  
  const [dia, setDia] = useState(fechaExistente ? fechaExistente.getDate().toString() : '')
  const [mes, setMes] = useState(fechaExistente ? (fechaExistente.getMonth() + 1).toString() : '')
  const [anio, setAnio] = useState(fechaExistente ? fechaExistente.getFullYear().toString() : '')
  const [fuente, setFuente] = useState(fuenteConocimiento || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Solo mostrar si falta algún dato
  const faltaFecha = !fechaCumpleanos
  const faltaFuente = !fuenteConocimiento
  
  if (!faltaFecha && !faltaFuente) return null

  // Generar arrays para los selectores
  const dias = Array.from({ length: 31 }, (_, i) => (i + 1).toString())
  const meses = [
    { valor: '1', nombre: 'Enero' },
    { valor: '2', nombre: 'Febrero' },
    { valor: '3', nombre: 'Marzo' },
    { valor: '4', nombre: 'Abril' },
    { valor: '5', nombre: 'Mayo' },
    { valor: '6', nombre: 'Junio' },
    { valor: '7', nombre: 'Julio' },
    { valor: '8', nombre: 'Agosto' },
    { valor: '9', nombre: 'Septiembre' },
    { valor: '10', nombre: 'Octubre' },
    { valor: '11', nombre: 'Noviembre' },
    { valor: '12', nombre: 'Diciembre' },
  ]
  
  // Generar años desde 1930 hasta el año actual - 18 (mayoría de edad)
  const anioActual = new Date().getFullYear()
  const anios = Array.from({ length: anioActual - 1930 + 1 }, (_, i) => (anioActual - i).toString())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (faltaFecha && (!dia || !mes || !anio)) {
      setError('Por favor completá día, mes y año de tu cumpleaños')
      return
    }

    if (faltaFuente && !fuente) {
      setError('Por favor seleccioná cómo nos conociste')
      return
    }

    // Construir fecha en formato ISO (YYYY-MM-DD)
    let fechaCompleta = ''
    if (faltaFecha && dia && mes && anio) {
      const diaFormateado = dia.padStart(2, '0')
      const mesFormateado = mes.padStart(2, '0')
      fechaCompleta = `${anio}-${mesFormateado}-${diaFormateado}`
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
          fechaCumpleanos: faltaFecha ? fechaCompleta : undefined,
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Fecha de cumpleaños
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Día */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Día</label>
                <select
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-2 py-2 focus:border-green-500 focus:outline-none text-sm"
                  required={faltaFecha}
                >
                  <option value="">-</option>
                  {dias.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mes */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Mes</label>
                <select
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-2 py-2 focus:border-green-500 focus:outline-none text-sm"
                  required={faltaFecha}
                >
                  <option value="">-</option>
                  {meses.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Año */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Año</label>
                <select
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-2 py-2 focus:border-green-500 focus:outline-none text-sm"
                  required={faltaFecha}
                >
                  <option value="">-</option>
                  {anios.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Seleccioná primero el año para facilitar la navegación
            </p>
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
