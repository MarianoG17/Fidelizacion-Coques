// src/app/api/admin/diagnostico-webhook/route.ts
// Simula el procesamiento del webhook para un pedido WooCommerce dado
// y reporta exactamente dónde fallaría sin crear ningún registro
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'
import { buildWooHeaders } from '@/lib/woocommerce-headers'
import { normalizarTelefono } from '@/lib/phone'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  const wooId = new URL(req.url).searchParams.get('wooId')
  if (!wooId) return NextResponse.json({ error: 'wooId requerido' }, { status: 400 })

  const wooUrl = process.env.WOOCOMMERCE_URL
  const wooKey = process.env.WOOCOMMERCE_KEY
  const wooSecret = process.env.WOOCOMMERCE_SECRET
  if (!wooUrl || !wooKey || !wooSecret) {
    return NextResponse.json({ error: 'Credenciales WooCommerce no configuradas' }, { status: 500 })
  }

  const pasos: Array<{ paso: string; ok: boolean; detalle: string }> = []

  // PASO 1: Obtener pedido de WooCommerce
  let order: any = null
  try {
    const res = await fetch(`${wooUrl}/wp-json/wc/v3/orders/${wooId}`, {
      headers: buildWooHeaders(wooKey, wooSecret),
    })
    if (!res.ok) {
      pasos.push({ paso: 'Obtener pedido de WooCommerce', ok: false, detalle: `WooCommerce devolvió HTTP ${res.status}` })
      return NextResponse.json({ wooId, pasos, resultado: 'ERROR' })
    }
    order = await res.json()
    pasos.push({ paso: 'Obtener pedido de WooCommerce', ok: true, detalle: `Pedido #${order.id} encontrado` })
  } catch (e: any) {
    pasos.push({ paso: 'Obtener pedido de WooCommerce', ok: false, detalle: `Error de red: ${e.message}` })
    return NextResponse.json({ wooId, pasos, resultado: 'ERROR' })
  }

  // PASO 2: Estado del pedido
  const status = order.status
  if (status !== 'completed') {
    pasos.push({ paso: 'Estado del pedido', ok: false, detalle: `Estado es "${status}", se requiere "completed"` })
  } else {
    pasos.push({ paso: 'Estado del pedido', ok: true, detalle: `Estado: completed ✓` })
  }

  // PASO 3: Teléfono del pedido
  const phoneRaw = order.billing?.phone ?? ''
  const phoneNormalizado = normalizarTelefono(phoneRaw)
  if (!phoneNormalizado) {
    pasos.push({ paso: 'Normalizar teléfono', ok: false, detalle: `"${phoneRaw}" no pudo normalizarse (inválido o muy corto)` })
  } else {
    pasos.push({ paso: 'Normalizar teléfono', ok: true, detalle: `"${phoneRaw}" → "${phoneNormalizado}"` })
  }

  // PASO 4: Buscar cliente por teléfono
  let cliente = null
  if (phoneNormalizado) {
    cliente = await prisma.cliente.findUnique({ where: { phone: phoneNormalizado } })
    if (cliente) {
      pasos.push({ paso: 'Buscar cliente por teléfono', ok: true, detalle: `Cliente encontrado: ${cliente.nombre} (${cliente.id})` })
    } else {
      pasos.push({ paso: 'Buscar cliente por teléfono', ok: false, detalle: `No hay cliente con phone="${phoneNormalizado}"` })
    }
  }

  // PASO 5: Buscar cliente por email (fallback)
  const emailRaw = order.billing?.email ?? ''
  if (!cliente && emailRaw) {
    cliente = await prisma.cliente.findUnique({ where: { email: emailRaw } })
    if (cliente) {
      pasos.push({ paso: 'Buscar cliente por email', ok: true, detalle: `Cliente encontrado por email: ${cliente.nombre} (${emailRaw})` })
    } else {
      pasos.push({ paso: 'Buscar cliente por email', ok: false, detalle: `No hay cliente con email="${emailRaw}"` })
    }
  } else if (!emailRaw && !cliente) {
    pasos.push({ paso: 'Buscar cliente por email', ok: false, detalle: 'Sin email en el pedido' })
  }

  if (!cliente) {
    // Mostrar los phones de clientes que se parezcan al teléfono del pedido
    const sugerencias = await prisma.cliente.findMany({
      select: { id: true, nombre: true, phone: true, email: true },
      take: 5,
    })
    const similares = sugerencias.filter(c =>
      (phoneNormalizado && c.phone.includes(phoneNormalizado.slice(-8))) ||
      (emailRaw && c.email === emailRaw)
    )
    return NextResponse.json({
      wooId,
      pasos,
      resultado: 'CLIENTE_NO_ENCONTRADO',
      pedidoInfo: {
        status: order.status,
        phoneRaw,
        phoneNormalizado,
        email: emailRaw,
        nombre: `${order.billing?.first_name} ${order.billing?.last_name}`.trim(),
        total: order.total,
      },
      similares,
    })
  }

  // PASO 6: Local de cafetería
  const local = await prisma.local.findFirst({ where: { tipo: 'cafeteria' } })
  if (!local) {
    pasos.push({ paso: 'Buscar local cafetería', ok: false, detalle: 'No existe un local con tipo="cafeteria"' })
  } else {
    pasos.push({ paso: 'Buscar local cafetería', ok: true, detalle: `Local: ${local.nombre}` })
  }

  // PASO 7: Verificar si el pedido ya fue registrado
  const eventoExistente = await prisma.eventoScan.findFirst({
    where: {
      clienteId: cliente.id,
      tipoEvento: 'PEDIDO_TORTA',
      notas: `Pedido WooCommerce #${order.id}`,
    },
  })
  if (eventoExistente) {
    pasos.push({ paso: 'Verificar duplicado', ok: false, detalle: `El pedido YA fue registrado (eventoId: ${eventoExistente.id}, fecha: ${eventoExistente.timestamp.toISOString()})` })
    return NextResponse.json({ wooId, pasos, resultado: 'YA_REGISTRADO', eventoExistente: { id: eventoExistente.id, timestamp: eventoExistente.timestamp } })
  } else {
    pasos.push({ paso: 'Verificar duplicado', ok: true, detalle: 'El pedido NO está registrado aún' })
  }

  return NextResponse.json({
    wooId,
    pasos,
    resultado: 'LISTO_PARA_REGISTRAR',
    pedidoInfo: {
      status: order.status,
      phoneRaw,
      phoneNormalizado,
      email: emailRaw,
      nombre: `${order.billing?.first_name} ${order.billing?.last_name}`.trim(),
      total: order.total,
      dateCompleted: order.date_completed,
    },
    clienteEncontrado: {
      id: cliente.id,
      nombre: cliente.nombre,
      phone: cliente.phone,
      email: cliente.email,
    },
  })
}
