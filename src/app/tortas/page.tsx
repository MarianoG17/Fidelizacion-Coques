'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'
import { useCarrito } from '@/hooks/useCarrito'

interface AddOnOpcion {
  etiqueta: string
  precio: number
  precioTipo: string
  wooId?: number
  sku?: string
}

interface AddOn {
  nombre: string
  descripcion: string
  tipo: 'radio' | 'checkbox'
  requerido: boolean
  opciones: AddOnOpcion[]
}

interface CampoTexto {
  nombre: string
  placeholder: string
  requerido: boolean
}

interface Variante {
  id: number
  precio: string
  precioRegular: string
  precioOferta: string
  enStock: boolean
  stock: number | null
  nombreVariante: string
  atributos: Array<{ nombre: string; valor: string }>
  imagen: string | null
  rendimiento?: string | null
}

interface Producto {
  id: number
  nombre: string
  tipo: 'simple' | 'variable'
  descripcion: string
  imagen: string | null
  imagenes: string[]
  precio: string
  precioRegular: string
  precioOferta: string | null
  enStock: boolean
  stock: number | null
  variantes: Variante[]
  precioMin: number | null
  precioMax: number | null
  rendimiento?: string | null
  addOns?: AddOn[]
  camposTexto?: CampoTexto[]
}

