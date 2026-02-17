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
/**
 * Mapeo de versiones mini por producto (para opciones de tamaño)
 * Clave: ID del producto grande en WooCommerce
 * Valor: SKU de Ayres del producto mini
 */
const MINI_PRODUCTOS_POR_PRODUCTO: { [key: number]: string } = {
  338: '81',   // Chocotorta -> Mini Chocotorta
  343: '134',  // Rogel -> Mini Rogel
  764: '107',  // Doble Oreo -> Mini Oreo
  404: '108',  // Brownie -> Mini Brownie
  382: '119',  // Cheesecake -> Mini Cheesecake
  396: '395',  // Key Lime Pie -> Mini Key Lime Pie
  410: '109',  // Pavlova -> Mini Pavlova
}

/**
 * Mapeo manual de adicionales para productos
 * Formato: { productoId: [{ sku, nombre }] }
 * El sistema busca automáticamente el producto adicional por SKU y obtiene su precio
 */
const ADICIONALES_POR_PRODUCTO: { [key: number]: { sku: string; nombre: string }[] } = {
  333: [ // Tarta de Frutilla Grande
    { sku: '257', nombre: 'Cubierta de Dulce de Leche' }
  ],
  338: [ // Chocotorta
    { sku: '260', nombre: 'Adicional Chocotorta' }
  ],
  325: [ // Torta Ganache de Chocolate - solo adicional extra
    { sku: '260', nombre: 'Adicional' }
  ],
  388: [ // Torta Havannet
    { sku: '260', nombre: 'Adicional' }
  ],
  343: [ // Torta Rogel
    { sku: '260', nombre: 'Adicional' }
  ],
}

/**
 * Mapeo de adicionales agrupados por categorías
 * Para productos que requieren selección entre opciones agrupadas
 */
const ADICIONALES_AGRUPADOS: {
  [key: number]: {
    nombre: string;
    tipo: 'radio' | 'checkbox';
    requerido: boolean;
    opciones: { sku: string }[]
  }[]
} = {
  325: [ // Torta Ganache de Chocolate
    {
      nombre: 'Relleno',
      tipo: 'radio',
      requerido: true,
      opciones: [
        { sku: '467' }, // Relleno de Dulce de Leche (sin costo)
        { sku: '466' }, // Relleno de Chocolate (sin costo)
        { sku: '300' }  // Relleno de Nutella (con costo)
      ]
    },
    {
      nombre: 'Bizcochuelo',
      tipo: 'radio',
      requerido: true,
      opciones: [
        { sku: '461' }, // Marmolado
        { sku: '398' }, // Chocolate
        { sku: '399' }  // Vainilla
      ]
    },
    {
      nombre: 'Cubierta',
      tipo: 'radio',
      requerido: true,
      opciones: [
        { sku: '465' }, // Merengue
        { sku: '464' }  // Ganache
      ]
    }
  ]
}

/**
 * Mapeo de campos de texto personalizados para productos
 * Formato: { productoId: [{ nombre, placeholder, requerido }] }
 */
