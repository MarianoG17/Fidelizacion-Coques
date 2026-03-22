// src/app/api/admin/migrar-woocommerce/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'
import { generarSecretoOTP } from '@/lib/otp'
import { toE164 } from '@/lib/phone'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface WooCliente {
  id: number
  email: string
  first_name: string
  last_name: string
  billing: {
    first_name: string
    last_name: string
    phone: string
    email: string
  }
  date_created: string
  orders_count: number
  total_spent: string
}

async function fetchWooClientes(page: number, perPage = 100): Promise<WooCliente[]> {
  const wooUrl = process.env.WOOCOMMERCE_URL
  const wooKey = process.env.WOOCOMMERCE_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY
  const wooSecret = process.env.WOOCOMMERCE_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET

  if (!wooUrl || !wooKey || !wooSecret) throw new Error('Credenciales WooCommerce no configuradas')

  const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')
  const res = await fetch(
    `${wooUrl}/wp-json/wc/v3/customers?per_page=${perPage}&page=${page}&orderby=registered_date&order=desc`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WooCommerce error ${res.status}: ${text}`)
  }

  return res.json()
}

// GET ?diagnostico=true — ver qué datos traen los primeros clientes de WooCommerce
// GET (sin param)       — ver resumen de cuántos hay y cuántos ya están migrados
export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  try {
    const diagnostico = req.nextUrl.searchParams.get('diagnostico') === 'true'

    const primeraPage = await fetchWooClientes(1, diagnostico ? 5 : 100)

    if (diagnostico) {
      // Mostrar datos crudos de los primeros 5 clientes para verificar estructura
      return NextResponse.json({
        total_muestra: primeraPage.length,
        clientes: primeraPage.map((c) => ({
          woo_id: c.id,
          email: c.email,
          nombre: `${c.first_name} ${c.last_name}`.trim() || `${c.billing.first_name} ${c.billing.last_name}`.trim(),
          telefono_billing: c.billing.phone,
          email_billing: c.billing.email,
          pedidos: c.orders_count,
          gasto_total: c.total_spent,
          registrado: c.date_created,
        })),
      })
    }

    // Resumen: cuántos clientes WooCommerce ya están en la DB
    const emails = primeraPage.map((c) => c.email).filter(Boolean)
    const yaExisten = await prisma.cliente.count({
      where: { email: { in: emails } },
    })

    return NextResponse.json({
      woo_clientes_primera_pagina: primeraPage.length,
      ya_en_db: yaExisten,
      a_migrar_estimado: primeraPage.length - yaExisten,
      instruccion: 'Llamá POST a este endpoint para migrar. Agregá ?confirmar=true para ejecutar.',
    })
  } catch (error: any) {
    console.error('[migrar-woocommerce GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST ?confirmar=true — ejecutar la migración
// Sin ?confirmar=true  — dry-run (muestra qué haría sin guardar nada)
export async function POST(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  const confirmar = req.nextUrl.searchParams.get('confirmar') === 'true'

  const resultado = {
    modo: confirmar ? 'REAL' : 'DRY-RUN (sin guardar)',
    migrados: 0,
    ya_existian: 0,
    sin_telefono: 0,
    telefono_invalido: 0,
    errores: 0,
    detalle_migrados: [] as any[],
    detalle_problemas: [] as any[],
  }

  try {
    let page = 1
    let hayMas = true

    while (hayMas) {
      const clientes = await fetchWooClientes(page, 100)
      if (clientes.length === 0) break
      if (clientes.length < 100) hayMas = false

      for (const woo of clientes) {
        const phoneRaw = woo.billing.phone?.trim()
        const email = woo.email?.trim() || woo.billing.email?.trim()
        const nombre = `${woo.first_name} ${woo.last_name}`.trim()
          || `${woo.billing.first_name} ${woo.billing.last_name}`.trim()
          || null

        // Sin teléfono: no podemos crear el cliente (phone es el identificador único)
        if (!phoneRaw) {
          resultado.sin_telefono++
          resultado.detalle_problemas.push({ woo_id: woo.id, email, razon: 'sin teléfono' })
          continue
        }

        // Normalizar teléfono
        let phoneE164: string
        try {
          phoneE164 = toE164(phoneRaw)
        } catch {
          resultado.telefono_invalido++
          resultado.detalle_problemas.push({ woo_id: woo.id, email, telefono_raw: phoneRaw, razon: 'teléfono inválido' })
          continue
        }

        // Verificar si ya existe por teléfono o email
        const existente = await prisma.cliente.findFirst({
          where: {
            OR: [
              { phone: phoneE164 },
              ...(email ? [{ email }] : []),
            ],
          },
          select: { id: true, phone: true, email: true },
        })

        if (existente) {
          resultado.ya_existian++
          continue
        }

        // Migrar
        try {
          if (confirmar) {
            await prisma.cliente.create({
              data: {
                phone: phoneE164,
                email: email || null,
                nombre,
                estado: 'ACTIVO',
                fuenteOrigen: 'MANUAL',
                otpSecret: generarSecretoOTP(),
              },
            })
          }

          resultado.migrados++
          resultado.detalle_migrados.push({
            nombre,
            email,
            telefono: phoneE164,
            pedidos_woo: woo.orders_count,
          })
        } catch (err: any) {
          resultado.errores++
          resultado.detalle_problemas.push({
            woo_id: woo.id,
            email,
            telefono: phoneE164,
            razon: `error al crear: ${err.message}`,
          })
        }
      }

      page++
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('[migrar-woocommerce POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
