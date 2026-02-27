'use client'
import { useState, useEffect } from 'react'

interface Cliente {
  id: string
  nombre: string
  phone: string
  email: string | null
  estado: string
  nivel: { nombre: string; orden: number } | null
  referidosActivados: number
  fechaCumpleanos: string | null
  fuenteConocimiento: string | null
  authProvider: string | null
  createdAt: string
  _count: { eventos: number }
}

interface Actividad {
  id: string
  timestamp: string
  tipoEvento: string
  metodoValidacion: string
  notas: string | null
  contabilizada: boolean
  local: { nombre: string; tipo: string }
  beneficio: { nombre: string; descripcionCaja: string } | null
  mesa: { nombre: string } | null
}

interface ActividadesData {
  cliente: {
    nombre: string | null
    phone: string
    email: string | null
    fechaCumpleanos: string | null
    fuenteConocimiento: string | null
    authProvider: string | null
    profileImage: string | null
    createdAt: string
  }
  eventos: Actividad[]
  estadisticas: {
    totalEventos: number
    visitasContabilizadas: number
    visitasBonus: number
    beneficiosAplicados: number
  }
}

export function Clientes({ adminKey }: { adminKey: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [nivelFiltro, setNivelFiltro] = useState('TODOS')
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [actividadesAbiertas, setActividadesAbiertas] = useState<string | null>(null)
  const [actividadesData, setActividadesData] = useState<ActividadesData | null>(null)
  const [cargandoActividades, setCargandoActividades] = useState(false)

  useEffect(() => {
    fetchClientes()
  }, [])

  async function fetchClientes() {
    try {
      const res = await fetch('/api/admin/clientes', {
        headers: { 'x-admin-key': adminKey },
      })
      if (res.ok) {
        const json = await res.json()
        setClientes(json.data || [])
      }
    } catch (e) {
      console.error('Error al cargar clientes:', e)
    } finally {
      setCargando(false)
    }
  }

  async function eliminarCliente(clienteId: string, nombre: string) {
    if (!confirm(`¿Estás seguro de desactivar a ${nombre}? Su estado cambiará a INACTIVO (se puede reactivar después).`)) {
      return
    }

    setEliminando(clienteId)
    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      })

      if (res.ok) {
        const json = await res.json()
        alert(json.message || 'Cliente desactivado correctamente')
        // Refrescar lista
        await fetchClientes()
      } else {
        const json = await res.json()
        alert(json.error || 'Error al desactivar cliente')
      }
    } catch (error) {
      console.error('Error al desactivar cliente:', error)
      alert('Error de conexión al desactivar cliente')
    } finally {
      setEliminando(null)
    }
  }

  async function eliminarClientePermanente(clienteId: string, nombre: string) {
    // Primera confirmación
    if (!confirm(`⚠️ ELIMINACIÓN PERMANENTE de ${nombre}\n\nEsta acción NO se puede deshacer y borrará:\n- Todos los eventos y visitas\n- Todos los logros\n- Todos los autos\n- Todas las relaciones\n\n¿Estás ABSOLUTAMENTE seguro?`)) {
      return
    }

    // Segunda confirmación - requiere escribir el nombre
    const confirmacion = prompt(`Para confirmar la eliminación permanente de ${nombre}, escribe "ELIMINAR" en mayúsculas:`);

    if (confirmacion !== 'ELIMINAR') {
      alert('Eliminación cancelada. No se escribió "ELIMINAR" correctamente.')
      return
    }

    setEliminando(clienteId)
    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}?permanent=true`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      })

      if (res.ok) {
        const json = await res.json()
        alert(json.message || 'Cliente eliminado permanentemente')
        // Refrescar lista
        await fetchClientes()
      } else {
        const json = await res.json()
        alert(json.error || 'Error al eliminar permanentemente')
      }
    } catch (error) {
      console.error('Error al eliminar permanentemente:', error)
      alert('Error de conexión al eliminar permanentemente')
    } finally {
      setEliminando(null)
    }
  }

  async function verActividades(clienteId: string) {
    setActividadesAbiertas(clienteId)
    setCargandoActividades(true)
    setActividadesData(null)

    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}/actividades`, {
        headers: { 'x-admin-key': adminKey },
      })

      if (res.ok) {
        const json = await res.json()
        setActividadesData(json.data)
      } else {
        alert('Error al cargar actividades')
        setActividadesAbiertas(null)
      }
    } catch (error) {
      console.error('Error al cargar actividades:', error)
      alert('Error de conexión al cargar actividades')
      setActividadesAbiertas(null)
    } finally {
      setCargandoActividades(false)
    }
  }

  function cerrarActividades() {
    setActividadesAbiertas(null)
    setActividadesData(null)
  }

  function formatearFecha(timestamp: string): string {
    const fecha = new Date(timestamp)
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatearFechaCumpleanos(fecha: string): string {
    const fechaSolo = fecha.split('T')[0]
    const [year, month, day] = fechaSolo.split('-')
    const fechaObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return fechaObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short'
    })
  }

  function getAuthProviderIcon(provider: string | null): string {
    if (provider === 'google') return '🔗'
    return '📧'
  }

  function getTipoEventoBadge(tipo: string): { bg: string; text: string } {
    switch (tipo) {
      case 'VISITA':
        return { bg: 'bg-blue-900', text: 'text-blue-200' }
      case 'BENEFICIO_APLICADO':
        return { bg: 'bg-green-900', text: 'text-green-200' }
      case 'ACTIVACION':
        return { bg: 'bg-purple-900', text: 'text-purple-200' }
      case 'ESTADO_EXTERNO':
        return { bg: 'bg-yellow-900', text: 'text-yellow-200' }
      default:
        return { bg: 'bg-slate-700', text: 'text-slate-300' }
    }
  }

  const clientesFiltrados = clientes.filter((c) => {
    const matchFiltro =
      c.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
      c.phone.includes(filtro)
    const matchNivel =
      nivelFiltro === 'TODOS' || c.nivel?.nombre === nivelFiltro
    return matchFiltro && matchNivel
  })

  if (cargando) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Clientes</h2>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={nivelFiltro}
          onChange={(e) => setNivelFiltro(e.target.value)}
          className="bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>TODOS</option>
          <option>Bronce</option>
          <option>Plata</option>
          <option>Oro</option>
          <option>Platino</option>
        </select>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total</p>
          <p className="text-2xl font-bold text-white">{clientes.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Activos</p>
          <p className="text-2xl font-bold text-green-400">
            {clientes.filter((c) => c.estado === 'ACTIVO').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Plata+</p>
          <p className="text-2xl font-bold text-blue-400">
            {clientes.filter((c) => (c.nivel?.orden || 0) >= 2).length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Filtrados</p>
          <p className="text-2xl font-bold text-white">
            {clientesFiltrados.length}
          </p>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="bg-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700">
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Cliente
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Teléfono
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Nivel
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Estado
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Visitas
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Bonus
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Referidos
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  🎂 Cumpleaños
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  💡 Fuente
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Auth
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Desde
                </th>
                <th className="text-left p-4 text-slate-300 font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="border-t border-slate-700 hover:bg-slate-750 transition"
                >
                  <td className="p-4">
                    <div>
                      <p className="text-white font-semibold">
                        {cliente.nombre || 'Sin nombre'}
                      </p>
                      {cliente.email && (
                        <p className="text-slate-400 text-sm">{cliente.email}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-300 font-mono text-sm">
                      {cliente.phone}
                    </p>
                  </td>
                  <td className="p-4">
                    {cliente.nivel ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-900 text-blue-200">
                        {cliente.nivel.nombre}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-sm">Sin nivel</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${cliente.estado === 'ACTIVO'
                          ? 'bg-green-900 text-green-200'
                          : 'bg-slate-700 text-slate-300'
                        }`}
                    >
                      {cliente.estado}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-white">{(cliente as any).visitasReales || 0}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-purple-400 font-semibold">{(cliente as any).visitasBonus || 0}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-white">{cliente.referidosActivados || 0}</p>
                  </td>
                  <td className="p-4">
                    {cliente.fechaCumpleanos ? (
                      <p className="text-slate-300 text-sm">
                        {formatearFechaCumpleanos(cliente.fechaCumpleanos)}
                      </p>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    {cliente.fuenteConocimiento ? (
                      <p className="text-slate-300 text-xs">
                        {cliente.fuenteConocimiento}
                      </p>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-lg" title={cliente.authProvider === 'google' ? 'Google OAuth' : 'Email/Teléfono'}>
                      {getAuthProviderIcon(cliente.authProvider)}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-400 text-sm">
                      {new Date(cliente.createdAt).toLocaleDateString('es-AR')}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => verActividades(cliente.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        title="Ver historial de actividades"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => eliminarCliente(cliente.id, cliente.nombre || 'Sin nombre')}
                        disabled={eliminando === cliente.id}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Desactivar cliente (cambia estado a INACTIVO, reversible)"
                      >
                        {eliminando === cliente.id ? '⏳' : '⏸️'}
                      </button>
                      <button
                        onClick={() => eliminarClientePermanente(cliente.id, cliente.nombre || 'Sin nombre')}
                        disabled={eliminando === cliente.id}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="⚠️ ELIMINAR PERMANENTEMENTE (borra todo, NO reversible)"
                      >
                        {eliminando === cliente.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {clientesFiltrados.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            No se encontraron clientes con ese filtro
          </div>
        )}
      </div>

      {/* Modal de Actividades */}
      {actividadesAbiertas && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header del Modal */}
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Actividades del Cliente
                </h3>
                {actividadesData && (
                  <p className="text-slate-400 text-sm mt-1">
                    {actividadesData.cliente.nombre || actividadesData.cliente.phone}
                  </p>
                )}
              </div>
              <button
                onClick={cerrarActividades}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {cargandoActividades ? (
                <div className="flex justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : actividadesData ? (
                <>
                  {/* Información del Perfil */}
                  <div className="bg-slate-700 rounded-xl p-4 mb-6">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <span>👤</span>
                      Información del Perfil
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Email:</span>
                        <p className="text-white mt-1">
                          {actividadesData.cliente.email || (
                            <span className="text-slate-500 italic">No proporcionado</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Fecha de Cumpleaños:</span>
                        <p className="text-white mt-1">
                          {actividadesData.cliente.fechaCumpleanos ? (
                            <>
                              🎂 {formatearFechaCumpleanos(actividadesData.cliente.fechaCumpleanos)}
                            </>
                          ) : (
                            <span className="text-slate-500 italic">No proporcionado</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">¿Cómo nos conoció?:</span>
                        <p className="text-white mt-1">
                          {actividadesData.cliente.fuenteConocimiento || (
                            <span className="text-slate-500 italic">No proporcionado</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Método de Registro:</span>
                        <p className="text-white mt-1 flex items-center gap-2">
                          {actividadesData.cliente.authProvider === 'google' ? (
                            <>
                              <span>🔗 Google OAuth</span>
                              {actividadesData.cliente.profileImage && (
                                <img
                                  src={actividadesData.cliente.profileImage}
                                  alt="Profile"
                                  className="w-6 h-6 rounded-full"
                                />
                              )}
                            </>
                          ) : (
                            <span>📧 Email/Teléfono</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Miembro desde:</span>
                        <p className="text-white mt-1">
                          {new Date(actividadesData.cliente.createdAt).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-700 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">Total Eventos</p>
                      <p className="text-2xl font-bold text-white">
                        {actividadesData.estadisticas.totalEventos}
                      </p>
                    </div>
                    <div className="bg-slate-700 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">Visitas</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {actividadesData.estadisticas.visitasContabilizadas}
                      </p>
                    </div>
                    <div className="bg-slate-700 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">Visitas Bonus</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {actividadesData.estadisticas.visitasBonus}
                      </p>
                    </div>
                    <div className="bg-slate-700 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">Beneficios</p>
                      <p className="text-2xl font-bold text-green-400">
                        {actividadesData.estadisticas.beneficiosAplicados}
                      </p>
                    </div>
                  </div>

                  {/* Lista de Actividades */}
                  <div className="space-y-3">
                    {actividadesData.eventos.map((evento) => {
                      const badge = getTipoEventoBadge(evento.tipoEvento)
                      return (
                        <div
                          key={evento.id}
                          className="bg-slate-700 rounded-xl p-4 hover:bg-slate-650 transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              {evento.tipoEvento}
                            </span>
                            <span className="text-slate-400 text-sm">
                              {formatearFecha(evento.timestamp)}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">Local:</span>
                              <span className="text-white">{evento.local.nombre} ({evento.local.tipo})</span>
                            </div>

                            {evento.mesa && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">Mesa:</span>
                                <span className="text-white">{evento.mesa.nombre}</span>
                              </div>
                            )}

                            {evento.beneficio && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">Beneficio:</span>
                                <span className="text-white">{evento.beneficio.nombre}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">Método:</span>
                              <span className="text-white">{evento.metodoValidacion}</span>
                            </div>

                            {evento.notas && (
                              <div className="mt-2 p-2 bg-slate-600 rounded">
                                <span className="text-slate-300 text-xs italic">{evento.notas}</span>
                              </div>
                            )}

                            {!evento.contabilizada && (
                              <div className="mt-2">
                                <span className="px-2 py-1 bg-orange-900 text-orange-200 rounded text-xs">
                                  No contabilizada
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {actividadesData.eventos.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      No hay actividades registradas para este cliente
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  Error al cargar actividades
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
