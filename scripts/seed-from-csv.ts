/**
 * Script: seed-from-csv.ts
 * Lee el CSV exportado de WooCommerce, construye el JSON del catálogo
 * con todas las personalizaciones, y lo guarda en Neon DB.
 *
 * Ejecutar con:
 *   cd fidelizacion-zona
 *   tsx scripts/seed-from-csv.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// ── Cargar variables de entorno desde .env.local ──────────────────────────────
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} else {
  console.error('No se encontró .env.local en', envPath)
  process.exit(1)
}

const prisma = new PrismaClient()

// ── Ruta al CSV ──────────────────────────────────────────────────────────────
const CSV_PATH = path.join(
  'C:\\Users\\Mariano\\Downloads',
  'wc-product-export-27-3-2026-1774639980940.csv'
)

// ── Constantes copiadas de route.ts ──────────────────────────────────────────
const MINI_PRODUCTOS_POR_PRODUCTO: { [key: number]: string } = {
  338: '81',
  343: '134',
  764: '107',
  404: '108',
  359: '119',
  327: '395',
  267: '109',
}

const ADICIONALES_POR_PRODUCTO: { [key: number]: { sku: string; nombre: string }[] } = {
  333: [{ sku: '257', nombre: 'Cubierta de Dulce de Leche' }],
  338: [{ sku: '260', nombre: 'Adicional Chocotorta' }],
  325: [{ sku: '260', nombre: 'Adicional' }],
  388: [{ sku: '260', nombre: 'Adicional' }],
  343: [{ sku: '260', nombre: 'Adicional' }],
}

const PRODUCTOS_SIN_SKU: { [id: number]: { nombre: string; precio: number } } = {
  852: { nombre: 'Rocklets', precio: 0 },
  853: { nombre: 'Merenguitos', precio: 0 },
  854: { nombre: 'Chips de chocolate', precio: 0 },
  855: { nombre: 'Nueces', precio: 0 },
  860: { nombre: 'Bizcochuelo Colores', precio: 2400 },
  9001: { nombre: 'Buttercream', precio: 0 },
  9002: { nombre: 'Ganache de chocolate negro', precio: 0 },
  9003: { nombre: 'Ganache de chocolate blanco', precio: 0 },
  9101: { nombre: 'Dulce de leche', precio: 0 },
  9102: { nombre: 'Chocolate', precio: 3600 },
  9103: { nombre: 'Nutella', precio: 6200 },
  9104: { nombre: 'Oreos trituradas', precio: 2400 },
  9201: { nombre: 'Bizcochuelo Vainilla', precio: 0 },
  9202: { nombre: 'Bizcochuelo Chocolate', precio: 0 },
  9211: { nombre: 'Verde', precio: 0 },
  9212: { nombre: 'Amarillo', precio: 0 },
  9213: { nombre: 'Naranja', precio: 0 },
  9214: { nombre: 'Rojo', precio: 0 },
  9215: { nombre: 'Celeste', precio: 0 },
  9216: { nombre: 'Violeta', precio: 0 },
  9301: { nombre: 'Cookies Temáticas', precio: 0 },
  9401: { nombre: 'Macarrón de Dulce de Leche', precio: 2800 },
  9402: { nombre: 'Macarrón Pistacho', precio: 2800 },
  9403: { nombre: 'Macarrón Limón', precio: 2800 },
  9404: { nombre: 'Macarrón Frambuesa', precio: 2800 },
  9405: { nombre: 'Macarrón Chocolate Blanco', precio: 2800 },
  9406: { nombre: 'Macarrón Chocolate Negro', precio: 2800 },
  9501: { nombre: 'Flores Astromelias', precio: 0 },
}

const ADICIONALES_AGRUPADOS: {
  [key: number]: {
    nombre: string
    descripcion?: string
    tipo: 'radio' | 'checkbox'
    requerido: boolean
    opciones: { sku?: string; id?: number; soloComentario?: boolean }[]
  }[]
} = {
  325: [
    {
      nombre: 'Relleno',
      tipo: 'radio',
      requerido: true,
      opciones: [{ sku: '467' }, { sku: '466' }, { sku: '300' }],
    },
    {
      nombre: 'Bizcochuelo',
      tipo: 'radio',
      requerido: true,
      opciones: [{ sku: '461' }, { sku: '398' }, { sku: '399' }],
    },
    {
      nombre: 'Cubierta',
      tipo: 'radio',
      requerido: true,
      opciones: [{ sku: '465' }, { sku: '464' }],
    },
  ],
}

const CAMPOS_TEXTO_POR_PRODUCTO: {
  [key: number]: { nombre: string; placeholder: string; requerido: boolean }[]
} = {
  764: [{ nombre: 'Color de decoración', placeholder: 'Ej: Rosa, Celeste, Multicolor...', requerido: false }],
}

// ── Parser CSV ───────────────────────────────────────────────────────────────
function parseCSV(content: string): string[][] {
  // Quitar BOM si está presente
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1)

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const next = content[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\n') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
      } else if (ch === '\r') {
        // ignorar
      } else {
        field += ch
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// ── Extraer rendimiento de descripción ───────────────────────────────────────
function extraerRendimiento(descripcion: string): string | null {
  if (!descripcion) return null
  const texto = descripcion.replace(/<[^>]*>/g, ' ')
  const patrones = [
    /rendimiento[:\s]+(\d+\s*a\s*\d+|\d+)\s*(porciones?|personas?|invitados?)\s*(\w+)?/i,
    /para\s+(\d+\s*a\s*\d+|\d+)\s*(porciones?|personas?|invitados?)\s*(\w+)?/i,
    /alcanza\s+para\s+(\d+\s*a\s*\d+|\d+)\s*(porciones?|personas?|invitados?)\s*(\w+)?/i,
  ]
  for (const pat of patrones) {
    const m = texto.match(pat)
    if (m?.[1]) {
      const cantidad = m[1].trim()
      const unidad = m[2] || 'porciones'
      const tipo = m[3] ? ` ${m[3]}` : ''
      return `${cantidad} ${unidad}${tipo}`
    }
  }
  return null
}

// ── Construcción de addOns para SKU 20 ───────────────────────────────────────
function buildSku20Config(productId: number) {
  CAMPOS_TEXTO_POR_PRODUCTO[productId] = [
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
    { nombre: 'Descripción Cookies Temáticas', placeholder: 'Solo si elegiste Cookies: Describí qué querés que sean', requerido: false },
    { nombre: 'URL Imagen Referencia Cookies', placeholder: 'Solo si elegiste Cookies: Link de imagen de referencia', requerido: false },
  ]

  ADICIONALES_AGRUPADOS[productId] = [
    { nombre: 'Tipo de cubierta', tipo: 'radio', requerido: true, descripcion: 'Seleccioná el tipo de cubierta para tu torta',
      opciones: [{ id: 9001, soloComentario: true }, { id: 9002, soloComentario: true }, { id: 9003, soloComentario: true }] },
    { nombre: 'Relleno Base Capa 1', tipo: 'radio', requerido: true, descripcion: 'Elegí el relleno principal para la primera capa',
      opciones: [{ id: 9101, soloComentario: true }, { id: 9102, soloComentario: true }, { id: 9103, soloComentario: true }] },
    { nombre: 'Extra Capa 1 (opcional)', tipo: 'checkbox', requerido: false, descripcion: 'Agregá un extra al relleno',
      opciones: [{ id: 9104, soloComentario: true }, { id: 852, soloComentario: true }, { id: 853, soloComentario: true }, { id: 854, soloComentario: true }, { id: 855, soloComentario: true }] },
    { nombre: 'Relleno Base Capa 2', tipo: 'radio', requerido: true, descripcion: 'Elegí el relleno principal para la segunda capa',
      opciones: [{ id: 9101, soloComentario: true }, { id: 9102, soloComentario: true }, { id: 9103, soloComentario: true }] },
    { nombre: 'Extra Capa 2 (opcional)', tipo: 'checkbox', requerido: false, descripcion: 'Agregá un extra al relleno',
      opciones: [{ id: 9104, soloComentario: true }, { id: 852, soloComentario: true }, { id: 853, soloComentario: true }, { id: 854, soloComentario: true }, { id: 855, soloComentario: true }] },
    { nombre: 'Relleno Base Capa 3', tipo: 'radio', requerido: true, descripcion: 'Elegí el relleno principal para la tercera capa',
      opciones: [{ id: 9101, soloComentario: true }, { id: 9102, soloComentario: true }, { id: 9103, soloComentario: true }] },
    { nombre: 'Extra Capa 3 (opcional)', tipo: 'checkbox', requerido: false, descripcion: 'Agregá un extra al relleno',
      opciones: [{ id: 9104, soloComentario: true }, { id: 852, soloComentario: true }, { id: 853, soloComentario: true }, { id: 854, soloComentario: true }, { id: 855, soloComentario: true }] },
    { nombre: 'Bizcochuelo', tipo: 'radio', requerido: true,
      opciones: [{ id: 9201, soloComentario: true }, { id: 9202, soloComentario: true }, { id: 860, soloComentario: true }] },
    { nombre: 'Colores del Bizcochuelo (solo si elegiste Bizcochuelo Colores - máximo 4)', tipo: 'checkbox', requerido: false, descripcion: 'Elegí hasta 4 colores para el bizcochuelo',
      opciones: [{ id: 9211, soloComentario: true }, { id: 9212, soloComentario: true }, { id: 9213, soloComentario: true }, { id: 9214, soloComentario: true }, { id: 9215, soloComentario: true }, { id: 9216, soloComentario: true }] },
    { nombre: 'Cookies Temáticas (especificar cantidad en notas)', tipo: 'checkbox', requerido: false,
      opciones: [{ id: 9301, soloComentario: true }] },
    { nombre: 'Macarons (especificar cantidad y colores en notas)', tipo: 'checkbox', requerido: false,
      opciones: [{ id: 9401, soloComentario: true }, { id: 9402, soloComentario: true }, { id: 9403, soloComentario: true }, { id: 9404, soloComentario: true }, { id: 9405, soloComentario: true }, { id: 9406, soloComentario: true }] },
    { nombre: 'Flores Astromelias', tipo: 'checkbox', requerido: false,
      opciones: [{ id: 9501, soloComentario: true }] },
  ]
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📂 Leyendo CSV:', CSV_PATH)
  const content = fs.readFileSync(CSV_PATH, 'utf8')
  const rows = parseCSV(content)
  const headers = rows[0]
  console.log(`✅ ${rows.length - 1} filas encontradas`)

  // Índices de columnas relevantes
  const COL: Record<string, number> = {}
  headers.forEach((h, i) => { COL[h.trim()] = i })

  const ID          = COL['ID']
  const TIPO        = COL['Tipo']
  const SKU         = COL['SKU']
  const NOMBRE      = COL['Nombre']
  const PUBLICADO   = COL['Publicado']
  const VISIBLE     = COL['Visibilidad en el catálogo']
  const DESC_CORTA  = COL['Descripción corta']
  const DESC        = COL['Descripción']
  const PRECIO_OFF  = COL['Precio rebajado']
  const PRECIO_REG  = COL['Precio normal']
  const CATEGORIAS  = COL['Categorías']
  const IMAGENES    = COL['Imágenes']
  const SUPERIOR    = COL['Superior']
  const POSICION    = COL['Posición']
  const ATTR1_NOMBRE = COL['Nombre del atributo 1']
  const ATTR1_VALOR  = COL['Valor(es) del atributo 1']

  // ── Mapas de productos y variaciones por ID ─────────────────────────────
  const allProducts: Record<number, Record<string, string>> = {}
  const variationsByParent: Record<number, Record<string, string>[]> = {}

  for (const row of rows.slice(1)) {
    if (row.length < 5) continue
    const id = parseInt(row[ID])
    if (isNaN(id)) continue
    const tipo = row[TIPO]
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h.trim()] = row[i] || '' })

    if (tipo === 'variation') {
      // Extraer ID del padre (formato "id:XXX")
      const supStr = row[SUPERIOR] || ''
      const match = supStr.match(/id:(\d+)/)
      if (match) {
        const parentId = parseInt(match[1])
        if (!variationsByParent[parentId]) variationsByParent[parentId] = []
        variationsByParent[parentId].push(obj)
      }
    } else {
      allProducts[id] = obj
    }
  }

  // ── Mapa de SKU → { id, precio, nombre } para adicionales ───────────────
  const adicionalesInfo: Record<string, { id: number; precio: number; nombre: string }> = {}
  for (const [id, prod] of Object.entries(allProducts)) {
    const sku = prod['SKU']
    if (sku && sku.trim()) {
      const precio = parseFloat(prod['Precio normal'] || '0') || 0
      adicionalesInfo[sku.trim()] = {
        id: parseInt(id),
        precio,
        nombre: prod['Nombre'] || '',
      }
    }
  }

  // ── Identificar productos de "Tortas Clásicas" ──────────────────────────
  const tortasClasicas = Object.entries(allProducts)
    .filter(([, p]) => {
      const cats = p['Categorías'] || ''
      return cats.toLowerCase().includes('tortas cl') || cats.toLowerCase().includes('tortas clasicas')
    })
    .sort(([, a], [, b]) => {
      const posA = parseInt(a['Posición'] || '9999')
      const posB = parseInt(b['Posición'] || '9999')
      return posA - posB
    })
    .map(([id, p]) => ({ id: parseInt(id), ...p }))

  // Agregar SKU 20 (Torta Temática) si no está en la categoría
  const sku20Entry = Object.entries(allProducts).find(([, p]) => p['SKU']?.trim() === '20')
  if (sku20Entry) {
    const sku20Id = parseInt(sku20Entry[0])
    if (!tortasClasicas.find(p => p.id === sku20Id)) {
      tortasClasicas.push({ id: sku20Id, ...sku20Entry[1] })
      buildSku20Config(sku20Id)
      console.log(`➕ SKU 20 (Torta Temática, ID ${sku20Id}) agregado`)
    }
  }

  console.log(`🎂 ${tortasClasicas.length} productos de Tortas Clásicas encontrados`)

  // ── Transformar productos al formato esperado ────────────────────────────
  const products = tortasClasicas.map(product => {
    const productId = product.id
    const productType = product['Tipo'] === 'simple' ? 'simple' : 'variable'

    // Variaciones
    const wooVariations = variationsByParent[productId] || []
    let variations: any[] = []

    // Variante mini si existe
    const skuMini = MINI_PRODUCTOS_POR_PRODUCTO[productId]
    if (skuMini && adicionalesInfo[skuMini]) {
      const infoMini = adicionalesInfo[skuMini]
      variations.push({
        id: infoMini.id,
        sku: skuMini,
        precio: infoMini.precio.toString(),
        precioRegular: infoMini.precio.toString(),
        precioOferta: '',
        enStock: true,
        stock: null,
        atributos: [{ nombre: 'Tamaño', valor: 'Mini' }],
        nombreVariante: 'Mini',
        imagen: (product['Imágenes'] || '').split(',')[0].trim() || null,
        rendimiento: null,
      })
    }

    // Variaciones de WooCommerce (del CSV)
    for (const v of wooVariations) {
      const precio = parseFloat(v['Precio normal'] || '0') || 0
      const precioOferta = parseFloat(v['Precio rebajado'] || '0') || 0
      const attrValor = v['Valor(es) del atributo 1'] || ''
      const attrNombre = v['Nombre del atributo 1'] || 'Tamaño'
      const descVariacion = v['Descripción'] || v['Descripción corta'] || ''
      variations.push({
        id: parseInt(v['ID']),
        sku: v['SKU'] || '',
        precio: precio.toString(),
        precioRegular: precio.toString(),
        precioOferta: precioOferta > 0 ? precioOferta.toString() : '',
        enStock: true,
        stock: null,
        atributos: [{ nombre: attrNombre, valor: attrValor }],
        nombreVariante: attrValor,
        imagen: (v['Imágenes'] || '').trim() || (product['Imágenes'] || '').split(',')[0].trim() || null,
        rendimiento: extraerRendimiento(descVariacion),
      })
    }

    // Ordenar variaciones por posición
    variations.sort((a, b) => {
      const pa = wooVariations.find((v: Record<string, string>) => parseInt(v['ID']) === a.id)?.[POSICION] || '0'
      const pb = wooVariations.find((v: Record<string, string>) => parseInt(v['ID']) === b.id)?.[POSICION] || '0'
      return parseInt(pa) - parseInt(pb)
    })

    // AddOns
    const addOnsFormateados: any[] = []

    // Adicionales manuales
    const adicionalesManuales = ADICIONALES_POR_PRODUCTO[productId]
    if (adicionalesManuales) {
      for (const adicional of adicionalesManuales) {
        const info = adicionalesInfo[adicional.sku]
        if (info) {
          addOnsFormateados.push({
            nombre: info.nombre,
            descripcion: '',
            tipo: 'checkbox',
            requerido: false,
            opciones: [{ etiqueta: info.nombre, precio: info.precio, precioTipo: 'flat_fee', wooId: info.id, sku: adicional.sku }],
          })
        }
      }
    }

    // Adicionales agrupados
    const adicionalesAgrupados = ADICIONALES_AGRUPADOS[productId]
    if (adicionalesAgrupados) {
      for (const grupo of adicionalesAgrupados) {
        const opcionesFormateadas = grupo.opciones
          .map(opt => {
            if (opt.sku) {
              const info = adicionalesInfo[opt.sku]
              if (info) {
                return { etiqueta: info.nombre, precio: info.precio, precioTipo: 'flat_fee' as const, wooId: info.id, sku: opt.sku, soloComentario: false }
              }
            } else if (opt.id) {
              const p = PRODUCTOS_SIN_SKU[opt.id]
              if (p) {
                return { etiqueta: p.nombre, precio: p.precio, precioTipo: 'flat_fee' as const, wooId: opt.id, sku: undefined, soloComentario: opt.soloComentario || false }
              }
            }
            return null
          })
          .filter(o => o !== null)

        if (opcionesFormateadas.length > 0) {
          addOnsFormateados.push({
            nombre: grupo.nombre,
            descripcion: grupo.descripcion || '',
            tipo: grupo.tipo,
            requerido: grupo.requerido,
            opciones: opcionesFormateadas,
          })
        }
      }
    }

    const camposTexto = CAMPOS_TEXTO_POR_PRODUCTO[productId] || []

    // Precios
    const precioBase = parseFloat(product['Precio normal'] || '0') || 0
    const precioOfertaBase = parseFloat(product['Precio rebajado'] || '0') || 0
    let precioMin: number | null = precioBase || null
    let precioMax: number | null = precioBase || null
    if (variations.length > 0) {
      const precios = variations.map((v: any) => parseFloat(v.precio)).filter((p: number) => !isNaN(p) && p > 0)
      if (precios.length > 0) {
        precioMin = Math.min(...precios)
        precioMax = Math.max(...precios)
      }
    }

    // Imágenes
    const imagenesArr = (product['Imágenes'] || '').split(',').map((s: string) => s.trim()).filter(Boolean)
    const imagenPrincipal = imagenesArr[0] || null

    // Descripción
    const descCorta = (product['Descripción corta'] || '').replace(/<[^>]*>/g, '').trim()
    const descLarga = (product['Descripción'] || '').replace(/<[^>]*>/g, '').trim()
    const rendimiento = extraerRendimiento(descCorta) || extraerRendimiento(descLarga)

    return {
      id: productId,
      nombre: product['Nombre'] || '',
      slug: (product['Nombre'] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      tipo: productType,
      descripcion: descCorta,
      descripcionLarga: descLarga,
      imagen: imagenPrincipal,
      imagenes: imagenesArr,
      precio: precioBase > 0 ? precioBase.toString() : '',
      precioRegular: precioBase > 0 ? precioBase.toString() : '',
      precioOferta: precioOfertaBase > 0 ? precioOfertaBase.toString() : null,
      stock: null,
      enStock: true,
      rendimiento,
      variantes: variations,
      precioMin,
      precioMax,
      categorias: ['Tortas Clásicas'],
      addOns: addOnsFormateados,
      camposTexto,
    }
  })

  // ── Construir response igual que la API ──────────────────────────────────
  const responseData = {
    success: true,
    categoria: { id: 18, nombre: 'Tortas Clasicas', slug: 'tortas-clasicas' },
    count: products.length,
    products,
  }

  console.log(`\n📦 ${products.length} productos procesados:`)
  for (const p of products) {
    console.log(`  - [${p.id}] ${p.nombre} | variantes: ${p.variantes.length} | addOns: ${p.addOns.length}`)
  }

  // ── Guardar en Neon ──────────────────────────────────────────────────────
  console.log('\n💾 Guardando en Neon DB...')
  await prisma.catalogoCache.upsert({
    where: { id: 'tortas' },
    create: { id: 'tortas', data: responseData as any },
    update: { data: responseData as any },
  })

  console.log('✅ Catálogo guardado en Neon correctamente')
  console.log(`   ${products.length} productos | ${new Date().toISOString()}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('❌ Error:', err)
  prisma.$disconnect()
  process.exit(1)
})
