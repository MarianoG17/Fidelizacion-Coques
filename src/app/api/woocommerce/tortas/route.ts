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
  359: '119',  // Cheesecake (ID: 359) -> Mini Cheesecake
  327: '395',  // Key Lime Pie (ID: 327) -> Mini Key Lime Pie
  267: '109',  // Pavlova (ID: 267) -> Mini Pavlova
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
  // ⚡ OPTIMIZACIÓN EXTREMA: Cache de 2 horas (las tortas no cambian frecuentemente)
  // Con lazy loading de variaciones, la carga inicial es muy rápida
  const cacheTime = 7200 // 2 horas en segundos

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

    const adicionalesSkus = [...new Set([...skusSimples, ...skusAgrupados, ...skusMinis])]

    // Mapeo de SKU -> {id, precio, nombre} para productos adicionales
    const adicionalesInfo: { [sku: string]: { id: number; precio: number; nombre: string } } = {}

    if (adicionalesSkus.length > 0) {
      try {
        // ⚡ OPTIMIZACIÓN CRÍTICA: Buscar todos los SKUs en LOTES DE 10
        // En lugar de 17 llamadas individuales, hacer 2 llamadas batch
        // WooCommerce permite buscar múltiples SKUs separados por coma
        const batchSize = 10
        const batches = []

        for (let i = 0; i < adicionalesSkus.length; i += batchSize) {
          batches.push(adicionalesSkus.slice(i, i + batchSize))
        }

        const batchPromises = batches.map(async (skuBatch) => {
          try {
            // Buscar múltiples SKUs en una sola llamada
            const skusParam = skuBatch.join(',')
            const batchResponse = await fetch(
              `${wooUrl}/wp-json/wc/v3/products?sku=${encodeURIComponent(skusParam)}&per_page=100`,
              {
                headers,
                next: { revalidate: cacheTime }
              }
            )

            if (batchResponse.ok) {
              const products = await batchResponse.json()
              return products.map((prod: any) => ({
                sku: prod.sku,
                info: {
                  id: prod.id,
                  precio: parseFloat(prod.price || '0'),
                  nombre: prod.name
                }
              }))
            }
          } catch (error) {
            console.error(`[Tortas API] Error obteniendo batch de SKUs:`, error)
          }
          return []
        })

        const batchResults = await Promise.all(batchPromises)

        // Mapear todos los resultados
        batchResults.flat().forEach(result => {
          if (result && result.sku) {
            adicionalesInfo[result.sku] = result.info
          }
        })

        console.log(`[Tortas API] Info de ${Object.keys(adicionalesInfo).length} adicionales obtenida en ${batches.length} llamadas batch`)
      } catch (error) {
        console.error('[Tortas API] Error obteniendo info de adicionales:', error)
      }
    }

    // Paso 1: Obtener el ID de la categoría "tortas clasicas"
    const controller1 = new AbortController()
    const timeout1 = setTimeout(() => controller1.abort(), 20000) // Aumentado a 20s

    const categoriesResponse = await fetch(
      `${wooUrl}/wp-json/wc/v3/products/categories?search=tortas clasicas&per_page=50`,
      {
        headers,
        signal: controller1.signal,
        next: { revalidate: cacheTime } // Caché de Next.js
      }
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
    const timeout2 = setTimeout(() => controller2.abort(), 30000) // Aumentado a 30s

    // ⚡ SOLUCIÓN BALANCEADA: 25 productos (cubre las 22 tortas + margen)
    // Con batch queries y sin variaciones, carga rápida
    const productsResponse = await fetch(
      `${wooUrl}/wp-json/wc/v3/products?category=${tortasCategory.id}&per_page=25&status=publish&orderby=menu_order&order=asc`,
      {
        headers,
        signal: controller2.signal,
        next: { revalidate: cacheTime } // Caché de Next.js
      }
    )
    clearTimeout(timeout2)

    if (!productsResponse.ok) {
      return NextResponse.json(
        { error: 'No se pudieron obtener los productos' },
        { status: productsResponse.status }
      )
    }

    const products = await productsResponse.json()

    // ⚡ PASO 3 OPTIMIZADO: NO cargar variaciones en la carga inicial
    // Las variaciones se cargarán bajo demanda cuando el usuario haga clic en un producto
    // Esto reduce el tiempo de carga inicial de ~14s a ~2-3s

    // Procesar productos sin variaciones (lazy loading real)
    const productsWithVariations = products.map((product: any) => {
      // Extraer add-ons del meta_data
      const addOns = product.meta_data?.filter((meta: any) =>
        meta.key === '_product_addons'
      )?.[0]?.value || []

      // Solo incluir variaciones "mini" pre-configuradas (lazy loading para el resto)
      let variations: any[] = []

      // Agregar variante sintética para mini producto si existe
      const skuMini = MINI_PRODUCTOS_POR_PRODUCTO[product.id]
      if (skuMini) {
        const infoMini = adicionalesInfo[skuMini]
        if (infoMini) {
          // Agregar como primera variante (al inicio del array)
          variations.push({
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

      // Las variaciones de WooCommerce se cargarán bajo demanda (lazy loading)
      // cuando el usuario haga clic en un producto específico

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

      // Calcular precio mínimo y máximo basado en variaciones reales
      let precioMin = product.price ? parseFloat(product.price) : null
      let precioMax = product.price ? parseFloat(product.price) : null

      if (variations.length > 0) {
        const precios = variations.map(v => parseFloat(v.precio)).filter(p => !isNaN(p))
        if (precios.length > 0) {
          precioMin = Math.min(...precios)
          precioMax = Math.max(...precios)
        }
      }

      // Optimizar imágenes del catálogo usando tamaños más pequeños
      const imagenPrincipal = product.images?.[0]
      const imagenCatalogo = imagenPrincipal?.sizes?.shop_catalog ||
                            imagenPrincipal?.sizes?.medium ||
                            imagenPrincipal?.src || null

      return {
        id: product.id,
        nombre: product.name,
        slug: product.slug,
        tipo: product.type, // 'simple' o 'variable'
        descripcion: product.short_description?.replace(/<[^>]*>/g, '') || '',
        descripcionLarga: product.description?.replace(/<[^>]*>/g, '') || '',
        imagen: imagenCatalogo, // Imagen optimizada para catálogo
        imagenes: product.images?.map((img: any) => img.src) || [], // Imágenes completas para modal
        // Para productos simples
        precio: product.price,
        precioRegular: product.regular_price,
        precioOferta: product.sale_price,
        stock: product.stock_quantity,
        enStock: product.stock_status === 'instock',
        rendimiento: rendimientoProducto,
        // Variaciones cargadas desde WooCommerce
        variantes: variations,
        // Rango de precios calculado desde variaciones
        precioMin,
        precioMax,
        categorias: product.categories?.map((c: any) => c.name) || [],
        // Add-ons opcionales
        addOns: addOnsFormateados,
        // Campos de texto personalizados
        camposTexto: camposTexto,
      }
    })

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
