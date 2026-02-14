// src/app/api/woocommerce/diagnostico/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/diagnostico
 * Diagnóstico de configuración de WooCommerce (sin exponer credenciales completas)
 */
export async function GET(req: NextRequest) {
  try {
    const wooUrl = process.env.WOOCOMMERCE_URL
    const wooKey = process.env.WOOCOMMERCE_KEY
    const wooSecret = process.env.WOOCOMMERCE_SECRET

    // Función para ofuscar credenciales
    const ofuscar = (str: string | undefined) => {
      if (!str) return null
      if (str.length <= 8) return '***'
      return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`
    }

    const diagnostico = {
      timestamp: new Date().toISOString(),
      configuracion: {
        WOOCOMMERCE_URL: {
          configurada: !!wooUrl,
          valor: wooUrl || null,
          valida: wooUrl ? (wooUrl.startsWith('http://') || wooUrl.startsWith('https://')) : false,
          terminaEnSlash: wooUrl ? wooUrl.endsWith('/') : false,
        },
        WOOCOMMERCE_KEY: {
          configurada: !!wooKey,
          ofuscada: ofuscar(wooKey),
          longitud: wooKey?.length || 0,
          formatoValido: wooKey ? wooKey.startsWith('ck_') : false,
        },
        WOOCOMMERCE_SECRET: {
          configurada: !!wooSecret,
          ofuscada: ofuscar(wooSecret),
          longitud: wooSecret?.length || 0,
          formatoValido: wooSecret ? wooSecret.startsWith('cs_') : false,
        },
      },
      todasConfiguradas: !!(wooUrl && wooKey && wooSecret),
    }

    // Si todas están configuradas, intenta una llamada de prueba
    if (diagnostico.todasConfiguradas && wooUrl && wooKey && wooSecret) {
      try {
        const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')
        
        // Timeout de 10 segundos
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const testUrl = `${wooUrl}/wp-json/wc/v3/system_status`
        
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        return NextResponse.json({
          ...diagnostico,
          pruebaConexion: {
            url: testUrl,
            status: response.status,
            statusText: response.statusText,
            exitoso: response.ok,
            headers: {
              contentType: response.headers.get('content-type'),
            },
          },
        })
      } catch (fetchError) {
        return NextResponse.json({
          ...diagnostico,
          pruebaConexion: {
            exitoso: false,
            error: fetchError instanceof Error ? fetchError.message : 'Error desconocido',
            tipo: fetchError instanceof Error ? fetchError.name : 'Unknown',
          },
        })
      }
    }

    return NextResponse.json(diagnostico)
  } catch (error) {
    console.error('[WooCommerce Diagnóstico] Error:', error)
    return NextResponse.json(
      { 
        error: 'Error al realizar diagnóstico',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
