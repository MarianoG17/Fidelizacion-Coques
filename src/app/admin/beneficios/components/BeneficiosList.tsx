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
        <div className="bg-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-700">
                            <th className="text-left p-4 text-slate-300 font-semibold">Beneficio</th>
                            <th className="text-left p-4 text-slate-300 font-semibold">Descripción Caja</th>
                            <th className="text-left p-4 text-slate-300 font-semibold">Tipo</th>
                            <th className="text-left p-4 text-slate-300 font-semibold">Descuento</th>
                            <th className="text-left p-4 text-slate-300 font-semibold">Límite/día</th>
                            <th className="text-left p-4 text-slate-300 font-semibold">Niveles</th>
                            <th className="text-left p-4 text-slate-300 font-semibold">Usos</th>
                            <th className="text-left p-4 text-slate-300 font-semibold">Estado</th>
                            <th className="text-left p-4 text-slate-300 font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {beneficios.map((beneficio) => (
                            <tr
                                key={beneficio.id}
                                className={`border-t border-slate-700 hover:bg-slate-750 transition ${!beneficio.activo ? 'opacity-60' : ''}`}
                            >
                                {/* Beneficio */}
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{beneficio.icono}</span>
                                        <span className="text-white font-semibold">{beneficio.nombre}</span>
                                    </div>
                                </td>

                                {/* Descripción Caja */}
                                <td className="p-4">
                                    <span className="text-slate-300 text-sm">{beneficio.descripcionCaja}</span>
                                </td>

                                {/* Tipo */}
                                <td className="p-4">
                                    {getTipoBadge(beneficio.tipo)}
                                </td>

                                {/* Descuento */}
                                <td className="p-4">
                                    {beneficio.tipo === 'DESCUENTO' && beneficio.descuento ? (
                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold border border-blue-500/30">
                                            {Math.round(beneficio.descuento * 100)}% OFF
                                        </span>
                                    ) : (
                                        <span className="text-slate-600 text-sm">-</span>
                                    )}
                                </td>

                                {/* Límite/día */}
                                <td className="p-4">
                                    <span className="text-slate-300 text-sm">
                                        {beneficio.maxPorDia === 0 ? 'Sin límite' : beneficio.maxPorDia}
                                    </span>
                                </td>

                                {/* Niveles */}
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1">
                                        {beneficio.niveles
                                            .sort((a, b) => a.orden - b.orden)
                                            .map((nivel) => (
                                                <span
                                                    key={nivel.id}
                                                    className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs"
                                                >
                                                    {nivel.nombre === 'Bronce' && '🥉'}
                                                    {nivel.nombre === 'Plata' && '🥈'}
                                                    {nivel.nombre === 'Oro' && '🥇'}
                                                </span>
                                            ))}
                                    </div>
                                </td>

                                {/* Usos */}
                                <td className="p-4">
                                    <span className="text-slate-300 text-sm font-semibold">{beneficio.usosTotal}</span>
                                </td>

                                {/* Estado */}
                                <td className="p-4">
                                    {beneficio.activo ? (
                                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold border border-green-500/30">
                                            Activo
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold border border-red-500/30">
                                            Inactivo
                                        </span>
                                    )}
                                </td>

                                {/* Acciones */}
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onEditar(beneficio)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => onEliminar(beneficio.id)}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
