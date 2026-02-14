'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'
import { useCarrito } from '@/hooks/useCarrito'

export default function CarritoPage() {
  const router = useRouter()
  const { items, actualizarCantidad, eliminarItem, vaciarCarrito, cantidadTotal, precioTotal, cargado } = useCarrito()
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

  // Datos del formulario
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')

  async function procederCheckout() {
    // Validar campos
    if (!nombre.trim()) {
      setError('Por favor ingresá tu nombre')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresá un email válido')
      return
    }

    setError(null)
    setProcesando(true)

    try {
      // Construir items para el pedido
      const itemsPedido = items.map(item => ({
        productoId: item.productoId,
        varianteId: item.varianteId,
        cantidad: item.cantidad,
      }))

      const response = await fetch('/api/woocommerce/crear-pedido', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          email,
          telefono,
          items: itemsPedido,
          notas,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el pedido')
      }

      if (data.success) {
        // Vaciar carrito
        vaciarCarrito()
        
        // Mostrar confirmación
        setMostrarConfirmacion(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pedido')
    } finally {
      setProcesando(false)
    }
  }

  if (!cargado) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-transparent"></div>
      </div>
    )
  }

  // Modal de confirmación
  if (mostrarConfirmacion) {
    return (
      <div className="min-h-screen bg-white p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
          <div className="mb-4">
            <span className="text-6xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            ¡Pedido Realizado!
          </h2>
          <p className="text-gray-700 mb-4">
            Tu pedido fue enviado exitosamente. Te contactaremos pronto para coordinar la entrega.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Revisá tu email ({email}) para ver los detalles del pedido.
          </p>
          <button
            onClick={() => router.push('/tortas')}
            className="bg-gray-800 text-white px-6 py-3 rounded font-semibold hover:bg-gray-700 transition-colors"
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/tortas" />

        <div className="mt-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🛒 Carrito de Compras
          </h1>
          <p className="text-gray-600">
            {cantidadTotal} {cantidadTotal === 1 ? 'producto' : 'productos'}
          </p>
        </div>

        {items.length === 0 ? (
          /* Carrito vacío */
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="text-6xl mb-4 block">🛒</span>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Tu carrito está vacío
            </h2>
            <p className="text-gray-600 mb-6">
              Descubrí nuestras tortas y agregá tus favoritas al carrito
            </p>
            <button
              onClick={() => router.push('/tortas')}
              className="bg-gray-800 text-white px-6 py-3 rounded font-semibold hover:bg-gray-700 transition-colors"
            >
              Ver Tortas
            </button>
          </div>
        ) : (
          /* Carrito con productos */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de productos */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-4">
                  <div className="flex gap-4">
                    {/* Imagen */}
                    {item.imagen ? (
                      <img
                        src={item.imagen}
                        alt={item.nombre}
                        className="w-24 h-24 object-cover rounded"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-3xl">🍰</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{item.nombre}</h3>
                      {item.nombreVariante && (
                        <p className="text-sm text-gray-600">{item.nombreVariante}</p>
                      )}
                      <p className="text-lg font-semibold text-gray-800 mt-1">
                        ${item.precio.toFixed(2)}
                      </p>
                    </div>

                    {/* Controles */}
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => eliminarItem(item.productoId, item.varianteId)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ✕ Eliminar
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => actualizarCantidad(item.productoId, item.varianteId, item.cantidad - 1)}
                          className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 font-bold"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-semibold">{item.cantidad}</span>
                        <button
                          onClick={() => actualizarCantidad(item.productoId, item.varianteId, item.cantidad + 1)}
                          className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <p className="text-gray-600 text-sm mt-2">
                        Subtotal: <span className="font-semibold">${(item.precio * item.cantidad).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={vaciarCarrito}
                className="text-red-600 hover:text-red-800 text-sm underline"
              >
                Vaciar carrito
              </button>
            </div>

            {/* Resumen y Checkout */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Resumen del pedido</h2>

                <div className="border-t border-b border-gray-200 py-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">${precioTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-800">
                    <span>Total</span>
                    <span>${precioTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Formulario */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                      placeholder="Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                      placeholder="+54 9 11 1234-5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas del pedido (opcional)
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                      placeholder="Ej: Fecha de entrega deseada, dedicatoria, etc."
                    />
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={procederCheckout}
                  disabled={procesando}
                  className="w-full bg-gray-800 text-white py-3 rounded font-bold hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {procesando ? 'Procesando...' : 'Realizar Pedido'}
                </button>

                <p className="text-xs text-gray-500 mt-3 text-center">
                  Al realizar el pedido, te contactaremos para coordinar el pago y la entrega
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
