'use client'

import { useState, useMemo } from 'react'
import MesaModal from './MesaModal'

interface Props {
  estadoSalon: any
  onCerrarSesion: (sesionId: string) => void
  onAplicarBeneficio: (clienteId: string, beneficioId: string) => void
}

export default function VistaSalon({ estadoSalon, onCerrarSesion, onAplicarBeneficio }: Props) {
  const [mesaSeleccionada, setMesaSeleccionada] = useState<any>(null)

  // Calcular la altura mínima necesaria basada en la mesa más baja
  const alturaMinima = useMemo(() => {
    if (!estadoSalon?.mesas) return 150
    
    // Encontrar la mesa con la posición Y + alto más grande
    const mesaMasBaja = estadoSalon.mesas.reduce((max: number, item: any) => {
      const bottomPos = item.mesa.posY + item.mesa.alto
      return bottomPos > max ? bottomPos : max
    }, 0)
    
    // Agregar 10% de padding extra para asegurar que todo se vea
    return mesaMasBaja + 10
  }, [estadoSalon])

  if (!estadoSalon) {
    return <div className="text-center py-8 text-slate-400">Cargando estado del salón...</div>
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header con stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800 rounded-xl p-4 text-center shadow">
          <div className="text-2xl font-bold text-white">{estadoSalon.totalMesas}</div>
          <div className="text-sm text-slate-400">Total Mesas</div>
        </div>
        <div className="bg-green-600 rounded-xl p-4 text-center shadow">
          <div className="text-2xl font-bold text-white">{estadoSalon.mesasLibres}</div>
          <div className="text-sm text-green-100">Libres</div>
        </div>
        <div className="bg-red-600 rounded-xl p-4 text-center shadow">
          <div className="text-2xl font-bold text-white">{estadoSalon.mesasOcupadas}</div>
          <div className="text-sm text-red-100">Ocupadas</div>
        </div>
      </div>

      {/* Plano del salón con posiciones reales */}
      <div
        className="relative bg-slate-800 rounded-2xl overflow-visible shadow-xl"
        style={{
          paddingBottom: `${alturaMinima}%`,
        }}
      >
        <div className="absolute inset-0 p-3 overflow-visible">
          {estadoSalon.mesas.map((item: any) => (
            <button
              key={item.mesa.id}
              onClick={() => item.ocupada && setMesaSeleccionada(item)}
              disabled={!item.ocupada}
              className={`absolute rounded-lg text-xs font-bold transition-all shadow-lg ${
                item.ocupada
                  ? 'bg-red-500 text-white hover:scale-110 hover:z-10 cursor-pointer'
                  : 'bg-green-500 text-white cursor-default'
              }`}
              style={{
                left: `${item.mesa.posX}%`,
                top: `${item.mesa.posY}%`,
                width: `${item.mesa.ancho}%`,
                height: `${item.mesa.alto}%`,
              }}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-lg mb-1">
                  {item.ocupada ? '🔴' : '🟢'}
                </div>
                <div className="font-bold">{item.mesa.nombre}</div>
                {item.ocupada && item.sesiones.length > 0 && (
                  <div className="text-[10px] mt-1 opacity-90">
                    {item.sesiones.length === 1
                      ? item.sesiones[0].cliente.nombre.split(' ')[0]
                      : `${item.sesiones.length} clientes`
                    }
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-slate-300">Libre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-slate-300">Ocupada (click para detalles)</span>
        </div>
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
