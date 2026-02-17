// src/app/api/woocommerce/tortas/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Extrae el rendimiento de la descripción del producto
 * Busca patrones como "Rendimiento: 10 a 12 porciones medianas", "Para 20 personas", etc.
 */
function extraerRendimiento(descripcion: string): string | null {
  if (!descripcion) return null

  // Limpiar HTML tags pero mantener el texto
  const textoLimpio = descripcion.replace(/<[^>]*>/g, ' ')

  // Patrones a buscar (con rangos y tipos)
  const patrones = [
    // "Rendimiento: 10 a 12 porciones medianas"
    /rendimiento[:\s]+(\d+\s*a\s*\d+|\d+)\s*(porciones?|personas?|invitados?)\s*(\w+)?/i,
    // "Para 10 a 12 personas"
    /para\s+(\d+\s*a\s*\d+|\d+)\s*(porciones?|personas?|invitados?)\s*(\w+)?/i,
    // "Alcanza para 15 porciones"
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
 * GET /api/woocommerce/tortas
 * Obtener tortas clásicas con sus variantes (tamaños)
 */
export async function GET(req: NextRequest) {
  try {
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

    // Paso 1: Obtener el ID de la categoría "tortas clasicas"
    const controller1 = new AbortController()
    const timeout1 = setTimeout(() => controller1.abort(), 10000)

    const categoriesResponse = await fetch(
      `${wooUrl}/wp-json/wc/v3/products/categories?search=tortas clasicas&per_page=50`,
      { headers, signal: controller1.signal }
    )
    clearTimeout(timeout1)

    if (!categoriesResponse.ok) {
      return NextResponse.json(
        { error: 'No se pudo obtener las categorías' },
        { status: categoriesResponse.status }
      )
    }

    const categories = await categoriesResponse.json()

    // Buscar la categoría que coincida exactamente
    const tortasCategory = categories.find((cat: any) =>
      cat.name.toLowerCase() === 'tortas clasicas' ||
      cat.slug === 'tortas-clasicas'
    )

    if (!tortasCategory) {
      return NextResponse.json({
        success: true,
        message: 'No se encontró la categoría "tortas clasicas"',
        products: [],
        categoriesFound: categories.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })),
      })
    }

    // Paso 2: Obtener productos de esa categoría
    const controller2 = new AbortController()
    const timeout2 = setTimeout(() => controller2.abort(), 15000)

    const productsResponse = await fetch(
      `${wooUrl}/wp-json/wc/v3/products?category=${tortasCategory.id}&per_page=50&status=publish`,
      { headers, signal: controller2.signal }
    )
    clearTimeout(timeout2)

    if (!productsResponse.ok) {
      return NextResponse.json(
        { error: 'No se pudieron obtener los productos' },
        { status: productsResponse.status }
      )
    }

    const products = await productsResponse.json()

    // Paso 3: Para cada producto variable, obtener sus variantes
    const productsWithVariations = await Promise.all(
      products.map(async (product: any) => {
        let variations = []

        // Extraer add-ons del meta_data
        const addOns = product.meta_data?.filter((meta: any) =>
          meta.key === '_product_addons'
        )?.[0]?.value || []

        // Si es un producto variable, obtener las variaciones
        if (product.type === 'variable') {
          try {
            const controller3 = new AbortController()
            const timeout3 = setTimeout(() => controller3.abort(), 10000)

            const variationsResponse = await fetch(
              `${wooUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=50`,
              { headers, signal: controller3.signal }
            )
            clearTimeout(timeout3)

            if (variationsResponse.ok) {
              const variationsData = await variationsResponse.json()

              variations = variationsData.map((v: any) => {
                // Intentar extraer rendimiento de la descripción de la variante
                const rendimientoVariante = extraerRendimiento(v.description || product.description || product.short_description)

                return {
                  id: v.id,
                  sku: v.sku,
                  precio: v.price,
                  precioRegular: v.regular_price,
                  precioOferta: v.sale_price,
                  enStock: v.stock_status === 'instock',
                  stock: v.stock_quantity,
                  atributos: v.attributes.map((attr: any) => ({
                    nombre: attr.name,
                    valor: attr.option,
                  })),
                  // Construir nombre descriptivo (ej: "Grande", "Mediana")
                  nombreVariante: v.attributes.map((a: any) => a.option).join(' - '),
                  imagen: v.image?.src || product.images?.[0]?.src || null,
                  rendimiento: rendimientoVariante,
                }
              })
            }
          } catch (error) {
            console.error(`Error obteniendo variaciones de producto ${product.id}:`, error)
          }
        }

        // Extraer rendimiento del producto
        const rendimientoProducto = extraerRendimiento(product.description || product.short_description)

        // Procesar add-ons para formato más simple
        const addOnsFormateados = Array.isArray(addOns) ? addOns.map((addon: any) => ({
          nombre: addon.name || '',
          descripcion: addon.description || '',
          tipo: addon.type || 'checkbox',
          requerido: addon.required === 1 || addon.required === '1',
          opciones: Array.isArray(addon.options) ? addon.options.map((opt: any) => ({
            etiqueta: opt.label || '',
            precio: parseFloat(opt.price || '0'),
            precioTipo: opt.price_type || 'flat_fee'
          })) : []
        })) : []

        return {
          id: product.id,
          nombre: product.name,
          slug: product.slug,
          tipo: product.type, // 'simple' o 'variable'
          descripcion: product.short_description?.replace(/<[^>]*>/g, '') || '',
          descripcionLarga: product.description?.replace(/<[^>]*>/g, '') || '',
          imagen: product.images?.[0]?.src || null,
          imagenes: product.images?.map((img: any) => img.src) || [],
          // Para productos simples
          precio: product.price,
          precioRegular: product.regular_price,
          precioOferta: product.sale_price,
          stock: product.stock_quantity,
          enStock: product.stock_status === 'instock',
          rendimiento: rendimientoProducto,
          // Para productos variables
          variantes: variations,
          // Rango de precios para productos variables
          precioMin: product.price ? parseFloat(product.price) : null,
          precioMax: variations.length > 0
            ? Math.max(...variations.map((v: any) => parseFloat(v.precio || 0)))
            : null,
          categorias: product.categories?.map((c: any) => c.name) || [],
          // Add-ons opcionales
          addOns: addOnsFormateados,
        }
      })
    )

    console.log(`[WooCommerce Tortas] Obtenidos ${productsWithVariations.length} productos`)

    return NextResponse.json({
      success: true,
      categoria: {
        id: tortasCategory.id,
        nombre: tortasCategory.name,
        slug: tortasCategory.slug,
      },
      count: productsWithVariations.length,
      products: productsWithVariations,
    })
  } catch (error) {
    console.error('[WooCommerce Tortas] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener tortas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
