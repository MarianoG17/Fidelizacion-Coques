'use client'
// src/app/logros/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogroData, NIVEL_COLORS } from '@/types'

interface NivelData {
  id: string
  nombre: string
  orden: number
  descripcionBeneficios: string | null
  descuentoTortas: number
  visitasRequeridas: number
  esNivelActual: boolean
  beneficios: Array<{
    id: string
    nombre: string
    descripcion: string
    tipo: string
    descuento: number | null
  }>
}

interface NivelesResponse {
  niveles: NivelData[]
  nivelActual: string
  totalVisitas: number
  progreso: {
    proximoNivel: string
    visitasActuales: number
    visitasRequeridas: number
    visitasFaltantes: number
  } | null
}

export default function LogrosPage() {
    const router = useRouter()
    const [obtenidos, setObtenidos] = useState<LogroData[]>([])
    const [disponibles, setDisponibles] = useState<any[]>([])
    const [nivelesData, setNivelesData] = useState<NivelesResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const getNivelIcon = (nombreNivel: string): string => {
        const iconos: Record<string, string> = {
            'Bronce': '🥉',
            'Plata': '🥈',
            'Oro': '🥇',
            'Platino': '💎',
        }
        return iconos[nombreNivel] || '⭐'
    }

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('fidelizacion_token')
            if (!token) {
                router.push('/login')
                return
            }

            try {
                // Cargar logros
                const resLogros = await fetch('/api/logros', {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (resLogros.status === 401) {
                    router.push('/login')
                    return
                }

                const jsonLogros = await resLogros.json()
                setObtenidos(jsonLogros.data.obtenidos)
                setDisponibles(jsonLogros.data.disponibles)

                // Cargar niveles
                const resNiveles = await fetch('/api/pass/niveles', {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (resNiveles.ok) {
                    const jsonNiveles = await resNiveles.json()
                    setNivelesData(jsonNiveles.data)
                }

                // Marcar logros como vistos
                if (jsonLogros.data.obtenidos.some((l: LogroData) => !l.visto)) {
                    const logrosNoVistos = jsonLogros.data.obtenidos
                        .filter((l: LogroData) => !l.visto)
                        .map((l: LogroData) => l.id)

                    await fetch('/api/logros/marcar-vistos', {
                        method: 'PATCH',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ logroIds: logrosNoVistos }),
                    })
                }
            } catch (err) {
                setError('Error al cargar datos')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Cargando logros...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
                <div className="text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 text-purple-600 underline text-sm"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="max-w-lg mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/pass">
                        <button className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-4">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Volver</span>
                        </button>
                    </Link>

                    <h1 className="text-3xl font-bold text-slate-800 mb-2">🏆 Mis Logros</h1>
                    <div className="text-sm text-gray-600">
                        <span className="font-semibold">{obtenidos.length}</span> de {obtenidos.length + disponibles.length} logros desbloqueados
                    </div>
                </div>

                {/* Carrusel de Niveles */}
                {nivelesData && nivelesData.niveles.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span>🏅</span>
                            Niveles de Membresía
                        </h2>
                        
                        {/* Progreso al próximo nivel */}
                        {nivelesData.progreso && (
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4 mb-4 border border-purple-100">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{getNivelIcon(nivelesData.progreso.proximoNivel)}</span>
                                        <div>
                                            <p className="text-xs text-gray-600 font-medium">Próximo nivel</p>
                                            <p className="text-sm font-bold text-purple-700">{nivelesData.progreso.proximoNivel}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-600">Te faltan</p>
                                        <p className="text-xl font-bold text-purple-700">{nivelesData.progreso.visitasFaltantes}</p>
                                        <p className="text-xs text-gray-600">visitas</p>
                                    </div>
                                </div>
                                {/* Barra de progreso */}
                                <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                (nivelesData.progreso.visitasActuales / nivelesData.progreso.visitasRequeridas) * 100
                                            )}%`,
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-center text-gray-500 mt-1">
                                    {nivelesData.progreso.visitasActuales} / {nivelesData.progreso.visitasRequeridas} visitas
                                </p>
                            </div>
                        )}

                        {/* Carrusel horizontal de niveles */}
                        <div className="relative">
                            <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
                                {nivelesData.niveles.map((nivel) => {
                                    const color = NIVEL_COLORS[nivel.nombre] || '#6b7280'
                                    const esActual = nivel.esNivelActual
                                    
                                    return (
                                        <div
                                            key={nivel.id}
                                            className={`flex-shrink-0 w-72 rounded-2xl p-4 snap-center transition-all ${
                                                esActual
                                                    ? 'bg-white border-2 shadow-lg'
                                                    : 'bg-white border border-gray-200 shadow-sm'
                                            }`}
                                            style={esActual ? { borderColor: color } : {}}
                                        >
                                            {/* Header del nivel */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-3xl">{getNivelIcon(nivel.nombre)}</span>
                                                    <div>
                                                        <h4 className="font-bold text-lg" style={{ color }}>
                                                            {nivel.nombre}
                                                        </h4>
                                                        {esActual && (
                                                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                                                Tu nivel actual
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Requisitos */}
                                            <div className="mb-3 pb-3 border-b border-gray-100">
                                                <p className="text-xs text-gray-500">Requisito:</p>
                                                <p className="text-sm font-semibold text-gray-700">
                                                    {nivel.visitasRequeridas} {nivel.visitasRequeridas === 1 ? 'visita' : 'visitas'}
                                                </p>
                                            </div>

                                            {/* Beneficios - TODOS visibles */}
                                            <div>
                                                <p className="text-xs font-semibold text-gray-600 mb-2">Beneficios:</p>
                                                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                                    {/* Descuento en tortas (si existe) */}
                                                    {nivel.descuentoTortas > 0 && (
                                                        <li className="flex items-start gap-2 text-xs text-gray-600">
                                                            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                                                            <span className="flex-1">🎂 {nivel.descuentoTortas}% de descuento en tortas</span>
                                                        </li>
                                                    )}
                                                    
                                                    {/* Beneficios del nivel */}
                                                    {nivel.beneficios.length > 0 ? (
                                                        nivel.beneficios.map((beneficio) => (
                                                            <li key={beneficio.id} className="flex items-start gap-2 text-xs text-gray-600">
                                                                <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                                                                <span className="flex-1">{beneficio.nombre}</span>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        !nivel.descuentoTortas && (
                                                            <li className="text-xs text-gray-400 italic">Beneficios básicos</li>
                                                        )
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            
                            {/* Indicador de scroll */}
                            <div className="flex justify-center gap-1.5 mt-2">
                                {nivelesData.niveles.map((nivel) => (
                                    <div
                                        key={nivel.id}
                                        className={`h-1.5 rounded-full transition-all ${
                                            nivel.esNivelActual ? 'w-6 bg-purple-500' : 'w-1.5 bg-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Logros Obtenidos */}
                {obtenidos.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span>✅</span>
                            Logros Desbloqueados
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {obtenidos.map((logro) => (
                                <div
                                    key={logro.id}
                                    className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-4 relative"
                                >
                                    {!logro.visto && (
                                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                            NUEVO
                                        </div>
                                    )}
                                    <div className="text-4xl mb-2">{logro.icono}</div>
                                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{logro.nombre}</h3>
                                    <p className="text-xs text-gray-600 mb-2">{logro.descripcion}</p>
                                    <div className="text-xs text-gray-500 text-right">
                                        {new Date(logro.obtenidoEn).toLocaleDateString('es-AR', {
                                            day: 'numeric',
                                            month: 'short'
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Logros Disponibles */}
                {disponibles.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span>🎯</span>
                            Próximos Logros
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {disponibles.map((logro) => (
                                <div
                                    key={logro.id}
                                    className="bg-white border-2 border-gray-200 rounded-xl p-4 opacity-60"
                                >
                                    <div className="text-4xl mb-2 grayscale">{logro.icono}</div>
                                    <h3 className="font-semibold text-gray-600 text-sm mb-1">{logro.nombre}</h3>
                                    <p className="text-xs text-gray-500">{logro.descripcion}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mensaje si no hay logros */}
                {obtenidos.length === 0 && disponibles.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🏆</div>
                        <p className="text-gray-600">¡Empezá a desbloquear logros visitándonos!</p>
                    </div>
                )}
            </div>

            {/* Navegación inferior fija */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
                <div className="max-w-lg mx-auto flex justify-around items-center py-3 px-4">
                    <Link href="/pass" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                        </svg>
                        <span className="text-xs font-medium">Pass</span>
                    </Link>

                    <Link href="/logros" className="flex flex-col items-center gap-1 text-purple-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span className="text-xs font-medium">Logros</span>
                    </Link>

                    <Link href="/historial" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium">Historial</span>
                    </Link>

                    <Link href="/perfil" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs font-medium">Perfil</span>
                    </Link>
                </div>
            </nav>
        </div>
    )
}
