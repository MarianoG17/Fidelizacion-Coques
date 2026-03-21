// src/app/api/woocommerce/tortas/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Caché de ruta: Next.js almacena la respuesta completa en Data Cache compartido
// entre todas las instancias de Vercel (sobrevive cold starts)
export const revalidate = 7200 // 2 horas

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
 * Mapeo de productos sin SKU (solo con ID de WooCommerce)
 * Estos productos NO se sincronizan con Ayres IT, solo van a comentarios
 * Cuando se les asigne SKU, mover a configuración normal
 */
const PRODUCTOS_SIN_SKU: { [id: number]: { nombre: string; precio: number } } = {
  // Extras para rellenos
  852: { nombre: 'Rocklets', precio: 0 },
  853: { nombre: 'Merenguitos', precio: 0 },
  854: { nombre: 'Chips de chocolate', precio: 0 },
  855: { nombre: 'Nueces', precio: 0 },
  860: { nombre: 'Bizcochuelo Colores', precio: 2400 },
  // Tipo de cubierta
  9001: { nombre: 'Buttercream', precio: 0 },
  9002: { nombre: 'Ganache de chocolate negro', precio: 0 },
  9003: { nombre: 'Ganache de chocolate blanco', precio: 0 },
  // Rellenos base
  9101: { nombre: 'Dulce de leche', precio: 0 },
  9102: { nombre: 'Chocolate', precio: 3600 },
  9103: { nombre: 'Nutella', precio: 6200 },
  9104: { nombre: 'Oreos trituradas', precio: 2400 },
  // Bizcochuelos
  9201: { nombre: 'Bizcochuelo Vainilla', precio: 0 },
  9202: { nombre: 'Bizcochuelo Chocolate', precio: 0 },
  // Colores de bizcochuelo
  9211: { nombre: 'Verde', precio: 0 },
  9212: { nombre: 'Amarillo', precio: 0 },
  9213: { nombre: 'Naranja', precio: 0 },
  9214: { nombre: 'Rojo', precio: 0 },
  9215: { nombre: 'Celeste', precio: 0 },
  9216: { nombre: 'Violeta', precio: 0 },
  // Cookies
  9301: { nombre: 'Cookies Temáticas', precio: 0 },
  // Macarons
  9401: { nombre: 'Macarrón de Dulce de Leche', precio: 2800 },
  9402: { nombre: 'Macarrón Pistacho', precio: 2800 },
  9403: { nombre: 'Macarrón Limón', precio: 2800 },
  9404: { nombre: 'Macarrón Frambuesa', precio: 2800 },
  9405: { nombre: 'Macarrón Chocolate Blanco', precio: 2800 },
  9406: { nombre: 'Macarrón Chocolate Negro', precio: 2800 },
  // Flores
  9501: { nombre: 'Flores Astromelias', precio: 0 }
}

/**
 * Mapeo de adicionales agrupados por categorías
 * Para productos que requieren selección entre opciones agrupadas
 */
