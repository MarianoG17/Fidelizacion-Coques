'use client'
import { useState, useEffect } from 'react'

interface Pedido {
  id: string
  timestamp: string
  notas: string | null
  monto: number | null
  clienteId: string
  clienteNombre: string | null
  clientePhone: string | null
  clienteNivel: string | null
}

interface PedidosProps {
  adminKey: string
  clienteId?: string | null
  clienteNombre?: string | null
  onLimpiarFiltro?: () => void
}

export function Pedidos({ adminKey, clienteId, clienteNombre, onLimpiarFiltro }: PedidosProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [totalMonto, setTotalMonto] = useState(0)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    fetchPedidos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  async function fetchPedidos() {
    setCargando(true)
    try {
      const url = clienteId
        ? `/api/admin/pedidos?clienteId=${clienteId}`
        : '/api/admin/pedidos'
      const res = await fetch(url, { headers: { 'x-admin-key': adminKey } })
      if (res.ok) {
        const json = await res.json()
        setPedidos(json.data || [])
        setTotalMonto(json.totalMonto || 0)
      }
    } catch (e) {
      console.error('Error al cargar pedidos:', e)
    } finally {
      setCargando(false)
    }
  }

  function formatearFecha(timestamp: string): string {
    return new Date(timestamp).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })
  }

  function extraerNumeroPedido(notas: string | null): string {
    if (!notas) return '—'
    const match = notas.match(/#(\d+)/)
    return match ? `#${match[1]}` : notas
  }

  const pedidosFiltrados = pedidos.filter(p => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      p.clienteNombre?.toLowerCase().includes(q) ||
      p.clientePhone?.includes(busqueda) ||
      p.notas?.includes(busqueda)
    )
  })

  const totalFiltrado = pedidosFiltrados.reduce((sum, p) => sum + (p.monto ?? 0), 0)

  if (cargando) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">
          🛍️ Pedidos App
          {clienteNombre && (
            <span className="ml-3 text-lg font-normal text-orange-400">— {clienteNombre}</span>
          )}
        </h2>
        {clienteId && onLimpiarFiltro && (
          <button
            onClick={onLimpiarFiltro}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-semibold transition"
          >
            ✕ Ver todos los pedidos
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total pedidos</p>
          <p className="text-2xl font-bold text-white">{pedidosFiltrados.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Importe total</p>
          <p className="text-2xl font-bold text-green-400">
            {totalFiltrado > 0
              ? `$${totalFiltrado.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : '$0'}
          </p>
        </div>
        {!clienteId && (
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Ticket promedio</p>
            <p className="text-2xl font-bold text-blue-400">
              {pedidosFiltrados.length > 0 && totalFiltrado > 0
                ? `$${Math.round(totalFiltrado / pedidosFiltrados.filter(p => p.monto).length).toLocaleString('es-AR')}`
                : '—'}
            </p>
          </div>
        )}
      </div>

      {/* Búsqueda (solo cuando no hay filtro de cliente) */}
      {!clienteId && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, teléfono o número de pedido..."
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Tabla */}
      <div className="bg-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700">
                <th className="text-left p-4 text-slate-300 font-semibold">Fecha</th>
                {!clienteId && (
                  <>
                    <th className="text-left p-4 text-slate-300 font-semibold">Cliente</th>
                    <th className="text-left p-4 text-slate-300 font-semibold">Teléfono</th>
                    <th className="text-left p-4 text-slate-300 font-semibold">Nivel</th>
                  </>
                )}
                <th className="text-left p-4 text-slate-300 font-semibold">Pedido</th>
                <th className="text-left p-4 text-slate-300 font-semibold">Importe</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map((pedido) => (
                <tr key={pedido.id} className="border-t border-slate-700 hover:bg-slate-750 transition">
                  <td className="p-4">
                    <p className="text-slate-300 text-sm whitespace-nowrap">{formatearFecha(pedido.timestamp)}</p>
                  </td>
                  {!clienteId && (
                    <>
                      <td className="p-4">
                        <p className="text-white font-semibold">{pedido.clienteNombre || 'Sin nombre'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-300 font-mono text-sm">{pedido.clientePhone}</p>
                      </td>
                      <td className="p-4">
                        {pedido.clienteNivel ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-900 text-blue-200">
                            {pedido.clienteNivel}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </>
                  )}
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm font-mono">
                      {extraerNumeroPedido(pedido.notas)}
                    </span>
                  </td>
                  <td className="p-4">
                    {pedido.monto != null ? (
                      <p className="text-green-400 font-semibold">
                        ${pedido.monto.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pedidosFiltrados.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            {busqueda ? 'No se encontraron pedidos con ese criterio' : 'No hay pedidos registrados'}
          </div>
        )}
      </div>
    </div>
  )
}
