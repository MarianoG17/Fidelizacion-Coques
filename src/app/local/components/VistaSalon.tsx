'use client'

import { useState } from 'react'
import MesaModal from './MesaModal'

interface Props {
  estadoSalon: any
  onCerrarSesion: (sesionId: string) => void
  onAplicarBeneficio: (clienteId: string, beneficioId: string) => void
}

export default function VistaSalon({ estadoSalon, onCerrarSesion, onAplicarBeneficio }: Props) {
  const [mesaSeleccionada, setMesaSeleccionada] = useState<any>(null)

  if (!estadoSalon) {
    return <div className="text-center py-8 text-slate-400">Cargando estado del salón...</div>
  }

  return (
    <div>
      {/* Header con stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 text-center shadow">
          <div className="text-2xl font-bold text-slate-800">{estadoSalon.totalMesas}</div>
          <div className="text-sm text-gray-500">Total Mesas</div>
        </div>
        <div className="bg-green-100 rounded-xl p-4 text-center shadow">
          <div className="text-2xl font-bold text-green-600">{estadoSalon.mesasLibres}</div>
          <div className="text-sm text-gray-600">Libres</div>
        </div>
        <div className="bg-red-100 rounded-xl p-4 text-center shadow">
          <div className="text-2xl font-bold text-red-600">{estadoSalon.mesasOcupadas}</div>
          <div className="text-sm text-gray-600">Ocupadas</div>
        </div>
      </div>

      {/* Grid de mesas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {estadoSalon.mesas.map((item: any) => (
          <button
            key={item.mesa.id}
            onClick={() => item.ocupada && setMesaSeleccionada(item)}
            disabled={!item.ocupada}
            className={`p-6 rounded-xl font-bold text-lg transition-all transform ${
              item.ocupada
                ? 'bg-red-500 text-white shadow-lg hover:scale-105 cursor-pointer'
                : 'bg-green-500 text-white cursor-default'
            }`}
          >
            <div className="text-3xl mb-2">
              {item.ocupada ? '🔴' : '🟢'}
            </div>
            <div>Mesa {item.mesa.nombre}</div>
            {item.ocupada && (
              <div className="text-sm mt-2 opacity-90">
                {item.sesion.cliente.nombre}
                <br />
                <span className="text-xs">
                  {item.sesion.duracionMinutos} min
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Modal de mesa seleccionada */}
      {mesaSeleccionada && mesaSeleccionada.ocupada && (
        <MesaModal
          mesa={mesaSeleccionada}
          onClose={() => setMesaSeleccionada(null)}
          onCerrarSesion={onCerrarSesion}
          onAplicarBeneficio={onAplicarBeneficio}
        />
      )}
    </div>
  )
}
