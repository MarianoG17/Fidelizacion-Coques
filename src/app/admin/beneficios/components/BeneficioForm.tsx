// src/app/admin/beneficios/components/BeneficioForm.tsx
import { useState, useEffect } from 'react'

interface Beneficio {
  id: string
  nombre: string
  descripcionCaja: string
  tipo: string
  descuento: number | null
  icono: string
  descripcion: string
  maxPorDia: number
  activo: boolean
  niveles: Array<{ id: string; nombre: string; orden: number }>
}

interface BeneficioFormProps {
  beneficio: Beneficio | null
  adminKey: string
  onGuardar: () => void
  onCancelar: () => void
}

interface Nivel {
  id: string
  nombre: string
  orden: number
}

export function BeneficioForm({ beneficio, adminKey, onGuardar, onCancelar }: BeneficioFormProps) {
  const [nombre, setNombre] = useState('')
  const [descripcionCaja, setDescripcionCaja] = useState('')
  const [tipo, setTipo] = useState<string>('PRODUCTO_GRATIS')
  const [descuento, setDescuento] = useState<number>(0)
  const [icono, setIcono] = useState('🎁')
  const [descripcion, setDescripcion] = useState('')
  const [maxPorDia, setMaxPorDia] = useState<number>(1)
  const [usoUnico, setUsoUnico] = useState(false)
  const [activo, setActivo] = useState(true)
  const [nivelesSeleccionados, setNivelesSeleccionados] = useState<string[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarNiveles()
    if (beneficio) {
      setNombre(beneficio.nombre)
      setDescripcionCaja(beneficio.descripcionCaja)
      setTipo(beneficio.tipo)
      setDescuento(beneficio.descuento ? beneficio.descuento * 100 : 0)
      setIcono(beneficio.icono)
      setDescripcion(beneficio.descripcion)
      setMaxPorDia(beneficio.maxPorDia)
      setUsoUnico((beneficio as any).usoUnico || false)
      setActivo(beneficio.activo)
      setNivelesSeleccionados(beneficio.niveles.map((n) => n.id))
    }
  }, [beneficio])

  async function cargarNiveles() {
    try {
      const res = await fetch('/api/admin/niveles', {
        headers: { 'x-admin-key': adminKey },
      })
      if (res.ok) {
        const data = await res.json()
        // Usar niveles directamente desde la tabla Nivel
        const nivelesData = data.data.map((nivel: any) => ({
          id: nivel.id,
          nombre: nivel.nombre,
          orden: nivel.orden,
        }))
        setNiveles(nivelesData)
      }
    } catch (err) {
      console.error('Error al cargar niveles:', err)
    }
  }

  function toggleNivel(nivelId: string) {
    if (nivelesSeleccionados.includes(nivelId)) {
      setNivelesSeleccionados(nivelesSeleccionados.filter((id) => id !== nivelId))
    } else {
      setNivelesSeleccionados([...nivelesSeleccionados, nivelId])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!nombre.trim() || !descripcionCaja.trim()) {
      setError('Nombre y descripción para caja son obligatorios')
      return
    }

    if (tipo === 'DESCUENTO' && (descuento <= 0 || descuento > 100)) {
      setError('El descuento debe estar entre 1% y 100%')
      return
    }

    if (nivelesSeleccionados.length === 0) {
      setError('Seleccioná al menos un nivel')
      return
    }

    setLoading(true)

    try {
      const body = {
        nombre,
        descripcionCaja,
        tipo,
        descuento: tipo === 'DESCUENTO' ? descuento / 100 : null,
        icono,
        descripcion,
        maxPorDia,
        usoUnico,
        activo,
        niveles: nivelesSeleccionados,
      }

      const url = beneficio
        ? `/api/admin/beneficios/${beneficio.id}`
        : '/api/admin/beneficios'
      
      const method = beneficio ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        onGuardar()
      } else {
        const data = await res.json()
        setError(data.error || 'Error al guardar beneficio')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const iconosSugeridos = ['🥤', '🔥', '🎖️', '☕', '🍰', '🎁', '⭐', '💎', '🎉', '🏆', '💰', '🎂']

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {beneficio ? 'Editar Beneficio' : 'Crear Beneficio'}
          </h2>
          <button
            onClick={onCancelar}
            className="text-slate-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nombre del Beneficio *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Agua de cortesía"
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Descripción Caja */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descripción para Caja (Aires IT) *
            </label>
            <input
              type="text"
              value={descripcionCaja}
              onChange={(e) => setDescripcionCaja(e.target.value)}
              placeholder="Ej: Agua gratis - Beneficio nivel"
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Texto que aparecerá en el sistema de caja
            </p>
          </div>

          {/* Tipo y Descuento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tipo de Beneficio *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PRODUCTO_GRATIS">Producto Gratis</option>
                <option value="DESCUENTO">Descuento</option>
                <option value="UPGRADE">Upgrade</option>
                <option value="ACCESO_VIP">Acceso VIP</option>
              </select>
            </div>

            {tipo === 'DESCUENTO' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descuento (%) *
                </label>
                <input
                  type="number"
                  value={descuento}
                  onChange={(e) => setDescuento(Number(e.target.value))}
                  min="1"
                  max="100"
                  placeholder="10"
                  className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Ícono */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ícono
            </label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {iconosSugeridos.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcono(emoji)}
                  className={`text-2xl p-2 rounded-lg transition ${
                    icono === emoji
                      ? 'bg-blue-600 ring-2 ring-blue-400'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={icono}
              onChange={(e) => setIcono(e.target.value)}
              placeholder="O escribí un emoji"
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descripción para Cliente
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Vaso de agua de cortesía con el almuerzo"
              rows={2}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Límite diario y Uso único */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Límite de Usos por Día
              </label>
              <input
                type="number"
                value={maxPorDia}
                onChange={(e) => setMaxPorDia(Number(e.target.value))}
                min="0"
                placeholder="1"
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                0 = sin límite (ej: acceso VIP)
              </p>
            </div>

            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="usoUnico"
                  checked={usoUnico}
                  onChange={(e) => setUsoUnico(e.target.checked)}
                  className="w-5 h-5 rounded bg-slate-700 border-slate-600 accent-purple-600"
                />
                <label htmlFor="usoUnico" className="text-slate-300 font-medium">
                  Uso único
                </label>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 -mt-4">
            Si está marcado, el beneficio solo se puede usar una vez en total (ej: descuento de bienvenida)
          </p>

          {/* Niveles */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Niveles con Acceso *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {niveles.map((nivel) => (
                <button
                  key={nivel.id}
                  type="button"
                  onClick={() => toggleNivel(nivel.id)}
                  className={`p-4 rounded-xl font-medium transition ${
                    nivelesSeleccionados.includes(nivel.id)
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {nivel.nombre === 'Bronce' && '🥉'}
                  {nivel.nombre === 'Plata' && '🥈'}
                  {nivel.nombre === 'Oro' && '🥇'}
                  <div className="text-sm mt-1">{nivel.nombre}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="activo"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600"
            />
            <label htmlFor="activo" className="text-slate-300 font-medium">
              Beneficio activo
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 bg-slate-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-600 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : beneficio ? 'Actualizar' : 'Crear Beneficio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
