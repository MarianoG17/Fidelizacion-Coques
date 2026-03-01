ya // src/app/api/woocommerce/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { evaluarNivel } from '@/lib/beneficios'

/**
 * Webhook de WooCommerce para registrar pedidos completados de TORTAS.
 *
 * Configurar en WooCommerce:
 * 1. WooCommerce > Ajustes > Avanzado > Webhooks
 * 2. Crear nuevo webhook:
 *    - Name: "Pedido Completado - Fidelización"
 *    - Status: Activo
 *    - Topic: Order updated
 *    - Delivery URL: https://tu-dominio.com/api/woocommerce/webhook
 *    - Secret: [copiar de WOOCOMMERCE_WEBHOOK_SECRET en .env]
 *    - API Version: WP REST API Integration v3
 *
 * El webhook se dispara cuando un pedido cambia a estado "completed".
 * Como todos los productos en la app son de pastelería, cada pedido
 * completado se registra como evento PEDIDO_TORTA (cuenta como 3 visitas).
 */

interface WooCommerceWebhookPayload {
  id: number
  status: string
  customer_id: number
  billing: {
    phone: string
    email: string
    first_name: string
    last_name: string
  }
  line_items: Array<{
    id: number
    name: string
    product_id: number
    quantity: number
    sku?: string
    meta_data?: Array<{
      key: string
      value: string
    }>
  }>
  date_completed?: string
  date_created: string
}

/**
 * Verifica la firma del webhook de WooCommerce
 */
function verificarFirma(body: string, firma: string | null): boolean {
  if (!firma) return false
  
  const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Webhook] WOOCOMMERCE_WEBHOOK_SECRET no configurado')
    return false
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')

  return hash === firma
}


/**
 * Registra un evento PEDIDO_TORTA para el cliente
 */
async function registrarPedidoTorta(
  clienteId: string,
  orderId: number,
  localId: string
): Promise<void> {
  try {
    // Crear evento PEDIDO_TORTA
    await prisma.eventoScan.create({
      data: {
        clienteId,
        localId,
        tipoEvento: 'PEDIDO_TORTA',
        metodoValidacion: 'QR', // Usamos QR como método por defecto para pedidos web
        contabilizada: true,
        notas: `Pedido WooCommerce #${orderId}`,
      },
    })

    console.log(`[Webhook] ✅ Evento PEDIDO_TORTA registrado para cliente ${clienteId}, pedido #${orderId}`)

    // Evaluar si el cliente sube de nivel
    const resultado = await evaluarNivel(clienteId)
    if (resultado) {
      console.log(`[Webhook] 🎉 Cliente ${clienteId} subió de nivel: ${resultado.nombre}`)
    }
  } catch (error) {
    console.error('[Webhook] Error registrando evento PEDIDO_TORTA:', error)
    throw error
  }
}

/**
 * Normaliza el teléfono al formato E.164
 */
function normalizarTelefono(phone: string): string {
  // Remover espacios, guiones, paréntesis
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // Si empieza con 0, quitarlo (formato local argentino)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  
  // Si no tiene código de país, agregar +54 (Argentina)
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('54')) {
      cleaned = '+' + cleaned
    } else {
      cleaned = '+54' + cleaned
    }
  }
  
  return cleaned
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const firma = req.headers.get('x-wc-webhook-signature')

    // Verificar firma del webhook
    if (!verificarFirma(body, firma)) {
      console.error('[Webhook] ❌ Firma inválida')
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }

    const payload: WooCommerceWebhookPayload = JSON.parse(body)
    
    console.log(`[Webhook] 📦 Pedido #${payload.id} - Estado: ${payload.status}`)

    // Solo procesar pedidos completados
    if (payload.status !== 'completed') {
      console.log(`[Webhook] ⏭️ Pedido #${payload.id} no está completado, ignorando`)
      return NextResponse.json({ success: true, message: 'Estado no es completed' })
    }

    // Todos los productos en la app son de pastelería, no hace falta verificar categoría
    console.log(`[Webhook] 🍰 Pedido #${payload.id} contiene ${payload.line_items.length} item(s) de pastelería`)

    // Normalizar teléfono del cliente
    const phoneNormalizado = normalizarTelefono(payload.billing.phone)
    console.log(`[Webhook] 📞 Teléfono: ${payload.billing.phone} → ${phoneNormalizado}`)

    // Buscar cliente por teléfono
    let cliente = await prisma.cliente.findUnique({
      where: { phone: phoneNormalizado },
    })

    // Si no existe, buscar por email
    if (!cliente && payload.billing.email) {
      cliente = await prisma.cliente.findUnique({
        where: { email: payload.billing.email },
      })
    }

    if (!cliente) {
      console.log(`[Webhook] ⚠️ Cliente no encontrado (phone: ${phoneNormalizado}, email: ${payload.billing.email})`)
      return NextResponse.json({
        success: false,
        message: 'Cliente no registrado en el sistema de fidelización',
      }, { status: 404 })
    }

    console.log(`[Webhook] ✅ Cliente encontrado: ${cliente.nombre} (${cliente.id})`)

    // Obtener el local (cafetería - donde se hacen los pedidos de tortas)
    const local = await prisma.local.findFirst({
      where: { tipo: 'cafeteria' },
    })

    if (!local) {
      console.error('[Webhook] ❌ Local de cafetería no encontrado')
      return NextResponse.json({ error: 'Local no encontrado' }, { status: 500 })
    }

    // Verificar si ya se registró este pedido
    const eventoExistente = await prisma.eventoScan.findFirst({
      where: {
        clienteId: cliente.id,
        tipoEvento: 'PEDIDO_TORTA',
        notas: `Pedido WooCommerce #${payload.id}`,
      },
    })

    if (eventoExistente) {
      console.log(`[Webhook] ⏭️ Pedido #${payload.id} ya fue registrado anteriormente`)
      return NextResponse.json({ success: true, message: 'Pedido ya registrado' })
    }

    // Registrar el pedido de torta
    await registrarPedidoTorta(cliente.id, payload.id, local.id)

    return NextResponse.json({
      success: true,
      message: `Pedido de torta registrado exitosamente para ${cliente.nombre}`,
      clienteId: cliente.id,
      orderId: payload.id,
    })
  } catch (error) {
    console.error('[Webhook] ❌ Error procesando webhook:', error)
    return NextResponse.json(
      { error: 'Error procesando webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