export default function TortasPage() {
  const router = useRouter()
  const { agregarItem, cantidadTotal } = useCarrito()

  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<Producto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Variante | null>(null)
  const [agregado, setAgregado] = useState(false)
  const [addOnsSeleccionados, setAddOnsSeleccionados] = useState<{ [key: string]: string[] }>({})

  useEffect(() => {
    cargarTortas()
  }, [])

  // Manejar el botón atrás del navegador cuando el modal está abierto
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (productoSeleccionado) {
        e.preventDefault()
        cerrarDetalles()
      }
    }

    if (productoSeleccionado) {
      // Agregar entrada al historial para poder detectar el botón atrás
      window.history.pushState({ modalAbierto: true }, '')
      window.addEventListener('popstate', handlePopState)
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [productoSeleccionado])

  async function cargarTortas() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/woocommerce/tortas')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar tortas')
      }

      if (data.success) {
        setProductos(data.products || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  function abrirDetalles(producto: Producto) {
    setProductoSeleccionado(producto)
    if (producto.variantes.length > 0) {
      // Ordenar variantes por precio (de menor a mayor)
      const variantesOrdenadas = [...producto.variantes].sort((a, b) =>
        parseFloat(a.precio) - parseFloat(b.precio)
      )
      producto.variantes = variantesOrdenadas
      setVarianteSeleccionada(variantesOrdenadas[0])
    } else {
      setVarianteSeleccionada(null)
    }
    // Resetear add-ons seleccionados
    setAddOnsSeleccionados({})
  }

  // Función para formatear precio con separador de miles
  function formatearPrecio(precio: string | number): string {
    const precioNum = typeof precio === 'string' ? parseFloat(precio) : precio
    return precioNum.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function cerrarDetalles() {
    setProductoSeleccionado(null)
    setVarianteSeleccionada(null)
    setAgregado(false)

    // Si hay una entrada de historial del modal, ir atrás
    if (window.history.state?.modalAbierto) {
      window.history.back()
    }
  }

  function toggleAddOn(addOnNombre: string, opcionEtiqueta: string, tipo: 'radio' | 'checkbox' = 'checkbox') {
    setAddOnsSeleccionados(prev => {
      const nuevosAddOns = { ...prev }

      if (tipo === 'radio') {
        // Para radio buttons, reemplazar la selección
        nuevosAddOns[addOnNombre] = [opcionEtiqueta]
      } else {
        // Para checkboxes, toggle normal
        if (!nuevosAddOns[addOnNombre]) {
          nuevosAddOns[addOnNombre] = []
        }

        const index = nuevosAddOns[addOnNombre].indexOf(opcionEtiqueta)
        if (index > -1) {
          // Ya está seleccionado, removerlo
          nuevosAddOns[addOnNombre] = nuevosAddOns[addOnNombre].filter(o => o !== opcionEtiqueta)
          if (nuevosAddOns[addOnNombre].length === 0) {
            delete nuevosAddOns[addOnNombre]
          }
        } else {
          // No está seleccionado, agregarlo
          nuevosAddOns[addOnNombre].push(opcionEtiqueta)
        }
      }

      return nuevosAddOns
    })
  }

  function calcularPrecioTotal(): number {
    let precioBase = 0

    if (productoSeleccionado) {
      if (varianteSeleccionada) {
        precioBase = parseFloat(varianteSeleccionada.precio)
      } else {
        precioBase = parseFloat(productoSeleccionado.precio)
      }

      // Sumar precios de add-ons seleccionados
      if (productoSeleccionado.addOns) {
        productoSeleccionado.addOns.forEach(addOn => {
          const seleccionados = addOnsSeleccionados[addOn.nombre] || []
          seleccionados.forEach(etiqueta => {
            const opcion = addOn.opciones.find(o => o.etiqueta === etiqueta)
            if (opcion) {
              precioBase += opcion.precio
            }
          })
        })
      }
    }

    return precioBase
  }

  function agregarAlCarrito() {
    if (!productoSeleccionado) return

    // Si es producto variable, necesita variante seleccionada
    if (productoSeleccionado.variantes.length > 0 && !varianteSeleccionada) {
      alert('Por favor seleccioná un tamaño')
      return
    }

    // Calcular precio de add-ons
    let precioAddOns = 0
    if (productoSeleccionado.addOns) {
      productoSeleccionado.addOns.forEach(addOn => {
        const seleccionados = addOnsSeleccionados[addOn.nombre] || []
        seleccionados.forEach(etiqueta => {
          const opcion = addOn.opciones.find(o => o.etiqueta === etiqueta)
          if (opcion) {
            precioAddOns += opcion.precio
          }
        })
      })
    }

    const item = {
      productoId: productoSeleccionado.id,
      varianteId: varianteSeleccionada?.id,
      nombre: productoSeleccionado.nombre,
      nombreVariante: varianteSeleccionada?.nombreVariante,
      precio: varianteSeleccionada ? parseFloat(varianteSeleccionada.precio) : parseFloat(productoSeleccionado.precio),
      imagen: varianteSeleccionada?.imagen || productoSeleccionado.imagen,
      rendimiento: varianteSeleccionada?.rendimiento || productoSeleccionado.rendimiento,
      addOns: Object.keys(addOnsSeleccionados).length > 0 ? addOnsSeleccionados : undefined,
      precioAddOns: precioAddOns > 0 ? precioAddOns : undefined,
    }

    agregarItem(item)
    setAgregado(true)

    // Ocultar mensaje después de 2 segundos
    setTimeout(() => setAgregado(false), 2000)
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/pass" />

        <div className="mt-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🍰 Tortas Clásicas
          </h1>
          <p className="text-gray-600">
            Descubrí nuestra selección de tortas artesanales
          </p>
        </div>

        {/* Botón flotante del carrito */}
        {cantidadTotal > 0 && (
          <button
            onClick={() => router.push('/carrito')}
            className="fixed bottom-6 right-6 bg-gray-800 text-white p-4 rounded-full shadow-lg hover:bg-gray-700 transition-all z-50 flex items-center gap-2"
          >
            <span className="text-2xl">🛒</span>
            <span className="bg-white text-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
              {cantidadTotal}
            </span>
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Cargando tortas...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">❌ Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={cargarTortas}
              className="mt-3 text-sm text-red-600 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Grid de productos */}
        {!loading && !error && productos.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">No hay tortas disponibles en este momento</p>
          </div>
        )}

        {!loading && productos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productos.map((producto) => (
              <div
                key={producto.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => abrirDetalles(producto)}
              >
                {/* Imagen */}
                {producto.imagen ? (
                  <div className="relative h-64 bg-gray-100">
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-64 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                    <span className="text-6xl">🍰</span>
                  </div>
                )}

                {/* Contenido */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">
                    {producto.nombre}
                  </h3>

                  {producto.descripcion && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {producto.descripcion}
                    </p>
                  )}

                  {/* Mostrar rendimiento si está disponible */}
                  {producto.rendimiento && (
                    <p className="text-xs text-purple-600 font-medium mb-3 flex items-center gap-1">
                      <span>👥</span> {producto.rendimiento}
                    </p>
                  )}

                  {/* Precio */}
                  <div className="mb-3">
                    {producto.tipo === 'simple' ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          ${formatearPrecio(producto.precio)}
                        </span>
                        {producto.precioOferta && (
                          <span className="text-sm text-gray-400 line-through">
                            ${formatearPrecio(producto.precioRegular)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-700">
                        {producto.precioMin === producto.precioMax ? (
                          <span className="text-2xl font-bold text-green-600">
                            ${formatearPrecio(producto.precioMin || 0)}
                          </span>
                        ) : (
                          <span className="text-lg font-semibold text-gray-600">
                            Desde ${formatearPrecio(producto.precioMin || 0)}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {producto.variantes.length} tamaños disponibles
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botón */}
                  <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                    Ver detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de detalles */}
        {productoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  {productoSeleccionado.nombre}
                </h2>
                <button
                  onClick={cerrarDetalles}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6">
                {/* Imagen principal */}
                {productoSeleccionado.imagen && (
                  <div className="mb-6">
                    <img
                      src={varianteSeleccionada?.imagen || productoSeleccionado.imagen}
                      alt={productoSeleccionado.nombre}
                      className="w-full h-80 object-cover rounded-xl"
                    />
                  </div>
                )}

                {/* Descripción */}
                {productoSeleccionado.descripcion && (
                  <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed">
                      {productoSeleccionado.descripcion}
                    </p>
                  </div>
                )}

                {/* Variantes */}
                {productoSeleccionado.variantes.length > 0 ? (
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-3">Tamaños disponibles</h3>
                    <div className="space-y-3">
                      {productoSeleccionado.variantes.map((variante) => (
                        <button
                          key={variante.id}
                          onClick={() => setVarianteSeleccionada(variante)}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${varianteSeleccionada?.id === variante.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                            }`}
                          disabled={!variante.enStock}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">
                                {variante.nombreVariante}
                              </p>
                              {/* Mostrar rendimiento de la variante */}
                              {variante.rendimiento && (
                                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                                  <span>👥</span> {variante.rendimiento}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold text-green-600">
                                ${formatearPrecio(variante.precio)}
                              </p>
                              {variante.precioOferta && (
                                <p className="text-sm text-gray-400 line-through">
                                  ${formatearPrecio(variante.precioRegular)}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Producto simple */
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Precio</p>
                        {productoSeleccionado.rendimiento && (
                          <p className="text-xs text-purple-600 font-medium mt-1 flex items-center gap-1">
                            <span>👥</span> {productoSeleccionado.rendimiento}
                          </p>
                        )}
                        {productoSeleccionado.enStock ? (
                          <p className="text-sm text-green-600 font-medium mt-1">
                            ✓ En stock
                          </p>
                        ) : (
                          <p className="text-sm text-red-600 font-medium mt-1">
                            Sin stock
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${formatearPrecio(productoSeleccionado.precio)}
                        </p>
                        {productoSeleccionado.precioOferta && (
                          <p className="text-sm text-gray-400 line-through">
                            ${formatearPrecio(productoSeleccionado.precioRegular)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add-ons opcionales */}
                {productoSeleccionado.addOns && productoSeleccionado.addOns.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-3">Adicionales</h3>
                    <div className="space-y-4">
                      {productoSeleccionado.addOns.map((addOn) => (
                        <div key={addOn.nombre} className="border border-gray-200 rounded-xl p-4">
                          {/* Solo mostrar título si hay más de una opción */}
                          {addOn.opciones.length > 1 && (
                            <>
                              <h4 className="font-semibold text-gray-800 mb-2">
                                {addOn.nombre}
                                {addOn.requerido && <span className="text-red-500 ml-1">*</span>}
                              </h4>
                              {addOn.descripcion && (
                                <p className="text-sm text-gray-600 mb-3">{addOn.descripcion}</p>
                              )}
                            </>
                          )}
                          <div className="space-y-2">
                            {addOn.opciones.map((opcion) => (
                              <label
                                key={opcion.etiqueta}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type={addOn.tipo === 'radio' ? 'radio' : 'checkbox'}
                                    name={addOn.tipo === 'radio' ? addOn.nombre : undefined}
                                    checked={addOnsSeleccionados[addOn.nombre]?.includes(opcion.etiqueta) || false}
                                    onChange={() => toggleAddOn(addOn.nombre, opcion.etiqueta, addOn.tipo)}
                                    className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                                  />
                                  <span className="text-gray-800">{opcion.etiqueta}</span>
                                </div>
                                {opcion.precio > 0 && (
                                  <span className="text-green-600 font-semibold">
                                    +${formatearPrecio(opcion.precio)}
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precio total */}
                {(productoSeleccionado.addOns && productoSeleccionado.addOns.length > 0 && Object.keys(addOnsSeleccionados).length > 0) && (
                  <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-800">Precio Total:</span>
                      <span className="text-2xl font-bold text-purple-600">
                        ${formatearPrecio(calcularPrecioTotal())}
                      </span>
                    </div>
                  </div>
                )}

                {/* Mensaje de éxito */}
                {agregado && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-pulse">
                    <p className="text-green-800 font-semibold text-center">
                      ✓ Agregado al carrito
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3">
                  <button
                    onClick={agregarAlCarrito}
                    disabled={
                      (productoSeleccionado.tipo === 'variable' && !varianteSeleccionada) ||
                      (productoSeleccionado.tipo === 'variable' && varianteSeleccionada && !varianteSeleccionada.enStock) ||
                      (productoSeleccionado.tipo === 'simple' && !productoSeleccionado.enStock)
                    }
                    className={`flex-1 py-3 rounded-xl font-bold transition-colors ${(productoSeleccionado.tipo === 'variable' && !varianteSeleccionada) ||
                      (productoSeleccionado.tipo === 'variable' && varianteSeleccionada && !varianteSeleccionada.enStock) ||
                      (productoSeleccionado.tipo === 'simple' && !productoSeleccionado.enStock)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                  >
                    {productoSeleccionado.tipo === 'variable' && !varianteSeleccionada
                      ? 'Seleccioná un tamaño'
                      : '🛒 Agregar al Carrito'}
                  </button>

                  <button
                    onClick={cerrarDetalles}
                    className="px-6 py-3 rounded-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
