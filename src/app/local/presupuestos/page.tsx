'use client'

import { useState } from 'react'
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
  creadoEn: string
}

export default function PresupuestosLocalPage() {
  const router = useRouter()
  const [codigoBusqueda, setCodigoBusqueda] = useState('')
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')

  async function buscarPorCodigo() {
    if (!codigoBusqueda.trim()) {
      setError('Ingresá un código de presupuesto')
      return
    }

    setBuscando(true)
    setError(null)
    setPresupuesto(null)

    try {
      const response = await fetch(`/api/presupuestos/${codigoBusqueda.trim()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Presupuesto no encontrado')
      }

      setPresupuesto(data.presupuesto)
    } catch (err: any) {
      setError(err.message || 'Error al buscar presupuesto')
    } finally {
      setBuscando(false)
    }
  }

  async function listarPresupuestos() {
    setBuscando(true)
    setError(null)
    setPresupuesto(null)

    try {
      const params = new URLSearchParams()
      if (filtroEstado !== 'TODOS') {
        params.append('estado', filtroEstado)
      }

      const response = await fetch(`/api/presupuestos?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al listar presupuestos')
      }

      setPresupuestos(data.presupuestos || [])
    } catch (err: any) {
      setError(err.message || 'Error al listar presupuestos')
    } finally {
      setBuscando(false)
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
        <div className="max-w-4xl mx-auto px-4 py-4">
          <BackButton href="/local" label="Volver a Staff" />
          <h1 className="text-2xl font-bold text-gray-800 mt-2">
            💾 Presupuestos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Buscar y gestionar presupuestos guardados
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Búsqueda por código */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4">
            🔍 Buscar por Código
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={codigoBusqueda}
              onChange={(e) => setCodigoBusqueda(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && buscarPorCodigo()}
              placeholder="PRE-12ABC34-5DEF67"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={buscarPorCodigo}
              disabled={buscando}
              className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                buscando
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Resultado de búsqueda por código */}
        {presupuesto && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {presupuesto.codigo}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {formatearFecha(presupuesto.creadoEn)}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-lg font-semibold border ${estadoColores[presupuesto.estado]}`}>
                {estadoIconos[presupuesto.estado]} {presupuesto.estado}
              </span>
            </div>

            {presupuesto.nombreCliente && (
              <p className="text-gray-700 mb-2">
                <strong>Cliente:</strong> {presupuesto.nombreCliente}
              </p>
            )}
            {presupuesto.telefonoCliente && (
              <p className="text-gray-700 mb-2">
                <strong>Teléfono:</strong> {presupuesto.telefonoCliente}
              </p>
            )}
            <p className="text-gray-700 mb-4">
              <strong>Total:</strong> ${formatearPrecio(presupuesto.precioTotal)}
            </p>

            <button
              onClick={() => router.push(`/local/presupuestos/${presupuesto.codigo}`)}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
            >
              Ver Detalle Completo →
            </button>
          </div>
        )}

        {/* Divisor */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-gray-500 text-sm font-medium">O</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* Listar presupuestos */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4">
            📋 Listar Presupuestos
          </h2>
          
          <div className="flex gap-2 mb-4">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="COMPLETO">Completos</option>
              <option value="CONFIRMADO">Confirmados</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
            <button
              onClick={listarPresupuestos}
              disabled={buscando}
              className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                buscando
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {buscando ? 'Cargando...' : 'Listar'}
            </button>
          </div>

          {/* Lista de presupuestos */}
          {presupuestos.length > 0 && (
            <div className="space-y-3 mt-4">
              <p className="text-sm text-gray-600 mb-3">
                {presupuestos.length} presupuesto{presupuestos.length !== 1 ? 's' : ''} encontrado{presupuestos.length !== 1 ? 's' : ''}
              </p>
              {presupuestos.map((p) => (
                <div
                  key={p.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/local/presupuestos/${p.codigo}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{p.codigo}</p>
                      <p className="text-sm text-gray-600">
                        {p.nombreCliente || 'Sin nombre'} - {p.telefonoCliente || 'Sin teléfono'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${estadoColores[p.estado]}`}>
                      {estadoIconos[p.estado]} {p.estado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {formatearFecha(p.creadoEn)}
                    </span>
                    <span className="font-semibold text-green-600">
                      ${formatearPrecio(p.precioTotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Errores */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}

        {/* Info de ayuda */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-800 mb-2">💡 ¿Cómo usar presupuestos?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Buscar por código cuando el cliente llama con su código</li>
            <li>• Listar para ver todos los presupuestos pendientes</li>
            <li>• Click en cualquier presupuesto para ver detalle completo</li>
            <li>• Desde el detalle se puede confirmar y crear el pedido WooCommerce</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
