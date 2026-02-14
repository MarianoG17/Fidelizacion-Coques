'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'

interface Nivel {
  id: string
  nombre: string
  orden: number
  descripcionBeneficios: string
  criterios: {
    visitas: number
    diasVentana: number
    usosCruzados: number
  }
  _count: {
    clientes: number
  }
}

export default function AdminNivelesPage() {
  const router = useRouter()
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [formData, setFormData] = useState({ visitas: 0, usosCruzados: 0 })

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('admin_key') : null

  useEffect(() => {
    if (!adminKey) {
      router.push('/admin')
      return
    }
    fetchNiveles()
  }, [adminKey, router])

  async function fetchNiveles() {
    try {
      const res = await fetch('/api/admin/niveles', {
        headers: { 'x-admin-key': adminKey! },
      })
      if (res.ok) {
        const json = await res.json()
        setNiveles(json.data || [])
      } else if (res.status === 401) {
        localStorage.removeItem('adminKey')
        router.push('/admin')
      }
    } catch (e) {
      console.error('Error al cargar niveles:', e)
    } finally {
      setCargando(false)
    }
  }

  async function guardarNivel(id: string) {
    try {
      const res = await fetch(`/api/admin/niveles/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey!,
        },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        await fetchNiveles()
        setEditando(null)
        alert('Nivel actualizado exitosamente')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (e) {
      console.error('Error al guardar nivel:', e)
      alert('Error al guardar cambios')
    }
  }

  function iniciarEdicion(nivel: Nivel) {
    setEditando(nivel.id)
    setFormData({
      visitas: nivel.criterios.visitas,
      usosCruzados: nivel.criterios.usosCruzados,
    })
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="max-w-5xl mx-auto">
        <BackButton />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gestión de Niveles</h1>
          <p className="text-slate-400">
            Configurá los criterios de visitas y usos cruzados para cada nivel
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-200">
            📊 <strong>Criterios actuales:</strong> Los clientes suben de nivel automáticamente
            cuando cumplen las visitas contabilizadas en los últimos 30 días y usos cruzados
            entre distintos locales.
          </p>
        </div>

        {/* Tabla de niveles */}
        <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="text-left p-4 text-slate-300 font-semibold">Nivel</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Orden</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Visitas Req.</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Usos Cruzados</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Clientes</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {niveles.map((nivel) => (
                  <tr
                    key={nivel.id}
                    className="border-t border-slate-700 hover:bg-slate-750 transition"
                  >
                    <td className="p-4">
                      <div>
                        <p className="text-white font-semibold">{nivel.nombre}</p>
                        <p className="text-slate-400 text-sm">
                          {nivel.descripcionBeneficios}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-700 rounded text-sm">
                        {nivel.orden}
                      </span>
                    </td>
                    <td className="p-4">
                      {editando === nivel.id ? (
                        <input
                          type="number"
                          min="0"
                          value={formData.visitas}
                          onChange={(e) =>
                            setFormData({ ...formData, visitas: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 bg-slate-700 rounded px-2 py-1 text-white"
                        />
                      ) : (
                        <span className="text-green-400 font-semibold">
                          {nivel.criterios.visitas}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {editando === nivel.id ? (
                        <input
                          type="number"
                          min="0"
                          value={formData.usosCruzados}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              usosCruzados: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20 bg-slate-700 rounded px-2 py-1 text-white"
                        />
                      ) : (
                        <span className="text-blue-400 font-semibold">
                          {nivel.criterios.usosCruzados}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-slate-300">{nivel._count.clientes}</span>
                    </td>
                    <td className="p-4">
                      {editando === nivel.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => guardarNivel(nivel.id)}
                            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-semibold transition"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditando(null)}
                            className="bg-slate-600 hover:bg-slate-700 px-3 py-1 rounded text-sm font-semibold transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => iniciarEdicion(nivel)}
                          className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm font-semibold transition"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-6 bg-slate-800 rounded-xl p-4">
          <h3 className="font-bold mb-2">Leyenda:</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>
              • <strong>Visitas Requeridas:</strong> Cantidad de visitas contabilizadas en los
              últimos 30 días necesarias para alcanzar este nivel
            </li>
            <li>
              • <strong>Usos Cruzados:</strong> Cantidad de locales distintos que debe visitar
              (ej: si visita Café y Lavadero = 2 usos cruzados)
            </li>
            <li>
              • <strong>Clientes:</strong> Cantidad de clientes que actualmente tienen este nivel
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
