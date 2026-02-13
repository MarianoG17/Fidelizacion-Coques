'use client'

interface Props {
  mesa: any
  onClose: () => void
  onCerrarSesion: (sesionId: string) => void
  onAplicarBeneficio: (clienteId: string, beneficioId: string) => void
}

export default function MesaModal({ mesa, onClose, onCerrarSesion, onAplicarBeneficio }: Props) {
  const { sesion } = mesa

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Mesa {mesa.mesa.nombre}</h2>
              <p className="text-purple-200">
                {sesion.cliente.nombre} • {sesion.cliente.nivel}
              </p>
              <p className="text-sm text-purple-200 mt-1">
                {sesion.duracionMinutos} minutos en la mesa
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white text-3xl hover:text-purple-200 transition"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Beneficios disponibles */}
          {sesion.beneficiosDisponibles.length > 0 ? (
            <div>
              <h3 className="font-bold text-lg mb-3">Beneficios Disponibles</h3>
              <div className="space-y-3">
                {sesion.beneficiosDisponibles.map((b: any) => (
                  <div
                    key={b.id}
                    className="bg-green-50 border-2 border-green-200 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-green-800">{b.nombre}</p>
                        <p className="text-sm text-green-700 mt-1 font-mono bg-white/50 rounded p-2">
                          → Cargar en Aires: {b.descripcionCaja}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onAplicarBeneficio(sesion.cliente.id, b.id)
                          onClose()
                        }}
                        className="ml-3 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-500">
              Sin beneficios disponibles
            </div>
          )}

          {/* Botón cerrar sesión */}
          <button
            onClick={() => {
              if (confirm('¿El cliente se retiró? Esto liberará la mesa.')) {
                onCerrarSesion(sesion.id)
                onClose()
              }
            }}
            className="w-full mt-6 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition"
          >
            Cerrar Sesión (Liberar Mesa)
          </button>
        </div>
      </div>
    </div>
  )
}
