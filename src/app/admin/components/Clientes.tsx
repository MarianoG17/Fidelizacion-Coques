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
