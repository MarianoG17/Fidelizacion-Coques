// src/app/api/woocommerce/test-products/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/test-products
 * Prueba de conexión con WooCommerce - Obtener productos
 */
export async function GET(req: NextRequest) {
  try {
    const wooUrl = process.env.WOOCOMMERCE_URL
    const wooKey = process.env.WOOCOMMERCE_KEY
    const wooSecret = process.env.WOOCOMMERCE_SECRET

    if (!wooUrl || !wooKey || !wooSecret) {
      return NextResponse.json(
        { 
          error: 'Credenciales de WooCommerce no configuradas',
          missing: {
            url: !wooUrl,
            key: !wooKey,
            secret: !wooSecret
          }
        },
        { status: 500 }
      )
    }

    // Crear autenticación básica
    const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')

    // Timeout de 10 segundos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    // Llamar a la API de WooCommerce para obtener productos
    const response = await fetch(
      `${wooUrl}/wp-json/wc/v3/products?per_page=5&status=publish`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FidelizacionApp/1.0',
        },
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WooCommerce Test] Error:', response.status, errorText)
      return NextResponse.json(
        { 
          error: 'Error al conectar con WooCommerce',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      )
    }

    const products = await response.json()

    // Formatear respuesta con info útil
    const formatted = products.map((p: any) => ({
      id: p.id,
      nombre: p.name,
      precio: p.price,
      precioRegular: p.regular_price,
      precioOferta: p.sale_price,
      descripcion: p.short_description?.replace(/<[^>]*>/g, '') || '', // remover HTML
      imagen: p.images?.[0]?.src || null,
      stock: p.stock_quantity,
      enStock: p.stock_status === 'instock',
      categorias: p.categories?.map((c: any) => c.name) || [],
    }))

    console.log(`[WooCommerce Test] Obtenidos ${formatted.length} productos`)

    return NextResponse.json({
      success: true,
      count: formatted.length,
      products: formatted,
      raw: products, // incluir datos completos para debugging
    })
  } catch (error) {
    console.error('[WooCommerce Test] Error:', error)
    return NextResponse.json(
      { 
        error: 'Error al conectar con WooCommerce',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
