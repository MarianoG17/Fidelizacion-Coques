 no usa// Script para debug del pedido 2297 - verificar descuento
// Uso: WOOCOMMERCE_URL=xxx WOOCOMMERCE_KEY=xxx WOOCOMMERCE_SECRET=xxx node scripts/debug-pedido-2297.js

const wooUrl = process.env.WOOCOMMERCE_URL
const wooKey = process.env.WOOCOMMERCE_KEY
const wooSecret = process.env.WOOCOMMERCE_SECRET

if (!wooUrl || !wooKey || !wooSecret) {
    console.error('❌ Faltan credenciales de WooCommerce en variables de entorno')
    console.log('Uso: WOOCOMMERCE_URL=xxx WOOCOMMERCE_KEY=xxx WOOCOMMERCE_SECRET=xxx node scripts/debug-pedido-2297.js')
    process.exit(1)
}

const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')

async function debugPedido2297() {
    try {
        console.log('🔍 Obteniendo pedido 2297 de WooCommerce...\n');

        const response = await fetch(
            `${wooUrl}/wp-json/wc/v3/orders/2297`,
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

        const pedido = await response.json()

        console.log('📦 INFORMACIÓN DEL PEDIDO:');
        console.log('================================\n');
        console.log('ID:', pedido.id);
        console.log('Número:', pedido.number);
        console.log('Estado:', pedido.status);
        console.log('Cliente:', pedido.billing.first_name, pedido.billing.last_name);
        console.log('Teléfono:', pedido.billing.phone);

        console.log('\n💰 INFORMACIÓN DE PRECIOS:');
        console.log('================================\n');
        console.log('Subtotal:', pedido.total - pedido.total_tax);
        console.log('Descuento Total:', pedido.discount_total);
        console.log('Tax:', pedido.total_tax);
        console.log('Total:', pedido.total);

        console.log('\n🎫 CUPONES APLICADOS:');
        console.log('================================\n');
        if (pedido.coupon_lines && pedido.coupon_lines.length > 0) {
            pedido.coupon_lines.forEach(cupon => {
                console.log('  ✅ Código:', cupon.code);
                console.log('     Descuento:', cupon.discount);
                console.log('     Descuento Tax:', cupon.discount_tax);
                console.log('');
            });
        } else {
            console.log('  ❌ NO SE APLICARON CUPONES');
            console.log('     Esto significa que el cupón no se envió o WooCommerce lo rechazó\n');
        }

        console.log('📋 LINE ITEMS:');
        console.log('================================\n');
        pedido.line_items.forEach((item, idx) => {
            console.log(`[${idx + 1}] ${item.name}`);
            console.log(`    ID Producto: ${item.product_id}`);
            console.log(`    Cantidad: ${item.quantity}`);
            console.log(`    Precio unitario: $${item.price}`);
            console.log(`    Subtotal: $${item.subtotal}`);
            console.log(`    Total: $${item.total}`);

            if (item.meta_data && item.meta_data.length > 0) {
                console.log('    Metadata del item:');
                item.meta_data.forEach(meta => {
                    console.log(`      - ${meta.display_key || meta.key}: ${meta.display_value || meta.value}`);
                });
            }
            console.log('');
        });

        console.log('📝 METADATA DEL PEDIDO:');
        console.log('================================\n');
        if (pedido.meta_data && pedido.meta_data.length > 0) {
            const metadataRelevante = pedido.meta_data.filter(meta =>
                meta.key.includes('nivel') ||
                meta.key.includes('descuento') ||
                meta.key.includes('cliente') ||
                meta.key.includes('fidelizacion')
            );

            if (metadataRelevante.length > 0) {
                metadataRelevante.forEach(meta => {
                    console.log(`  ${meta.key}: ${meta.value}`);
                });
            } else {
                console.log('  ⚠️ No hay metadata relacionada con nivel/descuento');
            }
        } else {
            console.log('  ⚠️ No hay metadata en este pedido');
        }

        console.log('\n✅ Debug completado\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugPedido2297();
