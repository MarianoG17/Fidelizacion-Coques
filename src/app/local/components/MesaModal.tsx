'use client'

interface Props {
  mesa: any
  onClose: () => void
  onCerrarSesion: (sesionId: string) => void
  onAplicarBeneficio: (clienteId: string, beneficioId: string) => void
}

export default function MesaModal({ mesa, onClose, onCerrarSesion, onAplicarBeneficio }: Props) {
  const { sesiones } = mesa

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6 rounded-t-2xl sticky top-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Mesa {mesa.mesa.nombre}</h2>
              <p className="text-purple-200">
                {sesiones.length} {sesiones.length === 1 ? 'cliente' : 'clientes'} en la mesa
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

        {/* Body - Lista de clientes */}
        <div className="p-6 space-y-6">
          {sesiones.map((sesion: any) => (
            <div key={sesion.id} className="border-2 border-purple-200 rounded-2xl overflow-hidden">
              {/* Cliente Header */}
              <div className="bg-purple-100 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-purple-900">
                      {sesion.cliente.nombre}
                    </h3>
                    <p className="text-sm text-purple-700">
                      {sesion.cliente.nivel} • {sesion.cliente.phone}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      ⏱️ {sesion.duracionMinutos} minutos en la mesa
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`¿${sesion.cliente.nombre.split(' ')[0]} se retiró? Esto cerrará su sesión.`)) {
                        onCerrarSesion(sesion.id)
                        // Si es el único cliente, cerrar el modal
                        if (sesiones.length === 1) {
                          onClose()
                        }
                      }
                    }}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-700 transition"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>

              {/* Beneficios del cliente */}
              <div className="p-4 space-y-4">
                {/* BENEFICIOS APLICADOS (lo más importante) */}
                {sesion.beneficiosAplicados && sesion.beneficiosAplicados.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-orange-800 flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      Beneficios Aplicados (cargar en Ayresit)
                    </h4>
                    <div className="space-y-2">
                      {sesion.beneficiosAplicados.map((b: any) => (
                        <div
                          key={b.id + b.aplicadoEn}
                          className="bg-orange-50 border-2 border-orange-400 rounded-lg p-3 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="font-bold text-orange-900 text-sm">{b.nombre}</p>
                              <p className="text-xs text-orange-800 mt-1 font-mono bg-white rounded p-2 border border-orange-200">
                                💳 Cargar en Ayresit: <span className="font-bold">{b.descripcionCaja}</span>
                              </p>
                              <p className="text-xs text-orange-700 mt-1">
                                ⏰ Aplicado: {new Date(b.aplicadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* BENEFICIOS DISPONIBLES */}
                {sesion.beneficiosDisponibles.length > 0 ? (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-gray-700">Beneficios Disponibles</h4>
                    <div className="space-y-2">
                      {sesion.beneficiosDisponibles.map((b: any) => (
                        <div
                          key={b.id}
                          className="bg-green-50 border border-green-200 rounded-lg p-3"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <p className="font-bold text-green-800 text-sm">{b.nombre}</p>
                              <p className="text-xs text-green-700 mt-1 font-mono bg-white/70 rounded p-1.5">
                                → Cargar en Aires: {b.descripcionCaja}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                onAplicarBeneficio(sesion.cliente.id, b.id)
                              }}
                              className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-700 transition whitespace-nowrap"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  !sesion.beneficiosAplicados || sesion.beneficiosAplicados.length === 0 ? (
                    <div className="bg-gray-100 rounded-lg p-3 text-center text-gray-500 text-sm">
                      Sin beneficios disponibles
                    </div>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
