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

        // Buscar cada producto por SKU
        for (const sku of upsellingSkus) {
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 5000)

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
                    }
                }
            } catch (error) {
                console.error(`[Upselling] Error buscando SKU ${sku}:`, error)
                // Continuar con el siguiente SKU
            }
        }

        return NextResponse.json({
            success: true,
            products: upsellingProducts,
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
