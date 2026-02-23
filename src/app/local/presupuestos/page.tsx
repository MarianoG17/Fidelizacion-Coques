'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'

interface Presupuesto {
  id: number
  codigo: string
  nombreCliente: string | null
  telefonoCliente: string | null
  estado: 'PENDIENTE' | 'COMPLETO' | 'CONFIRMADO' | 'CANCELADO'
  precioTotal: number
  fechaEntrega: string | null
  horaEntrega: string | null
  createdAt: string
}

export default function PresupuestosLocalPage() {
  const router = useRouter()
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarConfirmados, setMostrarConfirmados] = useState(false)

  useEffect(() => {
    cargarPresupuestos()
  }, [mostrarConfirmados])

  async function cargarPresupuestos() {
    setCargando(true)
    setError(null)

    try {
      // Cargar pendientes o confirmados según el estado del botón
      const estado = mostrarConfirmados ? 'CONFIRMADO' : 'PENDIENTE,COMPLETO'
      const response = await fetch(`/api/presupuestos?estado=${estado}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar presupuestos')
      }

      setPresupuestos(data.presupuestos || [])
    } catch (err: any) {
      setError(err.message || 'Error al cargar presupuestos')
    } finally {
      setCargando(false)
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  function formatearFechaHora(fecha: string): string {
    return new Date(fecha).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const estadoColores = {
    PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    COMPLETO: 'bg-blue-100 text-blue-800 border-blue-300',
    CONFIRMADO: 'bg-green-100 text-green-800 border-green-300',
    CANCELADO: 'bg-red-100 text-red-800 border-red-300'
  }

  const estadoIconos = {
    PENDIENTE: '⏳',
    COMPLETO: '✅',
    CONFIRMADO: '🎉',
    CANCELADO: '❌'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <BackButton href="/local" label="Volver a Staff" />
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                💾 {mostrarConfirmados ? 'Presupuestos Confirmados' : 'Presupuestos Pendientes'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {mostrarConfirmados 
                  ? 'Presupuestos que ya fueron confirmados'
                  : 'Presupuestos en proceso, listos para editar o confirmar'
                }
              </p>
            </div>
            <button
              onClick={() => setMostrarConfirmados(!mostrarConfirmados)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                mostrarConfirmados
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {mostrarConfirmados ? '⏳ Ver Pendientes' : '🎉 Ver Confirmados'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        {/* Loading */}
        {cargando && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-transparent"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}

        {/* Lista de presupuestos */}
        {!cargando && !error && (
          <>
            {presupuestos.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <span className="text-6xl mb-4 block">📋</span>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  No hay presupuestos {mostrarConfirmados ? 'confirmados' : 'pendientes'}
                </h3>
                <p className="text-gray-600">
                  {mostrarConfirmados 
                    ? 'Los presupuestos confirmados aparecerán aquí'
                    : 'Los presupuestos guardados aparecerán aquí'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  {presupuestos.length} presupuesto{presupuestos.length !== 1 ? 's' : ''} {mostrarConfirmados ? 'confirmado' : 'pendiente'}{presupuestos.length !== 1 ? 's' : ''}
                </p>
                
                {presupuestos.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/local/presupuestos/${p.codigo}`)}
                    className="bg-white rounded-lg shadow-md p-5 hover:shadow-xl transition-all cursor-pointer border-l-4 border-purple-500"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg text-gray-800">{p.codigo}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${estadoColores[p.estado]}`}>
                            {estadoIconos[p.estado]} {p.estado}
                          </span>
                        </div>
                        
                        {/* Cliente */}
                        <div className="space-y-1 mb-3">
                          <p className="text-gray-700">
                            <span className="font-semibold">👤 Cliente:</span> {p.nombreCliente || 'Sin nombre'}
                          </p>
                          <p className="text-gray-700">
                            <span className="font-semibold">📱 Teléfono:</span> {p.telefonoCliente || 'Sin teléfono'}
                          </p>
                        </div>

                        {/* Fechas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-600 font-semibold mb-1">📅 Fecha de Entrega</p>
                            <p className="text-blue-800 font-bold">
                              {p.fechaEntrega ? (
                                <>
                                  {formatearFecha(p.fechaEntrega)}
                                  {p.horaEntrega && <span className="ml-2">⏰ {p.horaEntrega}hs</span>}
                                </>
                              ) : (
                                <span className="text-gray-500 italic">Sin especificar</span>
                              )}
                            </p>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs text-gray-600 font-semibold mb-1">🕐 Creado el</p>
                            <p className="text-gray-800 font-medium">
                              {formatearFechaHora(p.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Precio Total */}
                      <div className="ml-4 text-right">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${formatearPrecio(p.precioTotal)}
                        </p>
                      </div>
                    </div>

                    {/* Footer con acción */}
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <p className="text-sm text-purple-600 font-semibold text-center">
                        ➜ Click para ver detalle completo
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Info de ayuda */}
        {!cargando && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="font-bold text-blue-800 mb-2">💡 Información</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Los presupuestos <strong>PENDIENTES</strong> y <strong>COMPLETOS</strong> pueden ser editados</li>
              <li>• Hacé click en cualquier presupuesto para ver el detalle completo</li>
              <li>• Desde el detalle podés confirmar el presupuesto y crear el pedido en WooCommerce</li>
              <li>• Los presupuestos <strong>CONFIRMADOS</strong> no se pueden editar (ya generaron un pedido)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
