// src/app/api/woocommerce/verificar-skus/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
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
        }

        // SKUs a verificar
        const skusVerificar = ['466', '862', '376', '467', '300', '399', '398', '31', '469', '254', '256', '255', '253', '84']

        const resultados = []

        for (const sku of skusVerificar) {
            try {
                const response = await fetch(
                    `${wooUrl}/wp-json/wc/v3/products?sku=${sku}&per_page=1`,
                    { headers }
                )

                if (response.ok) {
                    const productos = await response.json()
                    if (productos.length > 0) {
                        const prod = productos[0]
                        resultados.push({
                            sku: sku,
                            id: prod.id,
                            nombre: prod.name,
                            precio: prod.price,
                            precioRegular: prod.regular_price,
                            enStock: prod.stock_status === 'instock',
                            encontrado: true
                        })
                    } else {
                        resultados.push({
                            sku: sku,
                            encontrado: false,
                            mensaje: 'No encontrado en WooCommerce'
                        })
                    }
                } else {
                    resultados.push({
                        sku: sku,
                        encontrado: false,
                        error: `Status ${response.status}`
                    })
                }
            } catch (error) {
                resultados.push({
                    sku: sku,
                    encontrado: false,
                    error: error instanceof Error ? error.message : 'Error desconocido'
                })
            }
        }

        // Verificaciones específicas
        const verificaciones = {
            sku466Chocolate: resultados.find(r => r.sku === '466'),
            sku862Flores: resultados.find(r => r.sku === '862'),
            sku376Oreos: resultados.find(r => r.sku === '376')
        }

        const alertas = []

        // Alertas para SKU 466 (Chocolate)
        if (!verificaciones.sku466Chocolate?.encontrado) {
            alertas.push('⚠️ SKU 466 (Relleno de Chocolate) NO ENCONTRADO en WooCommerce')
        } else if (parseFloat(verificaciones.sku466Chocolate.precio || '0') !== 3600) {
            alertas.push(`⚠️ SKU 466 (Chocolate) tiene precio $${verificaciones.sku466Chocolate.precio} pero debería ser $3,600`)
        } else {
            alertas.push('✅ SKU 466 (Chocolate) correcto: $3,600')
        }

        // Alertas para SKU 862 (Flores)
        if (!verificaciones.sku862Flores?.encontrado) {
            alertas.push('⚠️ SKU 862 (Flores Astromelias) NO ENCONTRADO en WooCommerce')
        } else {
            alertas.push(`✅ SKU 862 (Flores Astromelias) encontrado: ${verificaciones.sku862Flores.nombre} - $${verificaciones.sku862Flores.precio}`)
        }

        // Alertas para SKU 376 (Oreos)
        if (!verificaciones.sku376Oreos?.encontrado) {
            alertas.push('⚠️ SKU 376 (Crema con oreos trituradas) NO ENCONTRADO en WooCommerce')
        } else {
            alertas.push(`✅ SKU 376 (Oreos) encontrado: ${verificaciones.sku376Oreos.nombre} - $${verificaciones.sku376Oreos.precio}`)
        }

        return NextResponse.json({
            success: true,
            alertas,
            verificaciones,
            todosLosResultados: resultados,
            resumen: {
                total: skusVerificar.length,
                encontrados: resultados.filter(r => r.encontrado).length,
                noEncontrados: resultados.filter(r => !r.encontrado).length
            }
        })

    } catch (error) {
        console.error('[Verificar SKUs] Error:', error)
        return NextResponse.json(
            {
                error: 'Error al verificar SKUs',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
