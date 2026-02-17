// src/app/api/woocommerce/upselling/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/upselling
 * Obtener productos de upselling de la categoría eventos/dulce
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

        // SKUs específicos para upselling
        const upsellingSkus = [
            '88',   // Alfajor de maicena
            '272',  // Box alfajor de nuez
            '97',   // Alfajor sablee
            '81',   // Mini Chocotorta
            '134',  // Mini Rogel
            '107',  // Mini Oreo
            '108',  // Mini Brownie
            '119',  // Mini Cheesecake
            '395',  // Mini Key Lime Pie
            '109',  // Mini Pavlova
        ]

        const upsellingProducts: any[] = []
        const skuStatus: any[] = []

        console.log('🔍 [Upselling] Iniciando búsqueda de productos...')

        // Buscar cada producto por SKU
        for (const sku of upsellingSkus) {
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 5000)

                console.log(`[Upselling] Buscando SKU ${sku}...`)
                const response = await fetch(
                    `${wooUrl}/wp-json/wc/v3/products?sku=${sku}&per_page=1`,
                    { headers, signal: controller.signal }
                )
                clearTimeout(timeout)

                if (response.ok) {
                    const products = await response.json()
                    if (products.length > 0) {
                        const product = products[0]
                        upsellingProducts.push({
                            id: product.id,
                            nombre: product.name,
                            descripcion: product.short_description?.replace(/<[^>]*>/g, '') || '',
                            imagen: product.images?.[0]?.src || null,
                            precio: product.price,
                            precioRegular: product.regular_price,
                            precioOferta: product.sale_price,
                            enStock: product.stock_status === 'instock',
                            tipo: product.type,
                            sku: product.sku,
                        })
                        skuStatus.push({ sku, status: '✅ FOUND', nombre: product.name, stock: product.stock_status })
                        console.log(`✅ [Upselling] SKU ${sku} encontrado: ${product.name} (${product.stock_status})`)
                    } else {
                        skuStatus.push({ sku, status: '❌ EMPTY_RESPONSE' })
                        console.log(`❌ [Upselling] SKU ${sku} NO encontrado (respuesta vacía)`)
                    }
                } else {
                    skuStatus.push({ sku, status: '❌ HTTP_ERROR', code: response.status })
                    console.log(`❌ [Upselling] SKU ${sku} Error HTTP: ${response.status} ${response.statusText}`)
                }
            } catch (error: any) {
                skuStatus.push({ sku, status: '❌ EXCEPTION', error: error.message })
                console.error(`❌ [Upselling] SKU ${sku} Excepción:`, error.message)
            }
        }

        console.log(`📊 [Upselling] Resumen: ${upsellingProducts.length}/${upsellingSkus.length} productos encontrados`)
        console.log(`📋 [Upselling] Detalle:`, JSON.stringify(skuStatus, null, 2))

        return NextResponse.json({
            success: true,
            products: upsellingProducts,
            debug: {
                totalBuscados: upsellingSkus.length,
                totalEncontrados: upsellingProducts.length,
                skuStatus,
            }
        })
    } catch (error) {
        console.error('[WooCommerce Upselling] Error:', error)
        return NextResponse.json(
            {
                error: 'Error al obtener productos de upselling',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
