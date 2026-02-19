// src/app/api/woocommerce/variaciones/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Extrae el rendimiento de la descripción
 */
function extraerRendimiento(descripcion: string): string | null {
  if (!descripcion) return null

  const textoLimpio = descripcion.replace(/<[^>]*>/g, ' ')

  const patrones = [
    /rendimiento[:\s]+(\d+\s*a\s*\d+|\d+)\s*(porciones?|personas?|invitados?)\s*(\w+)?/i,
    /para\s+(\d+\s*a\s*\d+|\d+)\s*(porciones?|personas?|invitados?)\s*(\w+)?/i,
    /alcanza\s+para\s+(\d+\s*a\s*\d+|\d+)\s*(porciones?|personas?|invitados?)\s*(\w+)?/i,
  ]

  for (const patron of patrones) {
    const match = textoLimpio.match(patron)
    if (match && match[1]) {
      const cantidad = match[1].trim()
      const unidad = match[2] || 'porciones'
      const tipo = match[3] ? ` ${match[3]}` : ''
      return `${cantidad} ${unidad}${tipo}`
    }
  }

  return null
}

/**
 * GET /api/woocommerce/variaciones/[id]
 * Obtener variaciones de un producto específico
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ⚡ CACHÉ AGRESIVO: 2 horas (las variaciones no cambian frecuentemente)
  const cacheTime = 7200 // 2 horas en segundos
  
  try {
    const productId = params.id

    const wooUrl = process.env.WOOCOMMERCE_URL
    const wooKey = process.env.WOOCOMMERCE_KEY
    const wooSecret = process.env.WOOCOMMERCE_SECRET

    if (!wooUrl || !wooKey || !wooSecret) {
      return NextResponse.json(
        { error: 'Credenciales de WooCommerce no configuradas' },
        { status: 500 }
      )
    }

    const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'User-Agent': 'FidelizacionApp/1.0',
    }

    // Obtener información del producto principal
    const productResponse = await fetch(
      `${wooUrl}/wp-json/wc/v3/products/${productId}`,
      {
        headers,
        next: { revalidate: cacheTime }
      }
    )

    if (!productResponse.ok) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: productResponse.status }
      )
    }

    const product = await productResponse.json()

    // Si no es producto variable, no tiene variaciones
    if (product.type !== 'variable') {
      return NextResponse.json({
        success: true,
        productId: parseInt(productId),
        variaciones: [],
        mensaje: 'Producto simple sin variaciones'
      })
    }

    // Obtener variaciones del producto
    const variacionesResponse = await fetch(
      `${wooUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`,
      {
        headers,
        next: { revalidate: cacheTime }
      }
    )

    if (!variacionesResponse.ok) {
      return NextResponse.json(
        { error: 'No se pudieron obtener las variaciones' },
        { status: variacionesResponse.status }
      )
    }

    const variaciones = await variacionesResponse.json()

    // Procesar variaciones
    const variacionesFormateadas = variaciones.map((variacion: any) => {
      // Extraer atributos (ej: pa_tamano -> Tamaño)
      const atributos = variacion.attributes?.map((attr: any) => ({
        nombre: attr.name?.replace('pa_', '').replace(/-/g, ' ') || '',
        valor: attr.option || ''
      })) || []
      
      // Crear nombre de variante desde atributos
      const nombreVariante = atributos.map((a: any) => a.valor).join(' - ') || variacion.sku
      
      // Extraer rendimiento de la descripción de la variante
      const rendimientoVariante = extraerRendimiento(variacion.description || '')
      
      return {
        id: variacion.id,
        sku: variacion.sku,
        precio: variacion.price || '0',
        precioRegular: variacion.regular_price || variacion.price || '0',
        precioOferta: variacion.sale_price || '',
        enStock: variacion.stock_status === 'instock',
        stock: variacion.stock_quantity,
        atributos,
        nombreVariante,
        imagen: variacion.image?.src || product.images?.[0]?.src || null,
        rendimiento: rendimientoVariante,
      }
    })

    console.log(`[Variaciones API] Cargadas ${variacionesFormateadas.length} variaciones para producto ${productId}`)

    return NextResponse.json({
      success: true,
      productId: parseInt(productId),
      variaciones: variacionesFormateadas,
      count: variacionesFormateadas.length
    })
  } catch (error) {
    console.error('[Variaciones API] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener variaciones',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
