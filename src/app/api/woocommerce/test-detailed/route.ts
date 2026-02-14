// src/app/api/woocommerce/test-detailed/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/test-detailed
 * Diagnóstico MÁS detallado con múltiples endpoints de prueba
 */
export async function GET(req: NextRequest) {
  try {
    const wooUrl = process.env.WOOCOMMERCE_URL
    const wooKey = process.env.WOOCOMMERCE_KEY
    const wooSecret = process.env.WOOCOMMERCE_SECRET

    if (!wooUrl || !wooKey || !wooSecret) {
      return NextResponse.json(
        { error: 'Credenciales no configuradas' },
        { status: 500 }
      )
    }

    const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')
    
    const resultados = []

    // Test 1: System Status (endpoint simple)
    try {
      const url1 = `${wooUrl}/wp-json/wc/v3/system_status`
      const controller1 = new AbortController()
      const timeout1 = setTimeout(() => controller1.abort(), 10000)

      const res1 = await fetch(url1, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FidelizacionApp/1.0',
        },
        signal: controller1.signal,
      })

      clearTimeout(timeout1)

      const cloudflareRayId = res1.headers.get('cf-ray')
      const cloudflareCache = res1.headers.get('cf-cache-status')
      const server = res1.headers.get('server')

      resultados.push({
        test: 'System Status',
        url: url1,
        status: res1.status,
        statusText: res1.statusText,
        exitoso: res1.ok,
        cloudflare: {
          rayId: cloudflareRayId,
          cacheStatus: cloudflareCache,
          server: server,
        },
        errorBody: !res1.ok ? await res1.text() : null,
      })
    } catch (error: any) {
      resultados.push({
        test: 'System Status',
        url: `${wooUrl}/wp-json/wc/v3/system_status`,
        error: error.message,
        tipo: error.name,
      })
    }

    // Test 2: Products (endpoint que estábamos usando)
    try {
      const url2 = `${wooUrl}/wp-json/wc/v3/products?per_page=1`
      const controller2 = new AbortController()
      const timeout2 = setTimeout(() => controller2.abort(), 10000)

      const res2 = await fetch(url2, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FidelizacionApp/1.0',
        },
        signal: controller2.signal,
      })

      clearTimeout(timeout2)

      const cloudflareRayId = res2.headers.get('cf-ray')
      const cloudflareCache = res2.headers.get('cf-cache-status')
      const server = res2.headers.get('server')

      resultados.push({
        test: 'Products',
        url: url2,
        status: res2.status,
        statusText: res2.statusText,
        exitoso: res2.ok,
        cloudflare: {
          rayId: cloudflareRayId,
          cacheStatus: cloudflareCache,
          server: server,
        },
        errorBody: !res2.ok ? await res2.text() : null,
      })
    } catch (error: any) {
      resultados.push({
        test: 'Products',
        url: `${wooUrl}/wp-json/wc/v3/products?per_page=1`,
        error: error.message,
        tipo: error.name,
      })
    }

    // Test 3: WordPress REST API base (sin WooCommerce)
    try {
      const url3 = `${wooUrl}/wp-json/`
      const controller3 = new AbortController()
      const timeout3 = setTimeout(() => controller3.abort(), 10000)

      const res3 = await fetch(url3, {
        headers: {
          'User-Agent': 'FidelizacionApp/1.0',
        },
        signal: controller3.signal,
      })

      clearTimeout(timeout3)

      const cloudflareRayId = res3.headers.get('cf-ray')
      const cloudflareCache = res3.headers.get('cf-cache-status')
      const server = res3.headers.get('server')

      resultados.push({
        test: 'WordPress REST Base',
        url: url3,
        status: res3.status,
        statusText: res3.statusText,
        exitoso: res3.ok,
        cloudflare: {
          rayId: cloudflareRayId,
          cacheStatus: cloudflareCache,
          server: server,
        },
        errorBody: !res3.ok ? await res3.text() : null,
      })
    } catch (error: any) {
      resultados.push({
        test: 'WordPress REST Base',
        url: `${wooUrl}/wp-json/`,
        error: error.message,
        tipo: error.name,
      })
    }

    // Test 4: Home del sitio (baseline)
    try {
      const url4 = wooUrl
      const controller4 = new AbortController()
      const timeout4 = setTimeout(() => controller4.abort(), 10000)

      const res4 = await fetch(url4, {
        headers: {
          'User-Agent': 'FidelizacionApp/1.0',
        },
        signal: controller4.signal,
      })

      clearTimeout(timeout4)

      const cloudflareRayId = res4.headers.get('cf-ray')
      const cloudflareCache = res4.headers.get('cf-cache-status')
      const server = res4.headers.get('server')

      resultados.push({
        test: 'Homepage',
        url: url4,
        status: res4.status,
        statusText: res4.statusText,
        exitoso: res4.ok,
        cloudflare: {
          rayId: cloudflareRayId,
          cacheStatus: cloudflareCache,
          server: server,
        },
      })
    } catch (error: any) {
      resultados.push({
        test: 'Homepage',
        url: wooUrl,
        error: error.message,
        tipo: error.name,
      })
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      resultados,
      analisis: analizarResultados(resultados),
    })
  } catch (error) {
    console.error('[WooCommerce Test Detailed] Error:', error)
    return NextResponse.json(
      { 
        error: 'Error en test detallado',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function analizarResultados(resultados: any[]) {
  const analisis: string[] = []

  // Verificar si cloudflare está activo
  const tieneCloudflare = resultados.some(r => r.cloudflare?.rayId)
  if (tieneCloudflare) {
    analisis.push('✅ Cloudflare está activo (Ray ID detectado)')
  } else {
    analisis.push('⚠️ No se detectó Cloudflare (no hay Ray ID)')
  }

  // Verificar qué endpoints funcionan
  const wpRestBase = resultados.find(r => r.test === 'WordPress REST Base')
  const wooProducts = resultados.find(r => r.test === 'Products')
  const homepage = resultados.find(r => r.test === 'Homepage')

  if (homepage?.exitoso) {
    analisis.push('✅ El sitio principal es accesible')
  } else if (homepage?.status) {
    analisis.push(`❌ El sitio principal da error ${homepage.status}`)
  }

  if (wpRestBase?.exitoso) {
    analisis.push('✅ WordPress REST API base funciona')
  } else if (wpRestBase?.status === 403) {
    analisis.push('❌ WordPress REST API base bloqueada (403)')
    analisis.push('💡 Cloudflare está bloqueando TODO /wp-json/')
  } else if (wpRestBase?.status) {
    analisis.push(`⚠️ WordPress REST API base da error ${wpRestBase.status}`)
  }

  if (wooProducts?.exitoso) {
    analisis.push('✅ WooCommerce API funciona correctamente')
  } else if (wooProducts?.status === 403) {
    analisis.push('❌ WooCommerce API bloqueada (403)')
    
    if (wpRestBase?.exitoso) {
      analisis.push('💡 WordPress REST funciona pero WooCommerce no')
      analisis.push('💡 Problema: Permisos de API o credenciales incorrectas')
    } else {
      analisis.push('💡 Problema: Page Rule de Cloudflare no está funcionando')
      analisis.push('💡 Verificar: URL exacta, orden de reglas, tiempo de propagación')
    }
  } else if (wooProducts?.status === 401) {
    analisis.push('❌ WooCommerce API: Credenciales incorrectas (401)')
  } else if (wooProducts?.status) {
    analisis.push(`⚠️ WooCommerce API da error ${wooProducts.status}`)
  }

  // Ray ID para buscar en logs
  const rayIds = resultados
    .filter(r => r.cloudflare?.rayId)
    .map(r => `${r.test}: ${r.cloudflare.rayId}`)
  
  if (rayIds.length > 0) {
    analisis.push(`📋 Ray IDs (para buscar en Cloudflare Logs): ${rayIds.join(', ')}`)
  }

  return analisis
}
