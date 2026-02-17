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

        // Paso 1: Buscar la categoría "eventos" o "dulce"
        const controller1 = new AbortController()
        const timeout1 = setTimeout(() => controller1.abort(), 10000)

        const categoriesResponse = await fetch(
            `${wooUrl}/wp-json/wc/v3/products/categories?per_page=100`,
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

        // Buscar categoría que contenga "eventos" o "dulce"
        const upsellingCategory = categories.find((cat: any) =>
            cat.slug.includes('eventos') ||
            cat.slug.includes('dulce') ||
            cat.name.toLowerCase().includes('eventos') ||
            cat.name.toLowerCase().includes('dulce')
        )

        if (!upsellingCategory) {
            return NextResponse.json({
                success: true,
                message: 'No se encontró la categoría de upselling',
                products: [],
            })
        }

        // Paso 2: Obtener productos de esa categoría
        const controller2 = new AbortController()
        const timeout2 = setTimeout(() => controller2.abort(), 15000)

        const productsResponse = await fetch(
            `${wooUrl}/wp-json/wc/v3/products?category=${upsellingCategory.id}&per_page=10&status=publish&orderby=popularity`,
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

        // Formatear todos los productos para upselling
        const upsellingProducts = products.map((product: any) => ({
            id: product.id,
            nombre: product.name,
            descripcion: product.short_description?.replace(/<[^>]*>/g, '') || '',
            imagen: product.images?.[0]?.src || null,
            precio: product.price,
            precioRegular: product.regular_price,
            precioOferta: product.sale_price,
            enStock: product.stock_status === 'instock',
            tipo: product.type,
        }))

        return NextResponse.json({
            success: true,
            categoria: {
                id: upsellingCategory.id,
                nombre: upsellingCategory.name,
                slug: upsellingCategory.slug,
            },
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
