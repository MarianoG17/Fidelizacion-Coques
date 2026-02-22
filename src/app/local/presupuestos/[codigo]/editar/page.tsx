'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'

interface Presupuesto {
  id: number
  codigo: string
  nombreCliente: string | null
  telefonoCliente: string | null
  emailCliente: string | null
  items: any[]
  precioTotal: number
  descuento: number
  fechaEntrega: string | null
  horaEntrega: string | null
  estado: 'PENDIENTE' | 'COMPLETO' | 'CONFIRMADO' | 'CANCELADO'
  notasCliente: string | null
  notasInternas: string | null
}

export default function EditarPresupuestoPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = params.codigo as string
  
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados editables
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [horaEntrega, setHoraEntrega] = useState('')
  const [notasCliente, setNotasCliente] = useState('')
  const [notasInternas, setNotasInternas] = useState('')

  useEffect(() => {
    cargarPresupuesto()
  }, [codigo])

  async function cargarPresupuesto() {
    setCargando(true)
    setError(null)

    try {
      const response = await fetch(`/api/presupuestos/${codigo}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar presupuesto')
      }

      const p = data.presupuesto
      setPresupuesto(p)
      
      // Inicializar campos editables
      setNombreCliente(p.nombreCliente || '')
      setTelefonoCliente(p.telefonoCliente || '')
      setEmailCliente(p.emailCliente || '')
      setFechaEntrega(p.fechaEntrega ? p.fechaEntrega.split('T')[0] : '')
      setHoraEntrega(p.horaEntrega || '')
      setNotasCliente(p.notasCliente || '')
      setNotasInternas(p.notasInternas || '')
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar presupuesto')
    } finally {
      setCargando(false)
    }
  }

  async function guardarCambios() {
    setGuardando(true)
    setError(null)

    try {
      const response = await fetch(`/api/presupuestos/${codigo}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombreCliente: nombreCliente.trim() || null,
          telefonoCliente: telefonoCliente.trim() || null,
          emailCliente: emailCliente.trim() || null,
          fechaEntrega: fechaEntrega || null,
          horaEntrega: horaEntrega || null,
          notasCliente: notasCliente.trim() || null,
          notasInternas: notasInternas.trim() || null,
          estado: fechaEntrega && horaEntrega && nombreCliente && telefonoCliente ? 'COMPLETO' : 'PENDIENTE'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar cambios')
      }

      alert('✅ Cambios guardados exitosamente')
      router.push(`/local/presupuestos/${codigo}`)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al guardar cambios')
    } finally {
      setGuardando(false)
    }
  }

  function obtenerHorariosDisponibles(): string[] {
    return [
      '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00',
    ]
  }

  function formatearPrecio(precio: number): string {
    return precio.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-transparent"></div>
      </div>
    )
  }

  if (error || !presupuesto) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BackButton />
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <span className="text-4xl mb-4 block">❌</span>
            <h2 className="text-xl font-bold text-red-800 mb-2">
              Error al cargar presupuesto
            </h2>
            <p className="text-red-600">{error || 'Presupuesto no encontrado'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (presupuesto.estado === 'CONFIRMADO') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BackButton />
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h2 className="text-xl font-bold text-yellow-800 mb-2">
              Presupuesto Ya Confirmado
            </h2>
            <p className="text-yellow-700 mb-4">
              No se puede editar un presupuesto que ya fue confirmado
            </p>
            <button
              onClick={() => router.push(`/local/presupuestos/${codigo}`)}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700"
            >
              Ver Presupuesto
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <BackButton />
      
      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            ✏️ Editar Presupuesto
          </h1>
          <p className="text-lg text-gray-600 font-mono">
            {presupuesto.codigo}
          </p>
        </div>

        {/* Formulario de edición */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4">
            Datos del Cliente
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                value={telefonoCliente}
                onChange={(e) => setTelefonoCliente(e.target.value)}
                placeholder="+54 9 11 1234-5678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email (opcional)
              </label>
              <input
                type="email"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Fecha y hora de entrega */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4">
            Entrega
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de Entrega *
              </label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Horario de Entrega *
              </label>
              <select
                value={horaEntrega}
                onChange={(e) => setHoraEntrega(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar horario</option>
                {obtenerHorariosDisponibles().map((hora) => (
                  <option key={hora} value={hora}>
                    {hora} hs
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4">
            Notas
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notas del Cliente
              </label>
              <textarea
                value={notasCliente}
                onChange={(e) => setNotasCliente(e.target.value)}
                placeholder="Ej: Sin nueces, decoración especial..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notas Internas (solo staff)
              </label>
              <textarea
                value={notasInternas}
                onChange={(e) => setNotasInternas(e.target.value)}
                placeholder="Notas internas del staff..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Resumen de productos (solo lectura) */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-3">
            Productos ({presupuesto.items.length})
          </h3>
          <div className="space-y-2">
            {presupuesto.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.nombre} x{item.cantidad}</span>
                <span className="font-semibold text-gray-800">
                  ${formatearPrecio(item.precio * item.cantidad)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-300 mt-3 pt-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-green-600">${formatearPrecio(presupuesto.precioTotal)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Para modificar productos, debe crear un nuevo presupuesto
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/local/presupuestos/${codigo}`)}
            className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
              guardando
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}

        {/* Info de ayuda */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Los campos marcados con * son necesarios para poder confirmar el presupuesto. 
            Podés guardar cambios parciales y completar más tarde.
          </p>
        </div>
      </div>
    </div>
  )
}
