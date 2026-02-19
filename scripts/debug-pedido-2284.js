// Script temporal para diagnosticar campos del pedido 2284
// Uso: WOOCOMMERCE_URL=xxx WOOCOMMERCE_KEY=xxx WOOCOMMERCE_SECRET=xxx node scripts/debug-pedido-2284.js
// O mejor, desde el endpoint: https://tudominio.com/api/woocommerce/debug-fechas?orderId=2284

const wooUrl = process.env.WOOCOMMERCE_URL
const wooKey = process.env.WOOCOMMERCE_KEY
const wooSecret = process.env.WOOCOMMERCE_SECRET

if (!wooUrl || !wooKey || !wooSecret) {
  console.error('❌ Faltan credenciales de WooCommerce en .env.local')
  process.exit(1)
}

const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')

async function consultarPedido() {
  try {
    console.log('🔍 Consultando pedido 2284...\n')
    
    const response = await fetch(
      `${wooUrl}/wp-json/wc/v3/orders/2284`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error:', response.status, errorText)
      return
    }

    const order = await response.json()

    console.log('📋 INFORMACIÓN DEL PEDIDO 2284')
    console.log('================================\n')
    console.log(`ID: ${order.id}`)
    console.log(`Número: ${order.number}`)
    console.log(`Estado: ${order.status}`)
    console.log(`Fecha creación: ${order.date_created}`)
    console.log(`Cliente: ${order.billing.first_name} ${order.billing.last_name}`)
    console.log(`Email: ${order.billing.email}`)
    console.log(`Teléfono: ${order.billing.phone}\n`)

    console.log('📝 METADATA COMPLETO:')
    console.log('================================\n')
    
    if (order.meta_data && order.meta_data.length > 0) {
      order.meta_data.forEach((item, index) => {
        console.log(`[${index + 1}] Key: "${item.key}"`)
        console.log(`    Value: "${item.value}"`)
        console.log(`    ID: ${item.id}\n`)
      })
    } else {
      console.log('⚠️ No hay metadata en este pedido\n')
    }

    // Filtrar campos relacionados con fecha/hora
    console.log('🎯 CAMPOS DE FECHA/HORA ENCONTRADOS:')
    console.log('================================\n')
    
    const camposFecha = order.meta_data?.filter(item => 
      item.key.toLowerCase().includes('date') ||
      item.key.toLowerCase().includes('fecha') ||
      item.key.toLowerCase().includes('delivery') ||
      item.key.toLowerCase().includes('time') ||
      item.key.toLowerCase().includes('hora') ||
      item.key.toLowerCase().includes('slot')
    ) || []

    if (camposFecha.length > 0) {
      camposFecha.forEach(item => {
        console.log(`✅ "${item.key}" = "${item.value}"`)
      })
    } else {
      console.log('⚠️ No se encontraron campos obvios de fecha/hora')
    }

    console.log('\n')

    // Buscar campos que empiecen con _ o e_
    console.log('🔎 CAMPOS CON PREFIJOS ESPECIALES:')
    console.log('================================\n')
    
    const camposEspeciales = order.meta_data?.filter(item => 
      item.key.startsWith('_') || item.key.startsWith('e_')
    ) || []

    if (camposEspeciales.length > 0) {
      camposEspeciales.forEach(item => {
        console.log(`"${item.key}" = "${item.value}"`)
      })
    } else {
      console.log('⚠️ No se encontraron campos con prefijos especiales')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

consultarPedido()
