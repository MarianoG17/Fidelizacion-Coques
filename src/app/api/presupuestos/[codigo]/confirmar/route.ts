// src/app/api/presupuestos/[codigo]/confirmar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/presupuestos/:codigo/confirmar - Confirmar presupuesto y crear pedido WooCommerce
export async function POST(
  req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  try {
    const { codigo } = params
    const body = await req.json()

    // Buscar el presupuesto
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { codigo },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            phone: true,
            email: true,
            nivel: {
              select: {
                nombre: true,
                descuentoPedidosTortas: true
              }
            }
          }
        }
      }
    })

    if (!presupuesto) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      )
    }

    if (presupuesto.estado === 'CONFIRMADO') {
      return NextResponse.json(
        { error: 'Este presupuesto ya fue confirmado' },
        { status: 400 }
      )
    }

    if (presupuesto.estado === 'CANCELADO') {
      return NextResponse.json(
        { error: 'No se puede confirmar un presupuesto cancelado' },
        { status: 400 }
      )
    }

    // Verificar que no haya campos pendientes si se requiere
    if (presupuesto.estado === 'PENDIENTE' && body.verificarCompleto !== false) {
      return NextResponse.json(
        { 
          error: 'El presupuesto tiene campos pendientes. Complete todos los campos antes de confirmar o use verificarCompleto: false para omitir esta validación',
          camposPendientes: presupuesto.camposPendientes 
        },
        { status: 400 }
      )
    }

    // Crear el pedido en WooCommerce
    const wooCommerceUrl = process.env.WOOCOMMERCE_URL
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET

    if (!wooCommerceUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'Configuración de WooCommerce no encontrada' },
        { status: 500 }
      )
    }

    // Preparar datos del pedido
    const items = presupuesto.items as any[]
    const lineItems: any[] = []

    items.forEach((item: any) => {
      const lineItem: any = {
        product_id: item.productoId,
        quantity: item.cantidad || 1
      }

      if (item.varianteId) {
        lineItem.variation_id = item.varianteId
      }

      // Agregar meta data
      const metaData: any[] = []

      // Add-ons
      if (item.addOns && Object.keys(item.addOns).length > 0) {
        Object.entries(item.addOns).forEach(([nombreAddOn, opciones]: [string, any]) => {
          if (Array.isArray(opciones)) {
            opciones.forEach((opcion: any) => {
              metaData.push({
                key: nombreAddOn,
                value: opcion.etiqueta || opcion.sku
              })
            })
          }
        })
      }

      // Campos de texto
      if (item.camposTexto && Object.keys(item.camposTexto).length > 0) {
        Object.entries(item.camposTexto).forEach(([nombreCampo, valor]) => {
          metaData.push({
            key: nombreCampo,
            value: valor
          })
        })
      }

      if (metaData.length > 0) {
        lineItem.meta_data = metaData
      }

      lineItems.push(lineItem)
    })

    // Crear el pedido en WooCommerce
    const orderData: any = {
      status: 'processing',
      line_items: lineItems,
      meta_data: [
        {
          key: '_presupuesto_codigo',
          value: codigo
        }
      ]
    }

    // Agregar información del cliente si está disponible
    if (presupuesto.cliente) {
      orderData.customer_id = 0 // WooCommerce guest
      orderData.billing = {
        first_name: presupuesto.cliente.nombre || presupuesto.nombreCliente || '',
        phone: presupuesto.cliente.phone || presupuesto.telefonoCliente || '',
        email: presupuesto.cliente.email || presupuesto.emailCliente || ''
      }
    } else if (presupuesto.nombreCliente || presupuesto.telefonoCliente || presupuesto.emailCliente) {
      orderData.billing = {
        first_name: presupuesto.nombreCliente || '',
        phone: presupuesto.telefonoCliente || '',
        email: presupuesto.emailCliente || ''
      }
    }

    // Agregar fecha y hora de entrega si están disponibles
    if (presupuesto.fechaEntrega) {
      orderData.meta_data.push({
        key: '_fecha_entrega',
        value: presupuesto.fechaEntrega.toISOString().split('T')[0]
      })
    }

    if (presupuesto.horaEntrega) {
      orderData.meta_data.push({
        key: '_hora_entrega',
        value: presupuesto.horaEntrega
      })
    }

    // Agregar notas
    if (presupuesto.notasCliente) {
      orderData.customer_note = presupuesto.notasCliente
    }

    if (presupuesto.notasInternas) {
      orderData.meta_data.push({
        key: '_notas_internas',
        value: presupuesto.notasInternas
      })
    }

    // Crear pedido en WooCommerce
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const wooResponse = await fetch(`${wooCommerceUrl}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(orderData)
    })

    if (!wooResponse.ok) {
      const errorData = await wooResponse.json()
      console.error('Error de WooCommerce:', errorData)
      return NextResponse.json(
        { error: 'Error al crear pedido en WooCommerce', detalles: errorData },
        { status: 500 }
      )
    }

    const wooOrder = await wooResponse.json()

    // Actualizar presupuesto como confirmado
    const presupuestoActualizado = await prisma.presupuesto.update({
      where: { codigo },
      data: {
        estado: 'CONFIRMADO',
        confirmadoEn: new Date(),
        wooOrderId: wooOrder.id
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            phone: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      presupuesto: presupuestoActualizado,
      pedido: {
        id: wooOrder.id,
        numero: wooOrder.number,
        estado: wooOrder.status,
        total: wooOrder.total,
        url: `${wooCommerceUrl}/wp-admin/post.php?post=${wooOrder.id}&action=edit`
      },
      mensaje: `Presupuesto confirmado exitosamente. Pedido #${wooOrder.number} creado.`
    })

  } catch (error: any) {
    console.error('Error al confirmar presupuesto:', error)
    return NextResponse.json(
      { error: 'Error al confirmar presupuesto', detalles: error.message },
      { status: 500 }
    )
  }
}
