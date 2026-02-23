'use client'

import { useState, useEffect, Fragment, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'

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

interface Presupuesto {
  id: number
  codigo: string
  nombreCliente: string | null
  telefonoCliente: string | null
  emailCliente: string | null
  items: any[]
  precioTotal: number
  descuento: number
  fechaEntrega: string | null
  horaEntrega: string | null
  estado: 'PENDIENTE' | 'COMPLETO' | 'CONFIRMADO' | 'CANCELADO'
  notasCliente: string | null
  notasInternas: string | null
}

export default function EditarPresupuestoPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = params.codigo as string
  
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados editables
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [horaEntrega, setHoraEntrega] = useState('')
  const [notasCliente, setNotasCliente] = useState('')
  const [notasInternas, setNotasInternas] = useState('')

  // Estados para edición de producto
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null)
  const [indexItemEditando, setIndexItemEditando] = useState<number | null>(null)
  const [varianteEditando, setVarianteEditando] = useState<Variante | null>(null)
  const [addOnsEditando, setAddOnsEditando] = useState<{ [key: string]: Array<{ sku: string | undefined, etiqueta: string, id: string }> }>({})
  const [camposTextoEditando, setCamposTextoEditando] = useState<{ [nombreCampo: string]: string }>({})
  const [cargandoProducto, setCargandoProducto] = useState(false)

  useEffect(() => {
    cargarPresupuesto()
  }, [codigo])

  async function cargarPresupuesto() {
    setCargando(true)
    setError(null)

    try {
      const response = await fetch(`/api/presupuestos/${codigo}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar presupuesto')
      }

      const p = data.presupuesto
      setPresupuesto(p)
      
      // Inicializar campos editables
      setNombreCliente(p.nombreCliente || '')
      setTelefonoCliente(p.telefonoCliente || '')
      setEmailCliente(p.emailCliente || '')
      setFechaEntrega(p.fechaEntrega ? p.fechaEntrega.split('T')[0] : '')
      setHoraEntrega(p.horaEntrega || '')
      setNotasCliente(p.notasCliente || '')
      setNotasInternas(p.notasInternas || '')
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar presupuesto')
    } finally {
      setCargando(false)
    }
  }

  async function abrirEdicionProducto(item: any, index: number) {
    setCargandoProducto(true)
    setIndexItemEditando(index)

    try {
      // Cargar datos del producto desde WooCommerce
      const response = await fetch('/api/woocommerce/tortas')
      const data = await response.json()

      if (!data.success) {
        throw new Error('Error al cargar productos')
      }

      // Buscar el producto por ID
      const producto = data.products.find((p: Producto) => p.id === item.productoId)
      if (!producto) {
        throw new Error('Producto no encontrado')
      }

      // Si es producto variable, cargar variaciones
      if (producto.tipo === 'variable' && producto.variantes.length <= 1) {
        const varResponse = await fetch(`/api/woocommerce/variaciones/${producto.id}`)
        const varData = await varResponse.json()
        if (varData.success) {
          producto.variantes = [...producto.variantes, ...varData.variaciones]
        }
      }

      // Pre-seleccionar la variante si existe
      if (item.varianteId) {
        const variante = producto.variantes.find((v: Variante) => v.id === item.varianteId)
        setVarianteEditando(variante || null)
      }

      // Pre-cargar add-ons seleccionados
      if (item.addOns) {
        setAddOnsEditando(item.addOns)
      } else {
        // Inicializar add-ons requeridos
        const addOnsIniciales: { [key: string]: Array<{ sku: string | undefined, etiqueta: string, id: string }> } = {}
        if (producto.addOns) {
          producto.addOns.forEach((addOn: AddOn) => {
            if (addOn.requerido && addOn.opciones.length > 0) {
              const primeraOpcion = addOn.opciones[0]
              addOnsIniciales[addOn.nombre] = [{
                sku: primeraOpcion.sku,
                etiqueta: primeraOpcion.etiqueta,
                id: primeraOpcion.sku || primeraOpcion.wooId?.toString() || primeraOpcion.etiqueta
              }]
            }
          })
        }
        setAddOnsEditando(addOnsIniciales)
      }

      // Pre-cargar campos de texto
      if (item.camposTexto) {
        setCamposTextoEditando(item.camposTexto)
      } else {
        setCamposTextoEditando({})
      }

      setProductoEditando(producto)
    } catch (err) {
      console.error('Error al cargar producto:', err)
      alert('Error al cargar producto para editar')
    } finally {
      setCargandoProducto(false)
    }
  }

  function cerrarEdicionProducto() {
    setProductoEditando(null)
    setIndexItemEditando(null)
    setVarianteEditando(null)
    setAddOnsEditando({})
    setCamposTextoEditando({})
  }

  function toggleAddOn(addOnNombre: string, opcionId: string, opcionSku: string | undefined, opcionEtiqueta: string, tipo: 'radio' | 'checkbox' = 'checkbox') {
    setAddOnsEditando(prev => {
      const nuevosAddOns = { ...prev }
      const opcionObj = { sku: opcionSku, etiqueta: opcionEtiqueta, id: opcionId }

      if (tipo === 'radio') {
        nuevosAddOns[addOnNombre] = [opcionObj]
      } else {
        if (!nuevosAddOns[addOnNombre]) {
          nuevosAddOns[addOnNombre] = []
        }

        const index = nuevosAddOns[addOnNombre].findIndex(o => o.id === opcionId)
        if (index > -1) {
          nuevosAddOns[addOnNombre] = nuevosAddOns[addOnNombre].filter(o => o.id !== opcionId)
          if (nuevosAddOns[addOnNombre].length === 0) {
            delete nuevosAddOns[addOnNombre]
          }
        } else {
          if (addOnNombre.includes('Colores del Bizcochuelo')) {
            if (nuevosAddOns[addOnNombre].length >= 4) {
              alert('Podés seleccionar hasta 4 colores máximo')
              return prev
            }
          }
          nuevosAddOns[addOnNombre].push(opcionObj)
        }
      }

      return nuevosAddOns
    })
  }

  const calcularPrecioTotalProducto = useCallback((): number => {
    if (!productoEditando) return 0

    let precio = 0
    if (varianteEditando) {
      precio = parseFloat(varianteEditando.precio)
    } else {
      precio = parseFloat(productoEditando.precio)
    }

    // Sumar precios de add-ons
    if (productoEditando.addOns) {
      productoEditando.addOns.forEach((addOn: AddOn) => {
        const seleccionados = addOnsEditando[addOn.nombre] || []
        seleccionados.forEach(seleccion => {
          const opcion = addOn.opciones.find(o =>
            (o.sku && o.sku === seleccion.sku) ||
            (o.wooId && o.wooId.toString() === seleccion.id) ||
            o.etiqueta === seleccion.id
          )
          if (opcion) {
            precio += opcion.precio
          }
        })
      })
    }

    return precio
  }, [productoEditando, varianteEditando, addOnsEditando])

  function guardarEdicionProducto() {
    if (!productoEditando || indexItemEditando === null) return

    // Calcular precio de add-ons
    let precioAddOns = 0
    if (productoEditando.addOns) {
      productoEditando.addOns.forEach((addOn: AddOn) => {
        const seleccionados = addOnsEditando[addOn.nombre] || []
        seleccionados.forEach(seleccion => {
          const opcion = addOn.opciones.find(o =>
            (o.sku && o.sku === seleccion.sku) ||
            (o.wooId && o.wooId.toString() === seleccion.id) ||
            o.etiqueta === seleccion.id
          )
          if (opcion) {
            precioAddOns += opcion.precio
          }
        })
      })
    }

    // Actualizar el item en el presupuesto
    const itemActualizado = {
      ...presupuesto!.items[indexItemEditando],
      varianteId: varianteEditando?.id || presupuesto!.items[indexItemEditando].varianteId,
      nombreVariante: varianteEditando?.nombreVariante,
      precio: varianteEditando ? parseFloat(varianteEditando.precio) : parseFloat(productoEditando.precio),
      addOns: Object.keys(addOnsEditando).length > 0 ? addOnsEditando : undefined,
      precioAddOns: precioAddOns > 0 ? precioAddOns : undefined,
      camposTexto: Object.keys(camposTextoEditando).length > 0 ? camposTextoEditando : undefined,
    }

    // Actualizar presupuesto localmente
    const itemsActualizados = [...presupuesto!.items]
    itemsActualizados[indexItemEditando] = itemActualizado

    // Recalcular precio total
    const nuevoPrecioTotal = itemsActualizados.reduce((total, item) => {
      const precioBase = item.precio * item.cantidad
      const precioConAddons = item.precioAddOns ? (item.precioAddOns * item.cantidad) : 0
      return total + precioBase + precioConAddons
    }, 0)

    setPresupuesto({
      ...presupuesto!,
      items: itemsActualizados,
      precioTotal: nuevoPrecioTotal
    })

    cerrarEdicionProducto()
    alert('✅ Producto actualizado. No olvides guardar los cambios.')
  }

  async function guardarCambios() {
    setGuardando(true)
    setError(null)

    try {
      const response = await fetch(`/api/presupuestos/${codigo}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombreCliente: nombreCliente.trim() || null,
          telefonoCliente: telefonoCliente.trim() || null,
          emailCliente: emailCliente.trim() || null,
          fechaEntrega: fechaEntrega || null,
          horaEntrega: horaEntrega || null,
          notasCliente: notasCliente.trim() || null,
          notasInternas: notasInternas.trim() || null,
          items: presupuesto?.items,
          precioTotal: presupuesto?.precioTotal,
          estado: fechaEntrega && horaEntrega && nombreCliente && telefonoCliente ? 'COMPLETO' : 'PENDIENTE'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar cambios')
      }

      alert('✅ Cambios guardados exitosamente')
      router.push(`/local/presupuestos/${codigo}`)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al guardar cambios')
    } finally {
      setGuardando(false)
    }
  }

  function obtenerHorariosDisponibles(): string[] {
    return [
      '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00',
    ]
  }

  const formatearPrecio = useCallback((precio: string | number): string => {
    const precioNum = typeof precio === 'string' ? parseFloat(precio) : precio
    return precioNum.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [])

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-transparent"></div>
      </div>
    )
  }

  if (error || !presupuesto) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BackButton href="/local/presupuestos" label="Volver a Presupuestos" />
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <span className="text-4xl mb-4 block">❌</span>
            <h2 className="text-xl font-bold text-red-800 mb-2">
              Error al cargar presupuesto
            </h2>
            <p className="text-red-600">{error || 'Presupuesto no encontrado'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (presupuesto.estado === 'CONFIRMADO') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BackButton href="/local/presupuestos" label="Volver a Presupuestos" />
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h2 className="text-xl font-bold text-yellow-800 mb-2">
              Presupuesto Ya Confirmado
            </h2>
            <p className="text-yellow-700 mb-4">
              No se puede editar un presupuesto que ya fue confirmado
            </p>
            <button
              onClick={() => router.push(`/local/presupuestos/${codigo}`)}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700"
            >
              Ver Presupuesto
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <BackButton href="/local/presupuestos" label="Volver a Presupuestos" />

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            ✏️ Editar Presupuesto
          </h1>
          <p className="text-lg text-gray-600 font-mono">
            {presupuesto.codigo}
          </p>
        </div>

        {/* Formulario de edición */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4">
            Datos del Cliente
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                value={telefonoCliente}
                onChange={(e) => setTelefonoCliente(e.target.value)}
                placeholder="+54 9 11 1234-5678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email (opcional)
              </label>
              <input
                type="email"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Fecha y hora de entrega */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4">
            Entrega
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de Entrega *
              </label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Horario de Entrega *
              </label>
              <select
                value={horaEntrega}
                onChange={(e) => setHoraEntrega(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar horario</option>
                {obtenerHorariosDisponibles().map((hora) => (
                  <option key={hora} value={hora}>
                    {hora} hs
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4">
            Notas
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notas del Cliente
              </label>
              <textarea
                value={notasCliente}
                onChange={(e) => setNotasCliente(e.target.value)}
                placeholder="Ej: Sin nueces, decoración especial..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notas Internas (solo staff)
              </label>
              <textarea
                value={notasInternas}
                onChange={(e) => setNotasInternas(e.target.value)}
                placeholder="Notas internas del staff..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Lista de productos - ahora editables */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-bold text-lg text-gray-800 mb-4">
            Productos ({presupuesto.items.length})
          </h3>
          <div className="space-y-3">
            {presupuesto.items.map((item: any, index: number) => (
              <div 
                key={index} 
                onClick={() => abrirEdicionProducto(item, index)}
                className="p-4 border border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {item.nombre}
                      {item.nombreVariante && ` - ${item.nombreVariante}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      Cantidad: {item.cantidad}
                    </p>
                    {item.addOns && Object.keys(item.addOns).length > 0 && (
                      <p className="text-xs text-purple-600 mt-1">
                        {Object.keys(item.addOns).length} opciones agregadas
                      </p>
                    )}
                    {item.camposTexto && Object.keys(item.camposTexto).length > 0 && (
                      <p className="text-xs text-blue-600">
                        Con campos personalizados
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-gray-800">
                      ${formatearPrecio(
                        (item.precio + (item.precioAddOns || 0)) * item.cantidad
                      )}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      ✏️ Click para editar
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-300 mt-4 pt-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-green-600">${formatearPrecio(presupuesto.precioTotal)}</span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/local/presupuestos/${codigo}`)}
            className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
              guardando
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}

        {/* Info de ayuda */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Hacé click en cualquier producto para editarlo. 
            Los campos marcados con * son necesarios para poder confirmar el presupuesto.
          </p>
        </div>
      </div>

      {/* Modal de edición de producto */}
      {productoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {productoEditando.nombre}
              </h2>
              <button
                onClick={cerrarEdicionProducto}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {cargandoProducto ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando producto...</p>
                </div>
              ) : (
                <>
                  {/* Variantes */}
                  {productoEditando.variantes && productoEditando.variantes.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-lg mb-3">Tamaños disponibles</h3>
                      <div className="space-y-3">
                        {productoEditando.variantes.map((variante) => (
                          <button
                            key={variante.id}
                            onClick={() => setVarianteEditando(variante)}
                            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                              varianteEditando?.id === variante.id
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800">
                                  {variante.nombreVariante}
                                </p>
                                {variante.rendimiento && (
                                  <p className="text-xs text-purple-600 mt-1">
                                    👥 {variante.rendimiento}
                                  </p>
                                )}
                              </div>
                              <p className="text-xl font-bold text-green-600 ml-4">
                                ${formatearPrecio(variante.precio)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add-ons */}
                  {productoEditando.addOns && productoEditando.addOns.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-lg mb-3">Adicionales</h3>
                      <div className="space-y-4">
                        {productoEditando.addOns.map((addOn) => {
                          // Lógica para mostrar "Colores del Bizcochuelo" solo si se eligió "Bizcochuelo Colores"
                          if (addOn.nombre.includes('Colores del Bizcochuelo')) {
                            const bizcochuelo = addOnsEditando['Bizcochuelo']?.[0]
                            const esBizcochuloColores = bizcochuelo?.etiqueta?.includes('Colores')
                            if (!esBizcochuloColores) {
                              return null
                            }
                          }

                          return (
                            <Fragment key={addOn.nombre}>
                              <div className="border border-gray-200 rounded-xl p-4">
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
                                          checked={
                                            addOnsEditando[addOn.nombre]?.some(
                                              (o) =>
                                                o.id ===
                                                (opcion.sku ||
                                                  opcion.wooId?.toString() ||
                                                  opcion.etiqueta)
                                            ) || false
                                          }
                                          onChange={() =>
                                            toggleAddOn(
                                              addOn.nombre,
                                              opcion.sku ||
                                                opcion.wooId?.toString() ||
                                                opcion.etiqueta,
                                              opcion.sku,
                                              opcion.etiqueta,
                                              addOn.tipo
                                            )
                                          }
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

                              {/* Mostrar campo "Color de la cubierta" después de "Tipo de cubierta" */}
                              {addOn.nombre === 'Tipo de cubierta' && (() => {
                                const cubierta = addOnsEditando['Tipo de cubierta']?.[0]
                                const esButtercream = cubierta?.etiqueta?.includes('Buttercream')
                                const campoColor = productoEditando.camposTexto?.find((c) =>
                                  c.nombre.includes('Color de la cubierta')
                                )

                                if (esButtercream && campoColor) {
                                  return (
                                    <div className="border border-gray-200 rounded-xl p-4">
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {campoColor.nombre}
                                        {campoColor.requerido && (
                                          <span className="text-red-500 ml-1">*</span>
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        value={camposTextoEditando[campoColor.nombre] || ''}
                                        onChange={(e) =>
                                          setCamposTextoEditando((prev) => ({
                                            ...prev,
                                            [campoColor.nombre]: e.target.value,
                                          }))
                                        }
                                        placeholder={campoColor.placeholder}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                      />
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </Fragment>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Campos de texto personalizados */}
                  {productoEditando.camposTexto && productoEditando.camposTexto.length > 0 && (
                    <div className="mb-6">
                      <div className="space-y-4">
                        {productoEditando.camposTexto.map((campo) => {
                          // NO mostrar "Color de la cubierta" aquí
                          if (campo.nombre.includes('Color de la cubierta')) {
                            return null
                          }

                          // Lógica para campos de Cookies
                          if (
                            campo.nombre.includes('Cantidad de Cookies') ||
                            campo.nombre.includes('Descripción Cookies') ||
                            campo.nombre.includes('URL Imagen Referencia Cookies')
                          ) {
                            const cookiesSeleccionadas = Object.keys(addOnsEditando).find((key) =>
                              key.toLowerCase().includes('cookies')
                            )
                            if (
                              !cookiesSeleccionadas ||
                              !addOnsEditando[cookiesSeleccionadas] ||
                              addOnsEditando[cookiesSeleccionadas].length === 0
                            ) {
                              return null
                            }
                          }

                          return (
                            <div key={campo.nombre}>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {campo.nombre}
                                {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <input
                                type="text"
                                value={camposTextoEditando[campo.nombre] || ''}
                                onChange={(e) =>
                                  setCamposTextoEditando((prev) => ({
                                    ...prev,
                                    [campo.nombre]: e.target.value,
                                  }))
                                }
                                placeholder={campo.placeholder}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Precio total del producto */}
                  <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800 text-lg">Precio del producto:</span>
                      <span className="text-3xl font-bold text-green-600">
                        ${formatearPrecio(calcularPrecioTotalProducto())}
                      </span>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3">
                    <button
                      onClick={guardarEdicionProducto}
                      className="flex-1 py-3 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                      ✓ Guardar Cambios
                    </button>
                    <button
                      onClick={cerrarEdicionProducto}
                      className="px-6 py-3 rounded-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
