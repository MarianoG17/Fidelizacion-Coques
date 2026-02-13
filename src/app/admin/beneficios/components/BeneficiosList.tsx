// src/app/admin/beneficios/components/BeneficiosList.tsx
interface Beneficio {
    id: string
    nombre: string
    descripcionCaja: string
    tipo: string
    descuento: number | null
    icono: string
    descripcion: string
    maxPorDia: number
    activo: boolean
    niveles: Array<{ id: string; nombre: string; orden: number }>
    usosTotal: number
}

interface BeneficiosListProps {
    beneficios: Beneficio[]
    onEditar: (beneficio: Beneficio) => void
    onEliminar: (id: string) => void
}

export function BeneficiosList({ beneficios, onEditar, onEliminar }: BeneficiosListProps) {
    if (beneficios.length === 0) {
        return (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 text-center border border-slate-700/50">
                <div className="text-4xl mb-4">🎁</div>
                <div className="text-slate-400 text-lg">No hay beneficios para mostrar</div>
                <div className="text-slate-500 text-sm mt-2">
                    Creá tu primer beneficio para empezar
                </div>
            </div>
        )
    }

    const getTipoBadge = (tipo: string) => {
        const tipos: Record<string, { color: string; label: string }> = {
            DESCUENTO: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Descuento' },
            PRODUCTO_GRATIS: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Gratis' },
            UPGRADE: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Upgrade' },
            ACCESO_VIP: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'VIP' },
        }
        const config = tipos[tipo] || tipos.PRODUCTO_GRATIS
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                {config.label}
            </span>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {beneficios.map((beneficio) => (
                <div
                    key={beneficio.id}
                    className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border transition hover:border-slate-600 ${beneficio.activo ? 'border-slate-700/50' : 'border-slate-700/30 opacity-60'
                        }`}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="text-4xl">{beneficio.icono}</div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{beneficio.nombre}</h3>
                                <p className="text-sm text-slate-400">{beneficio.descripcionCaja}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!beneficio.activo && (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-lg border border-red-500/30">
                                    Inactivo
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2">
                            {getTipoBadge(beneficio.tipo)}
                            {beneficio.tipo === 'DESCUENTO' && beneficio.descuento && (
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold border border-blue-500/30">
                                    {Math.round(beneficio.descuento * 100)}% OFF
                                </span>
                            )}
                        </div>

                        {beneficio.descripcion && (
                            <p className="text-sm text-slate-300">{beneficio.descripcion}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                    {beneficio.maxPorDia === 0
                                        ? 'Sin límite'
                                        : `${beneficio.maxPorDia} uso${beneficio.maxPorDia > 1 ? 's' : ''}/día`}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>{beneficio.usosTotal} usos</span>
                            </div>
                        </div>

                        {/* Niveles */}
                        {beneficio.niveles.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {beneficio.niveles
                                    .sort((a, b) => a.orden - b.orden)
                                    .map((nivel) => (
                                        <span
                                            key={nivel.id}
                                            className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-xs border border-slate-600/50"
                                        >
                                            {nivel.nombre === 'Bronce' && '🥉'}
                                            {nivel.nombre === 'Plata' && '🥈'}
                                            {nivel.nombre === 'Oro' && '🥇'}
                                            {' '}{nivel.nombre}
                                        </span>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-slate-700/50">
                        <button
                            onClick={() => onEditar(beneficio)}
                            className="flex-1 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl font-medium hover:bg-blue-600/30 transition border border-blue-500/30"
                        >
                            ✏️ Editar
                        </button>
                        <button
                            onClick={() => onEliminar(beneficio.id)}
                            className="flex-1 bg-red-600/20 text-red-400 px-4 py-2 rounded-xl font-medium hover:bg-red-600/30 transition border border-red-500/30"
                        >
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}
