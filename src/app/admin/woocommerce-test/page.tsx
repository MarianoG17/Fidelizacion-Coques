'use client'

import { useState } from 'react'
import BackButton from '@/components/shared/BackButton'

interface Product {
  id: number
  nombre: string
  precio: string
  precioRegular: string
  precioOferta: string
  descripcion: string
  imagen: string | null
  stock: number
  enStock: boolean
  categorias: string[]
}

export default function WooCommerceTestPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [showRaw, setShowRaw] = useState(false)
  const [rawData, setRawData] = useState<any>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    setProducts([])
    setRawData(null)

    try {
      const response = await fetch('/api/woocommerce/test-products')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al conectar con WooCommerce')
      }

      if (data.success) {
        setProducts(data.products || [])
        setRawData(data)
      } else {
        throw new Error('No se pudieron obtener los productos')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/admin" />

        <div className="bg-white rounded-lg shadow-md p-6 mt-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            🛍️ Prueba de Conexión WooCommerce
          </h1>
          <p className="text-gray-600 mb-6">
            Verifica que la conexión con tu tienda WooCommerce funciona correctamente
          </p>

          {/* Botón de prueba */}
          <div className="mb-6">
            <button
              onClick={testConnection}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Conectando...' : '🔌 Probar Conexión'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">❌ Error de Conexión</h3>
              <p className="text-red-700 text-sm">{error}</p>
              <div className="mt-3 text-sm text-red-600">
                <p className="font-semibold">Verifica:</p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>Las variables de entorno WOOCOMMERCE_URL, WOOCOMMERCE_KEY y WOOCOMMERCE_SECRET están configuradas</li>
                  <li>La URL de tu tienda es correcta (ejemplo: https://tutienda.com)</li>
                  <li>Las credenciales de API son válidas</li>
                  <li>La API REST de WooCommerce está habilitada</li>
                </ul>
              </div>
            </div>
          )}

          {/* Productos */}
          {products.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  ✅ Conexión Exitosa - {products.length} Productos
                </h2>
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {showRaw ? 'Ocultar' : 'Ver'} datos completos
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                  >
                    {product.imagen && (
                      <img
                        src={product.imagen}
                        alt={product.nombre}
                        className="w-full h-48 object-cover rounded-md mb-3"
                      />
                    )}
                    
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {product.nombre}
                    </h3>
                    
                    {product.descripcion && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.descripcion}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Precio:</span>
                        <span className="font-semibold text-green-600">
                          ${product.precio}
                        </span>
                      </div>

                      {product.precioOferta && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Regular:</span>
                          <span className="line-through text-gray-400">
                            ${product.precioRegular}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-gray-600">Stock:</span>
                        <span className={product.enStock ? 'text-green-600' : 'text-red-600'}>
                          {product.enStock ? `${product.stock || 'En stock'}` : 'Sin stock'}
                        </span>
                      </div>

                      {product.categorias.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {product.categorias.map((cat, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                        ID: {product.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datos completos (JSON) */}
          {showRaw && rawData && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">📋 Datos Completos (JSON)</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </div>
          )}

          {/* Instrucciones */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">📖 Configuración</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p><strong>1. Crea las credenciales en WooCommerce:</strong></p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Ve a WooCommerce → Ajustes → Avanzado → API REST</li>
                <li>Crea una nueva clave API con permisos de Lectura/Escritura</li>
                <li>Copia el Consumer Key y Consumer Secret</li>
              </ul>
              
              <p className="mt-3"><strong>2. Configura las variables de entorno:</strong></p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Agrega a tu archivo <code className="bg-blue-100 px-1 rounded">.env.local</code>:</li>
              </ul>
              <pre className="bg-blue-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`WOOCOMMERCE_URL="https://tutienda.com"
WOOCOMMERCE_KEY="ck_xxxxx"
WOOCOMMERCE_SECRET="cs_xxxxx"`}
              </pre>

              <p className="mt-3"><strong>3. Reinicia el servidor de desarrollo</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