const ADICIONALES_AGRUPADOS: {
  [key: number]: {
    nombre: string;
    descripcion?: string;
    tipo: 'radio' | 'checkbox';
    requerido: boolean;
    opciones: { sku?: string; id?: number; soloComentario?: boolean }[]
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
  // NOTA: El ID de WooCommerce para SKU 20 debe ser verificado y actualizado aquí
  // Una vez verificado, descomentar y actualizar el ID real:
  // XXX: [ // Torta Temática Buttercream (SKU 20) - REEMPLAZAR XXX con ID real de WooCommerce
  //   { nombre: 'Color de Decoración', placeholder: 'Ej: Rosa pastel, Azul bebé, Multicolor...', requerido: true },
  //   { nombre: 'Temática', placeholder: 'Ej: Unicornio, Frozen, Fútbol, Princesas...', requerido: true },
  //   { nombre: 'Mensaje en la torta', placeholder: 'Ej: Feliz cumpleaños María', requerido: true },
  //   { nombre: 'URL foto referencia', placeholder: 'Pegar link de Google Drive, Dropbox, etc.', requerido: true }
  // ],
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

    // ⚡ PARALELIZAR: Steps 0, 1 y 2.5 son independientes entre sí
    // Step 0: batch SKUs adicionales | Step 1: categoría | Step 2.5: SKU 20
    const skusSimples = Object.values(ADICIONALES_POR_PRODUCTO)
      .flat()
      .map(a => a.sku)

    const skusAgrupados = Object.values(ADICIONALES_AGRUPADOS)
      .flat()
      .flatMap(grupo => grupo.opciones.map(opt => opt.sku))

    const skusMinis = Object.values(MINI_PRODUCTOS_POR_PRODUCTO)
    const adicionalesSkus = [...new Set([...skusSimples, ...skusAgrupados, ...skusMinis])]

    // Armar las promesas paralelas
    const fetchAdicionalesPromise = (async () => {
      const adicionalesInfo: { [sku: string]: { id: number; precio: number; nombre: string } } = {}
      if (adicionalesSkus.length === 0) return adicionalesInfo
      try {
        const batchSize = 10
        const batches = []
        for (let i = 0; i < adicionalesSkus.length; i += batchSize) {
          batches.push(adicionalesSkus.slice(i, i + batchSize))
        }
        const batchResults = await Promise.all(batches.map(async (skuBatch) => {
          try {
            const batchResponse = await fetch(
              `${wooUrl}/wp-json/wc/v3/products?sku=${encodeURIComponent(skuBatch.join(','))}&per_page=100`,
              { headers}
            )
            if (batchResponse.ok) {
              const prods = await batchResponse.json()
              return prods.map((prod: any) => ({ sku: prod.sku, info: { id: prod.id, precio: parseFloat(prod.price || '0'), nombre: prod.name } }))
            }
          } catch (e) { console.error('[Tortas API] Error batch SKUs:', e) }
          return []
        }))
        batchResults.flat().forEach(r => { if (r?.sku) adicionalesInfo[r.sku] = r.info })
        console.log(`[Tortas API] ${Object.keys(adicionalesInfo).length} adicionales en ${batches.length} llamadas`)
      } catch (e) { console.error('[Tortas API] Error adicionales:', e) }
      return adicionalesInfo
    })()

    const fetchCategoriaPromise = fetch(
      `${wooUrl}/wp-json/wc/v3/products/categories?search=tortas clasicas&per_page=50`,
      { headers}
    )

    const fetchSku20Promise = fetch(
      `${wooUrl}/wp-json/wc/v3/products?sku=20&per_page=1&status=publish`,
      { headers}
    )

    // Ejecutar los 3 en paralelo
    const [adicionalesInfo, categoriesResponse, sku20Response] = await Promise.all([
      fetchAdicionalesPromise,
      fetchCategoriaPromise,
      fetchSku20Promise,
    ])

    // Mapeo de ID -> {id, precio, nombre} para productos sin SKU
    const adicionalesInfoPorId: { [id: number]: { id: number; precio: number; nombre: string } } = {}

    if (!categoriesResponse.ok) {
      return NextResponse.json(
        { error: 'No se pudo obtener las categorías' },
        { status: categoriesResponse.status }
      )
    }

    const categories = await categoriesResponse.json()
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

    // Paso 2: Obtener productos de esa categoría (depende del resultado de categoría)
    const productsResponse = await fetch(
      `${wooUrl}/wp-json/wc/v3/products?category=${tortasCategory.id}&per_page=25&status=publish&orderby=menu_order&order=asc`,
      { headers}
    )

    if (!productsResponse.ok) {
      return NextResponse.json(
        { error: 'No se pudieron obtener los productos' },
        { status: productsResponse.status }
      )
    }

    let products = await productsResponse.json()

    // Paso 2.5 ya fue ejecutado en paralelo: procesar resultado de SKU 20
    try {
      if (sku20Response.ok) {
        const sku20Products = await sku20Response.json()
        if (sku20Products.length > 0) {
          const tortaTematica = sku20Products[0]
          const yaExiste = products.some((p: any) => p.id === tortaTematica.id)
          if (!yaExiste) {
            products.push(tortaTematica)
            console.log('[Tortas API] Agregado SKU 20 (Torta Temática Buttercream) manualmente')

            // Agregar configuración dinámica de campos personalizados para SKU 20
            CAMPOS_TEXTO_POR_PRODUCTO[tortaTematica.id] = [
              { nombre: 'Color de la cubierta', placeholder: 'Solo si elegís Buttercream: Ej: Rosa pastel, Azul bebé, Multicolor...', requerido: true },
              { nombre: 'Nombre del cumpleañero', placeholder: 'Ej: María', requerido: false },
              { nombre: 'Años que cumple', placeholder: 'Ej: 5', requerido: false },
              { nombre: 'Temática', placeholder: 'Ej: Unicornio, Frozen, Fútbol, Princesas...', requerido: true },
              { nombre: 'Mensaje en la torta', placeholder: 'Ej: Feliz cumpleaños María', requerido: true },
              { nombre: 'Tamaño de letra', placeholder: 'Ej: Grande, Mediana, Pequeña', requerido: false },
              { nombre: 'Color de letra', placeholder: 'Ej: Dorado, Negro, Rosa, Multicolor...', requerido: false },
              { nombre: 'Estilo de letra', placeholder: 'Ej: Cursiva, Imprenta, Manuscrita...', requerido: false },
              { nombre: 'URL Imagen Referencia', placeholder: 'Pegar link de Google Drive, Dropbox, etc.', requerido: true },
              { nombre: 'Referencia de la imagen', placeholder: 'Ej: Colores de decoración, Texto del diseño, Estilo general...', requerido: true },
              { nombre: 'Cantidad de Cookies Temáticas', placeholder: 'Solo si elegiste Cookies Temáticas', requerido: false },
              { nombre: 'Descripción Cookies Temáticas', placeholder: 'Solo si elegiste Cookies: Describí qué querés que sean (ej: Unicornios, Estrellas, etc.)', requerido: false },
              { nombre: 'URL Imagen Referencia Cookies', placeholder: 'Solo si elegiste Cookies: Link de imagen de referencia', requerido: false }
            ]

            // Agregar configuración dinámica de add-ons para SKU 20
            ADICIONALES_AGRUPADOS[tortaTematica.id] = [
              {
                nombre: 'Tipo de cubierta',
                tipo: 'radio',
                requerido: true,
                descripcion: 'Seleccioná el tipo de cubierta para tu torta',
                opciones: [
                  { id: 9001, soloComentario: true },  // Buttercream
                  { id: 9002, soloComentario: true },  // Ganache Negro
                  { id: 9003, soloComentario: true }   // Ganache Blanco
                ]
              },
              {
                nombre: 'Relleno Base Capa 1',
                tipo: 'radio',
                requerido: true,
                descripcion: 'Elegí el relleno principal para la primera capa',
                opciones: [
                  { id: 9101, soloComentario: true },  // Dulce de leche
                  { id: 9102, soloComentario: true },  // Chocolate
                  { id: 9103, soloComentario: true }   // Nutella
                ]
              },
              {
                nombre: 'Extra Capa 1 (opcional)',
                tipo: 'checkbox',
                requerido: false,
                descripcion: 'Agregá un extra al relleno (algunos tienen costo adicional)',
                opciones: [
                  { id: 9104, soloComentario: true },  // Oreos trituradas
                  { id: 852, soloComentario: true },   // Rocklets
                  { id: 853, soloComentario: true },   // Merenguitos
                  { id: 854, soloComentario: true },   // Chips de chocolate
                  { id: 855, soloComentario: true }    // Nueces
                ]
              },
              {
                nombre: 'Relleno Base Capa 2',
                tipo: 'radio',
                requerido: true,
                descripcion: 'Elegí el relleno principal para la segunda capa',
                opciones: [
                  { id: 9101, soloComentario: true },  // Dulce de leche
                  { id: 9102, soloComentario: true },  // Chocolate
                  { id: 9103, soloComentario: true }   // Nutella
                ]
              },
              {
                nombre: 'Extra Capa 2 (opcional)',
                tipo: 'checkbox',
                requerido: false,
                descripcion: 'Agregá un extra al relleno (algunos tienen costo adicional)',
                opciones: [
                  { id: 9104, soloComentario: true },  // Oreos trituradas
                  { id: 852, soloComentario: true },   // Rocklets
                  { id: 853, soloComentario: true },   // Merenguitos
                  { id: 854, soloComentario: true },   // Chips de chocolate
                  { id: 855, soloComentario: true }    // Nueces
                ]
              },
              {
                nombre: 'Relleno Base Capa 3',
                tipo: 'radio',
                requerido: true,
                descripcion: 'Elegí el relleno principal para la tercera capa',
                opciones: [
                  { id: 9101, soloComentario: true },  // Dulce de leche
                  { id: 9102, soloComentario: true },  // Chocolate
                  { id: 9103, soloComentario: true }   // Nutella
                ]
              },
              {
                nombre: 'Extra Capa 3 (opcional)',
                tipo: 'checkbox',
                requerido: false,
                descripcion: 'Agregá un extra al relleno (algunos tienen costo adicional)',
                opciones: [
                  { id: 9104, soloComentario: true },  // Oreos trituradas
                  { id: 852, soloComentario: true },   // Rocklets
                  { id: 853, soloComentario: true },   // Merenguitos
                  { id: 854, soloComentario: true },   // Chips de chocolate
                  { id: 855, soloComentario: true }    // Nueces
                ]
              },
              {
                nombre: 'Bizcochuelo',
                tipo: 'radio',
                requerido: true,
                opciones: [
                  { id: 9201, soloComentario: true },  // Vainilla
                  { id: 9202, soloComentario: true },  // Chocolate
                  { id: 860, soloComentario: true }    // Colores
                ]
              },
              {
                nombre: 'Colores del Bizcochuelo (solo si elegiste Bizcochuelo Colores - máximo 4)',
                tipo: 'checkbox',
                requerido: false,
                descripcion: 'Elegí hasta 4 colores para el bizcochuelo',
                opciones: [
                  { id: 9211, soloComentario: true },  // Verde
                  { id: 9212, soloComentario: true },  // Amarillo
                  { id: 9213, soloComentario: true },  // Naranja
                  { id: 9214, soloComentario: true },  // Rojo
                  { id: 9215, soloComentario: true },  // Celeste
                  { id: 9216, soloComentario: true }   // Violeta
                ]
              },
              {
                nombre: 'Cookies Temáticas (especificar cantidad en notas)',
                tipo: 'checkbox',
                requerido: false,
                opciones: [
                  { id: 9301, soloComentario: true }   // Cookies Temáticas
                ]
              },
              {
                nombre: 'Macarons (especificar cantidad y colores en notas)',
                tipo: 'checkbox',
                requerido: false,
                opciones: [
                  { id: 9401, soloComentario: true },  // Macaron Chocolate
                  { id: 9402, soloComentario: true },  // Macaron Frutos Rojos
                  { id: 9403, soloComentario: true },  // Macaron Dulce de Leche
                  { id: 9404, soloComentario: true },  // Macaron Limón
                  { id: 9405, soloComentario: true },  // Macaron Vainilla
                  { id: 9406, soloComentario: true }   // Macaron Frutilla
                ]
              },
              {
                nombre: 'Flores Astromelias',
                tipo: 'checkbox',
                requerido: false,
                opciones: [
                  { id: 9501, soloComentario: true }   // Flores Astromelias
                ]
              }
            ]

            console.log(`[Tortas API] Configuración de campos y add-ons agregada para SKU 20 (ID: ${tortaTematica.id})`)
          }
        }
      }
    } catch (error) {
      console.error('[Tortas API] Error agregando SKU 20:', error)
    }

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
              // Soportar tanto SKU como ID de WooCommerce
              if (opt.sku) {
                const info = adicionalesInfo[opt.sku]
                if (info) {
                  return {
                    etiqueta: info.nombre,
                    precio: info.precio,
                    precioTipo: 'flat_fee' as const,
                    wooId: info.id,
                    sku: opt.sku,
                    soloComentario: false
                  }
                }
              } else if (opt.id) {
                // Productos sin SKU: usar nombres hardcodeados
                const productoSinSku = PRODUCTOS_SIN_SKU[opt.id]
                if (productoSinSku) {
                  return {
                    etiqueta: productoSinSku.nombre,
                    precio: productoSinSku.precio,
                    precioTipo: 'flat_fee' as const,
                    wooId: opt.id,
                    sku: undefined,
                    soloComentario: opt.soloComentario || false
                  }
                }
                // Si no está en el mapeo, placeholder
                console.warn(`[Tortas API] ✗ Producto ID ${opt.id} no está en PRODUCTOS_SIN_SKU`)
                return {
                  etiqueta: `Producto ID ${opt.id}`,
                  precio: 0,
                  precioTipo: 'flat_fee' as const,
                  wooId: opt.id,
                  sku: undefined,
                  soloComentario: false
                }
              }
              return null
            })
            .filter(opt => opt !== null) as any[]

          if (opcionesFormateadas.length > 0) {
            addOnsFormateados.push({
              nombre: grupo.nombre,
              descripcion: grupo.descripcion || '',
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