const CAMPOS_TEXTO_POR_PRODUCTO: { [key: number]: { nombre: string; placeholder: string; requerido: boolean }[] } = {
  764: [ // Torta Doble Oreo con Golosinas
    { nombre: 'Color de decoración', placeholder: 'Ej: Rosa, Celeste, Multicolor...', requerido: false }
  ],
}

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

    // Paso 0: Obtener información de productos adicionales por SKU
    const skusSimples = Object.values(ADICIONALES_POR_PRODUCTO)
      .flat()
      .map(a => a.sku)

    const skusAgrupados = Object.values(ADICIONALES_AGRUPADOS)
      .flat()
      .flatMap(grupo => grupo.opciones.map(opt => opt.sku))

    // Agregar SKUs de productos mini
    const skusMinis = Object.values(MINI_PRODUCTOS_POR_PRODUCTO)
    console.log('[DEBUG MINIS] SKUs de productos mini a buscar:', skusMinis)

    const adicionalesSkus = [...new Set([...skusSimples, ...skusAgrupados, ...skusMinis])]
    console.log('[DEBUG] Total de SKUs adicionales a buscar:', adicionalesSkus.length)

    // Mapeo de SKU -> {id, precio, nombre} para productos adicionales
    const adicionalesInfo: { [sku: string]: { id: number; precio: number; nombre: string } } = {}

    if (adicionalesSkus.length > 0) {
      try {
        // Buscar productos por SKU
        for (const sku of adicionalesSkus) {
          // Debug específico para SKUs problemáticos
          const isProblematicSku = ['109', '119', '395'].includes(sku)
          if (isProblematicSku) {
            console.log(`[DEBUG SKU ${sku}] Buscando producto en WooCommerce...`)
          }
          
          const skuResponse = await fetch(
            `${wooUrl}/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}&per_page=1`,
            { headers }
          )

          if (skuResponse.ok) {
            const skuData = await skuResponse.json()
            if (isProblematicSku) {
              console.log(`[DEBUG SKU ${sku}] Respuesta WooCommerce:`, JSON.stringify(skuData))
            }
            
            if (skuData.length > 0) {
              const prod = skuData[0]
              adicionalesInfo[sku] = {
                id: prod.id,
                precio: parseFloat(prod.price || '0'),
                nombre: prod.name
              }
              if (isProblematicSku) {
                console.log(`[DEBUG SKU ${sku}] ✓ Producto encontrado:`, prod.name, `ID: ${prod.id}`)
              }
            } else {
              if (isProblematicSku) {
                console.log(`[DEBUG SKU ${sku}] ✗ No se encontró producto con este SKU`)
              }
            }
          } else {
            if (isProblematicSku) {
              console.log(`[DEBUG SKU ${sku}] ✗ Error en la respuesta:`, skuResponse.status)
            }
          }
        }
        console.log('[Tortas API] Info de adicionales obtenida por SKU:', adicionalesInfo)
      } catch (error) {
        console.error('[Tortas API] Error obteniendo info de adicionales:', error)
      }
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

        // Debug: Log para verificar add-ons
        if (product.name.toLowerCase().includes('frutilla')) {
          console.log(`[DEBUG] Producto: ${product.name}`)
          console.log(`[DEBUG] Meta data count: ${product.meta_data?.length || 0}`)
          console.log(`[DEBUG] Add-ons encontrados:`, JSON.stringify(addOns, null, 2))
        }

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

        // Agregar variante sintética para mini producto si existe
        const skuMini = MINI_PRODUCTOS_POR_PRODUCTO[product.id]
        
        // Debug: Log para productos con mini configurado
        if (['Key Lime', 'Pavlova', 'Cheesecake'].some(name => product.name.includes(name))) {
          console.log(`[DEBUG MINI] Producto: ${product.name} (ID: ${product.id})`)
          console.log(`[DEBUG MINI] SKU Mini configurado: ${skuMini}`)
          console.log(`[DEBUG MINI] Info mini disponible:`, skuMini ? !!adicionalesInfo[skuMini] : false)
          if (skuMini && adicionalesInfo[skuMini]) {
            console.log(`[DEBUG MINI] Agregando variante mini`)
          }
        }
        
        if (skuMini) {
          const infoMini = adicionalesInfo[skuMini]
          if (infoMini) {
            // Agregar como primera variante (al inicio del array)
            variations.unshift({
              id: infoMini.id,
              sku: skuMini,
              precio: infoMini.precio.toString(),
              precioRegular: infoMini.precio.toString(),
              precioOferta: '',
              enStock: true,
              stock: null,
              atributos: [{
                nombre: 'Tamaño',
                valor: 'Mini'
              }],
              nombreVariante: 'Mini',
              imagen: product.images?.[0]?.src || null,
              rendimiento: null,
            })
          } else {
            console.warn(`[MINI] No se encontró info para SKU mini ${skuMini} del producto ${product.name}`)
          }
        }

        // Extraer rendimiento del producto
        const rendimientoProducto = extraerRendimiento(product.description || product.short_description)

        // Procesar add-ons del plugin (si los hay)
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

        // Agregar adicionales manuales si este producto los tiene configurados
        const adicionalesManuales = ADICIONALES_POR_PRODUCTO[product.id]
        if (adicionalesManuales) {
          adicionalesManuales.forEach(adicional => {
            const info = adicionalesInfo[adicional.sku]
            if (info) {
              addOnsFormateados.push({
                nombre: info.nombre, // Usar nombre de WooCommerce
                descripcion: '',
                tipo: 'checkbox',
                requerido: false,
                opciones: [{
                  etiqueta: info.nombre, // Usar nombre de WooCommerce
                  precio: info.precio,
                  precioTipo: 'flat_fee',
                  wooId: info.id,
                  sku: adicional.sku
                }]
              })
            } else {
              console.warn(`[Tortas API] No se encontró info para SKU ${adicional.sku}`)
            }
          })
        }

        // Agregar adicionales agrupados si este producto los tiene configurados
        const adicionalesAgrupados = ADICIONALES_AGRUPADOS[product.id]
        if (adicionalesAgrupados) {
          adicionalesAgrupados.forEach(grupo => {
            const opcionesFormateadas = grupo.opciones
              .map(opt => {
                const info = adicionalesInfo[opt.sku]
                if (info) {
                  return {
                    etiqueta: info.nombre,
                    precio: info.precio,
                    precioTipo: 'flat_fee' as const,
                    wooId: info.id,
                    sku: opt.sku
                  }
                }
                return null
              })
              .filter(opt => opt !== null) as any[]

            if (opcionesFormateadas.length > 0) {
              addOnsFormateados.push({
                nombre: grupo.nombre,
                descripcion: '',
                tipo: grupo.tipo,
                requerido: grupo.requerido,
                opciones: opcionesFormateadas
              })
            }
          })
        }

        // Obtener campos de texto personalizados
        const camposTexto = CAMPOS_TEXTO_POR_PRODUCTO[product.id] || []

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
          // Campos de texto personalizados
          camposTexto: camposTexto,
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
