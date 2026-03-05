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
  estado: 'PENDIENTE' | 'COMPLETO' | 'CONFIRMADO' | 'CANCELADO' | 'PERDIDO'
  notasCliente: string | null
  notasInternas: string | null
  motivoPerdido: string | null
  creadoEn: string
  actualizadoEn: string
  confirmadoEn: string | null
  wooOrderId: number | null
}

export default function PresupuestoPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = params.codigo as string

  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [mostrarModalPerdido, setMostrarModalPerdido] = useState(false)
  const [motivoPerdido, setMotivoPerdido] = useState('')
  const [marcandoPerdido, setMarcandoPerdido] = useState(false)

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

      setPresupuesto(data.presupuesto)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar presupuesto')
    } finally {
      setCargando(false)
    }
  }

  async function confirmarPresupuesto() {
    if (!confirm('¿Estás seguro de confirmar este presupuesto? Se creará el pedido en WooCommerce.')) {
      return
    }

    setConfirmando(true)
    setError(null)

    try {
      const response = await fetch(`/api/presupuestos/${codigo}/confirmar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar presupuesto')
      }

      alert(`Presupuesto confirmado exitosamente!\nPedido #${data.pedido.numero} creado.`)
      cargarPresupuesto() // Recargar para ver el estado actualizado
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al confirmar presupuesto')
    } finally {
      setConfirmando(false)
    }
  }

  async function marcarComoPerdido() {
    if (!motivoPerdido.trim()) {
      alert('Debe ingresar una razón para marcar el presupuesto como perdido')
      return
    }

    setMarcandoPerdido(true)
    setError(null)

    try {
      const response = await fetch(`/api/presupuestos/${codigo}/marcar-perdido`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivoPerdido: motivoPerdido.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al marcar presupuesto como perdido')
      }

      alert('Presupuesto marcado como perdido exitosamente')
      setMostrarModalPerdido(false)
      setMotivoPerdido('')
      cargarPresupuesto() // Recargar para ver el estado actualizado
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al marcar presupuesto como perdido')
    } finally {
      setMarcandoPerdido(false)
    }
  }

  function formatearPrecio(precio: number): string {
    return precio.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        <BackButton href="/local/presupuestos" label="Volver a Presupuestos" />
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

  const estadoColores = {
    PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    COMPLETO: 'bg-blue-100 text-blue-800 border-blue-300',
    CONFIRMADO: 'bg-green-100 text-green-800 border-green-300',
    CANCELADO: 'bg-red-100 text-red-800 border-red-300',
    PERDIDO: 'bg-orange-100 text-orange-800 border-orange-300'
  }

  const estadoIconos = {
    PENDIENTE: '⏳',
    COMPLETO: '✅',
    CONFIRMADO: '🎉',
    CANCELADO: '❌',
    PERDIDO: '📉'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <BackButton href="/local/presupuestos" label="Volver a Presupuestos" />

      <div className="max-w-4xl mx-auto px-4 pt-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Presupuesto {presupuesto.codigo}
              </h1>
              <p className="text-sm text-gray-600">
                Creado: {formatearFecha(presupuesto.creadoEn)}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-semibold border-2 ${estadoColores[presupuesto.estado]}`}>
              {estadoIconos[presupuesto.estado]} {presupuesto.estado}
            </span>
          </div>

          {/* Información del cliente */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-700 mb-2">Datos del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {presupuesto.nombreCliente && (
                <div>
                  <span className="text-gray-600">Nombre:</span>
                  <p className="font-medium">{presupuesto.nombreCliente}</p>
                </div>
              )}
              {presupuesto.telefonoCliente && (
                <div>
                  <span className="text-gray-600">Teléfono:</span>
                  <p className="font-medium">{presupuesto.telefonoCliente}</p>
                </div>
              )}
              {presupuesto.emailCliente && (
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium">{presupuesto.emailCliente}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fecha de entrega */}
          {(presupuesto.fechaEntrega || presupuesto.horaEntrega) && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Entrega</h3>
              <div className="flex gap-4 text-sm">
                {presupuesto.fechaEntrega && (
                  <div>
                    <span className="text-gray-600">Fecha:</span>
                    <p className="font-medium">
                      {new Date(presupuesto.fechaEntrega).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                )}
                {presupuesto.horaEntrega && (
                  <div>
                    <span className="text-gray-600">Horario:</span>
                    <p className="font-medium">{presupuesto.horaEntrega} hs</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Items del presupuesto */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-bold text-lg text-gray-800 mb-4">
            Productos ({presupuesto.items.length})
          </h3>
          <div className="space-y-4">
            {presupuesto.items.map((item: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-800">{item.nombre}</h4>
                  <span className="text-sm text-gray-600">Cantidad: {item.cantidad}</span>
                </div>

                {/* Add-ons */}
                {item.addOns && Object.keys(item.addOns).length > 0 && (
                  <div className="mt-2">
                    {Object.entries(item.addOns).map(([nombre, opciones]: [string, any]) => (
                      <div key={nombre} className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">{nombre}:</span>{' '}
                        {Array.isArray(opciones)
                          ? opciones.map(o => o.etiqueta).join(', ')
                          : 'N/A'}
                      </div>
                    ))}
                  </div>
                )}

                {/* Campos de texto personalizados */}
                {item.camposTexto && Object.keys(item.camposTexto).length > 0 && (
                  <div className="mt-2">
                    {Object.entries(item.camposTexto).map(([nombre, valor]) => (
                      <div key={nombre} className="text-sm text-gray-600">
                        <span className="font-medium">{nombre}:</span> {valor as string}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Precio unitario: ${formatearPrecio(item.precio)}
                  </span>
                  <span className="font-semibold text-green-600">
                    Total: ${formatearPrecio(item.precio * item.cantidad)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de precios */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-bold text-lg text-gray-800 mb-4">Resumen</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">${formatearPrecio(presupuesto.precioTotal + presupuesto.descuento)}</span>
            </div>
            {presupuesto.descuento > 0 && (
              <div className="flex justify-between text-purple-700">
                <span>Descuento:</span>
                <span className="font-semibold">-${formatearPrecio(presupuesto.descuento)}</span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between text-xl font-bold text-gray-800">
                <span>Total:</span>
                <span className="text-green-600">${formatearPrecio(presupuesto.precioTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        {presupuesto.notasCliente && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Notas del Cliente</h3>
            <p className="text-gray-700">{presupuesto.notasCliente}</p>
          </div>
        )}

        {/* Acciones */}
        {presupuesto.estado !== 'CONFIRMADO' && presupuesto.estado !== 'CANCELADO' && presupuesto.estado !== 'PERDIDO' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/local/presupuestos/${codigo}/editar`)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                ✏️ Editar Presupuesto
              </button>

              <button
                onClick={confirmarPresupuesto}
                disabled={confirmando}
                className={`w-full py-3 rounded-lg font-bold transition-colors ${confirmando
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
              >
                {confirmando ? 'Confirmando...' : '✅ Confirmar Presupuesto'}
              </button>

              <button
                onClick={() => setMostrarModalPerdido(true)}
                className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                ❌ Marcar como Perdido
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-3 text-center">
              Podés editar el presupuesto para completar información antes de confirmar
            </p>
          </div>
        )}

        {/* Info de pedido confirmado */}
        {presupuesto.estado === 'CONFIRMADO' && presupuesto.wooOrderId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="text-center">
              <span className="text-4xl mb-2 block">🎉</span>
              <h3 className="font-bold text-lg text-green-800 mb-2">
                Presupuesto Confirmado
              </h3>
              <p className="text-green-700">
                Pedido WooCommerce ID: <strong>#{presupuesto.wooOrderId}</strong>
              </p>
              {presupuesto.confirmadoEn && (
                <p className="text-sm text-green-600 mt-2">
                  Confirmado el {formatearFecha(presupuesto.confirmadoEn)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info de presupuesto perdido */}
        {presupuesto.estado === 'PERDIDO' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="text-center">
              <span className="text-4xl mb-2 block">📉</span>
              <h3 className="font-bold text-lg text-orange-800 mb-2">
                Presupuesto Perdido
              </h3>
              {presupuesto.motivoPerdido && (
                <div className="mt-4 bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Razón:</p>
                  <p className="text-gray-800 font-medium">{presupuesto.motivoPerdido}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}
      </div>

      {/* Modal para marcar como perdido */}
      {mostrarModalPerdido && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setMostrarModalPerdido(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Marcar Presupuesto como Perdido
            </h3>
            
            <p className="text-gray-600 mb-4">
              Indicá la razón por la cual este presupuesto se perdió:
            </p>

            <textarea
              value={motivoPerdido}
              onChange={(e) => setMotivoPerdido(e.target.value)}
              placeholder="Ej: Cliente eligió otra pastelería, precio muy alto, cambió de opinión..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
            />
            
            <p className="text-xs text-gray-500 mt-1 mb-4">
              {motivoPerdido.length}/500 caracteres
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMostrarModalPerdido(false)
                  setMotivoPerdido('')
                }}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-colors"
                disabled={marcandoPerdido}
              >
                Cancelar
              </button>

              <button
                onClick={marcarComoPerdido}
                disabled={marcandoPerdido || !motivoPerdido.trim()}
                className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
                  marcandoPerdido || !motivoPerdido.trim()
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {marcandoPerdido ? 'Marcando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
