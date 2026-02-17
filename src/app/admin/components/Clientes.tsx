'use client'
import { useState, useEffect } from 'react'

interface Cliente {
  id: string
  nombre: string
  phone: string
  email: string | null
  estado: string
  nivel: { nombre: string; orden: number } | null
  createdAt: string
  _count: { eventos: number }
}

export function Clientes({ adminKey }: { adminKey: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [nivelFiltro, setNivelFiltro] = useState('TODOS')
  const [eliminando, setEliminando] = useState<string | null>(null)

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
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        cliente.estado === 'ACTIVO'
                          ? 'bg-green-900 text-green-200'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {cliente.estado}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-white">{cliente._count.eventos}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-400 text-sm">
                      {new Date(cliente.createdAt).toLocaleDateString('es-AR')}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
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
    </div>
  )
}
