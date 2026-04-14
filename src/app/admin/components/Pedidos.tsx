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

interface DetallePedido {
  id: number
  status: string
  dateCreated: string
  dateCompleted: string | null
  total: string
  discountTotal: string
  discountTax: string
  totalTax: string
  couponLines: Array<{ code: string; discount: string; discountTax: string }>
  currency: string
  billing: {
    firstName: string
    lastName: string
    phone: string
    email: string
    address: string
  }
  lineItems: Array<{
    name: string
    quantity: number
    subtotal: string
    total: string
    sku: string | null
    metaData: Array<{ key: string; value: string }>
  }>
  shippingLines: Array<{ name: string; total: string }>
  customerNote: string | null
  paymentMethod: string | null
}

interface PedidosProps {
  adminKey: string
  clienteId?: string | null
  clienteNombre?: string | null
  onLimpiarFiltro?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completado',
  processing: 'En proceso',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  failed: 'Fallido',
  'on-hold': 'En espera',
}

export function Pedidos({ adminKey, clienteId, clienteNombre, onLimpiarFiltro }: PedidosProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [diagWooId, setDiagWooId] = useState('')
  const [diagCargando, setDiagCargando] = useState(false)
  const [diagResultado, setDiagResultado] = useState<any>(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [syncResultado, setSyncResultado] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [totalMonto, setTotalMonto] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<Record<string, DetallePedido | 'loading' | 'error'>>({})

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

  async function toggleExpand(pedido: Pedido) {
    const wooId = extraerNumeroRaw(pedido.notas)
    if (!wooId) return

    if (expandido === pedido.id) {
      setExpandido(null)
      return
    }

    setExpandido(pedido.id)

    if (detalle[pedido.id]) return // ya cargado

    setDetalle(prev => ({ ...prev, [pedido.id]: 'loading' }))
    try {
      const res = await fetch(`/api/admin/pedidos/detalle?wooId=${wooId}`, {
        headers: { 'x-admin-key': adminKey },
      })
      if (res.ok) {
        const json = await res.json()
        setDetalle(prev => ({ ...prev, [pedido.id]: json }))
      } else {
        setDetalle(prev => ({ ...prev, [pedido.id]: 'error' }))
      }
    } catch {
      setDetalle(prev => ({ ...prev, [pedido.id]: 'error' }))
    }
  }

  function formatearFecha(timestamp: string): string {
    return new Date(timestamp).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    })
  }

  function extraerNumeroRaw(notas: string | null): string | null {
    if (!notas) return null
    const match = notas.match(/(\d+)$/)
    return match ? match[1] : null
  }

  function extraerNumeroPedido(notas: string | null): string {
    const n = extraerNumeroRaw(notas)
    return n ? `#${n}` : '—'
  }

  async function sincronizarDesdeWoo() {
    setSincronizando(true)
    setSyncResultado(null)
    try {
      const res = await fetch('/api/admin/sincronizar-pedidos-woo', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      })
      const json = await res.json()
      setSyncResultado(json)
      if (json.creados > 0) fetchPedidos()
    } catch {
      setSyncResultado({ error: 'Error de conexión' })
    } finally {
      setSincronizando(false)
    }
  }

  async function runDiagnostico() {
    if (!diagWooId.trim()) return
    setDiagCargando(true)
    setDiagResultado(null)
    try {
      const res = await fetch(`/api/admin/diagnostico-webhook?wooId=${diagWooId.trim()}`, {
        headers: { 'x-admin-key': adminKey },
      })
      const json = await res.json()
      setDiagResultado(json)
    } catch (e) {
      setDiagResultado({ error: 'Error de conexión' })
    } finally {
      setDiagCargando(false)
    }
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
  const columnas = clienteId ? 3 : 6

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
        <div className="flex gap-2 flex-wrap">
          {!clienteId && (
            <button
              onClick={sincronizarDesdeWoo}
              disabled={sincronizando}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {sincronizando ? '⏳ Sincronizando...' : '🔄 Sincronizar desde WooCommerce'}
            </button>
          )}
          {clienteId && onLimpiarFiltro && (
            <button
              onClick={onLimpiarFiltro}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-semibold transition"
            >
              ✕ Ver todos los pedidos
            </button>
          )}
        </div>

        {syncResultado && !sincronizando && (
          <div className={`w-full mt-2 px-4 py-3 rounded-xl text-sm ${syncResultado.error ? 'bg-red-900/40 text-red-300' : syncResultado.creados > 0 ? 'bg-green-900/40 text-green-300' : 'bg-slate-700 text-slate-300'}`}>
            {syncResultado.error
              ? syncResultado.error
              : `✅ Sincronización completa — ${syncResultado.creados} nuevos registrados, ${syncResultado.omitidos} ya existían, ${syncResultado.sinCliente} sin cliente registrado`}
          </div>
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

      {/* Búsqueda */}
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

      {/* Diagnóstico de pedido */}
      {!clienteId && (
        <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold">🔍 Diagnosticar pedido no registrado</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={diagWooId}
              onChange={e => setDiagWooId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runDiagnostico()}
              placeholder="Número de pedido WooCommerce (ej: 1234)"
              className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500 font-mono"
            />
            <button
              onClick={runDiagnostico}
              disabled={diagCargando || !diagWooId.trim()}
              className="px-5 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white rounded-xl font-semibold transition"
            >
              {diagCargando ? '⏳' : 'Diagnosticar'}
            </button>
          </div>

          {diagResultado && (
            <div className="space-y-3">
              {/* Pasos */}
              {diagResultado.pasos?.map((p: any, i: number) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-2.5 rounded-xl text-sm ${p.ok ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                  <span className="shrink-0 mt-0.5">{p.ok ? '✅' : '❌'}</span>
                  <div>
                    <p className="font-semibold text-white">{p.paso}</p>
                    <p className={p.ok ? 'text-green-300' : 'text-red-300'}>{p.detalle}</p>
                  </div>
                </div>
              ))}

              {/* Resultado final */}
              {diagResultado.resultado === 'LISTO_PARA_REGISTRAR' && (
                <div className="bg-blue-900/40 rounded-xl p-4 text-sm space-y-1">
                  <p className="text-blue-300 font-semibold">⚠️ El pedido podría registrarse pero no lo hizo — el webhook probablemente no se disparó o falló antes de llegar al servidor.</p>
                  <p className="text-slate-300">Cliente: <span className="text-white font-semibold">{diagResultado.clienteEncontrado?.nombre}</span></p>
                  <p className="text-slate-300">Teléfono app: <span className="font-mono text-white">{diagResultado.clienteEncontrado?.phone}</span></p>
                </div>
              )}

              {diagResultado.resultado === 'YA_REGISTRADO' && (
                <div className="bg-green-900/40 rounded-xl p-4 text-sm">
                  <p className="text-green-300 font-semibold">✅ El pedido ya está registrado en el sistema.</p>
                  <p className="text-slate-300 mt-1">Si no aparece en la lista, recargá la página.</p>
                </div>
              )}

              {diagResultado.resultado === 'CLIENTE_NO_ENCONTRADO' && (
                <div className="bg-orange-900/40 rounded-xl p-4 text-sm space-y-2">
                  <p className="text-orange-300 font-semibold">⚠️ Cliente no encontrado en el sistema de fidelización.</p>
                  <p className="text-slate-300">Teléfono en WooCommerce: <span className="font-mono text-white">"{diagResultado.pedidoInfo?.phoneRaw}"</span></p>
                  <p className="text-slate-300">Normalizado a: <span className="font-mono text-white">"{diagResultado.pedidoInfo?.phoneNormalizado}"</span></p>
                  <p className="text-slate-300">Email en WooCommerce: <span className="text-white">{diagResultado.pedidoInfo?.email || '—'}</span></p>
                  <p className="text-slate-400 text-xs mt-1">El cliente debe tener el mismo teléfono o email en la app de fidelización.</p>
                  {diagResultado.similares?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-slate-400 text-xs mb-1">Clientes con teléfono/email similar:</p>
                      {diagResultado.similares.map((s: any) => (
                        <p key={s.id} className="text-slate-300 text-xs font-mono">{s.nombre} — {s.phone} — {s.email}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {diagResultado.error && (
                <p className="text-red-400 text-sm">{diagResultado.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700">
                <th className="w-8 p-4" />
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
              {pedidosFiltrados.map((pedido) => {
                const isOpen = expandido === pedido.id
                const det = detalle[pedido.id]
                const wooId = extraerNumeroRaw(pedido.notas)

                return (
                  <>
                    <tr
                      key={pedido.id}
                      className={`border-t border-slate-700 transition cursor-pointer ${isOpen ? 'bg-slate-750' : 'hover:bg-slate-750'}`}
                      onClick={() => toggleExpand(pedido)}
                    >
                      <td className="p-4 text-center">
                        <span className="text-slate-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                      </td>
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

                    {/* Fila de detalle expandible */}
                    {isOpen && (
                      <tr key={`${pedido.id}-detalle`} className="border-t border-slate-600 bg-slate-900">
                        <td colSpan={columnas} className="p-0">
                          <div className="p-5 space-y-4">
                            {det === 'loading' && (
                              <div className="flex items-center gap-3 text-slate-400">
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                Cargando detalle desde WooCommerce...
                              </div>
                            )}

                            {det === 'error' && (
                              <p className="text-red-400 text-sm">No se pudo obtener el detalle desde WooCommerce.</p>
                            )}

                            {det && det !== 'loading' && det !== 'error' && (
                              <div className="grid md:grid-cols-2 gap-5">
                                {/* Columna izquierda: productos */}
                                <div className="space-y-3">
                                  <h4 className="text-white font-semibold text-sm uppercase tracking-wide">Productos</h4>
                                  <div className="space-y-2">
                                    {det.lineItems.map((item, i) => (
                                      <div key={i} className="bg-slate-800 rounded-xl p-3">
                                        <div className="flex justify-between items-start gap-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold text-sm leading-tight">{item.name}</p>
                                            {item.sku && (
                                              <p className="text-slate-500 text-xs mt-0.5">SKU: {item.sku}</p>
                                            )}
                                            {item.metaData.length > 0 && (
                                              <div className="mt-1.5 space-y-0.5">
                                                {item.metaData.map((m, j) => (
                                                  <p key={j} className="text-slate-400 text-xs">
                                                    <span className="text-slate-500">{m.key}:</span> {m.value}
                                                  </p>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right shrink-0">
                                            <p className="text-slate-400 text-xs">x{item.quantity}</p>
                                            <p className="text-green-400 font-semibold text-sm">
                                              ${parseFloat(item.total).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {det.shippingLines.length > 0 && det.shippingLines.map((s, i) => (
                                      <div key={i} className="flex justify-between items-center bg-slate-800 rounded-xl p-3">
                                        <p className="text-slate-400 text-sm">🚚 {s.name}</p>
                                        <p className="text-slate-300 text-sm">
                                          {parseFloat(s.total) === 0 ? 'Gratis' : `$${parseFloat(s.total).toLocaleString('es-AR')}`}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Totales con desglose */}
                                  {(() => {
                                    const totalFinal = parseFloat(det.total)
                                    const descuento = parseFloat(det.discountTotal) + parseFloat(det.discountTax)
                                    const totalSinDesc = totalFinal + descuento
                                    const pctDesc = totalSinDesc > 0 ? (descuento / totalSinDesc) * 100 : 0
                                    const hayDescuento = descuento > 0

                                    return (
                                      <div className="pt-2 border-t border-slate-700 space-y-1.5">
                                        {hayDescuento && (
                                          <>
                                            <div className="flex justify-between items-center text-sm">
                                              <span className="text-slate-400">Subtotal c/ IVA</span>
                                              <span className="text-slate-300">
                                                ${totalSinDesc.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                              <span className="text-slate-400">
                                                Descuento
                                                {det.couponLines.length > 0 && (
                                                  <span className="ml-1.5 text-xs text-orange-400 font-mono">
                                                    {det.couponLines.map(c => c.code).join(', ')}
                                                  </span>
                                                )}
                                              </span>
                                              <span className="text-orange-400 font-semibold">
                                                -{pctDesc.toFixed(0)}% (${descuento.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                                              </span>
                                            </div>
                                          </>
                                        )}
                                        <div className="flex justify-between items-center pt-1">
                                          <p className="text-slate-300 font-semibold">Total c/ IVA</p>
                                          <p className="text-green-400 font-bold text-lg">
                                            ${totalFinal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  })()}
                                </div>

                                {/* Columna derecha: info del pedido */}
                                <div className="space-y-3">
                                  <h4 className="text-white font-semibold text-sm uppercase tracking-wide">Información del pedido</h4>
                                  <div className="bg-slate-800 rounded-xl p-4 space-y-2.5 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Estado</span>
                                      <span className="text-white font-semibold">
                                        {STATUS_LABELS[det.status] ?? det.status}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Pago</span>
                                      <span className="text-white">{det.paymentMethod || '—'}</span>
                                    </div>
                                    {det.dateCompleted && (
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Completado</span>
                                        <span className="text-white">{formatearFecha(det.dateCompleted + 'Z')}</span>
                                      </div>
                                    )}
                                    <div className="border-t border-slate-700 pt-2.5 space-y-2">
                                      <p className="text-slate-400 text-xs uppercase tracking-wide">Facturación</p>
                                      <p className="text-white">{det.billing.firstName} {det.billing.lastName}</p>
                                      {det.billing.email && <p className="text-slate-300 break-all">{det.billing.email}</p>}
                                      {det.billing.phone && <p className="text-slate-300 font-mono">{det.billing.phone}</p>}
                                      {det.billing.address && <p className="text-slate-400 text-xs">{det.billing.address}</p>}
                                    </div>
                                    {det.customerNote && (
                                      <div className="border-t border-slate-700 pt-2.5">
                                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Nota del cliente</p>
                                        <p className="text-slate-300 text-xs italic">"{det.customerNote}"</p>
                                      </div>
                                    )}
                                    {wooId && (
                                      <div className="border-t border-slate-700 pt-2.5">
                                        <p className="text-slate-500 text-xs">Pedido WooCommerce #{wooId}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
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
