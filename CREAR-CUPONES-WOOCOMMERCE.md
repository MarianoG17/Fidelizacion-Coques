# 🎫 Crear Cupones de Descuento en WooCommerce

## Cupones Necesarios para el Sistema de Fidelización

Debes crear estos cupones en WooCommerce para que el sistema funcione correctamente:

### 1. NIVEL_BRONCE
- **Código del cupón**: `NIVEL_BRONCE`
- **Tipo de descuento**: Descuento fijo del carrito
- **Importe del cupón**: 0 (se aplicará dinámicamente desde la app)
- **Permitir uso libre**: ✅ Sí
- **Fecha de caducidad**: Sin fecha (permanente)

### 2. NIVEL_PLATA
- **Código del cupón**: `NIVEL_PLATA`
- **Tipo de descuento**: Descuento fijo del carrito
- **Importe del cupón**: 0 (se aplicará dinámicamente)
- **Permitir uso libre**: ✅ Sí
- **Fecha de caducidad**: Sin fecha

### 3. NIVEL_ORO
- **Código del cupón**: `NIVEL_ORO`
- **Tipo de descuento**: Descuento fijo del carrito
- **Importe del cupón**: 0 (se aplicará dinámicamente)
- **Permitir uso libre**: ✅ Sí
- **Fecha de caducidad**: Sin fecha

### 4. NIVEL_PLATINO (Opcional)
- **Código del cupón**: `NIVEL_PLATINO`
- **Tipo de descuento**: Descuento fijo del carrito
- **Importe del cupón**: 0 (se aplicará dinámicamente)
- **Permitir uso libre**: ✅ Sí
- **Fecha de caducidad**: Sin fecha

## 📝 Pasos para Crear los Cupones

1. Ir a **WooCommerce > Cupones**
2. Click en **Añadir cupón**
3. Completar los campos:
   - **Código del cupón**: Exactamente como está arriba (con mayúsculas)
   - **Tipo de descuento**: Descuento fijo del carrito
   - **Importe del cupón**: 0
4. En la pestaña **Restricciones de uso**:
   - ✅ Marcar "Permitir uso libre" (para que se pueda usar sin límites)
5. **Publicar** el cupón
6. Repetir para cada nivel

## ⚠️ IMPORTANTE

- Los códigos deben ser **EXACTAMENTE** como están escritos (con guiones bajos y mayúsculas)
- El importe debe ser **0** porque la app calculará y aplicará el monto dinámicamente
- **NO poner fecha de caducidad** - estos cupones son permanentes
- **Permitir uso libre** debe estar activado

## 🔍 Verificación

Una vez creados los cupones, podés verificar en **WooCommerce > Cupones** que veas:
- ✅ NIVEL_BRONCE
- ✅ NIVEL_PLATA
- ✅ NIVEL_ORO
- ✅ NIVEL_PLATINO (opcional)

Todos con estado **Publicado** y sin fecha de caducidad.

## 🧪 Testing

1. Crear los 4 cupones en WooCommerce
2. Hacer un pedido de prueba desde la app como cliente Bronce
3. Verificar en WooCommerce que el pedido tenga:
   - Cupón `NIVEL_BRONCE` aplicado
   - Monto del descuento correcto (5% del subtotal)
   - Total reducido correctamente
4. Verificar en Ayres IT que el descuento se vea

## 📊 Cómo Funciona el Sistema

```
Cliente Nivel Bronce → Pedido de $15,000
    ↓
App calcula: 5% = $750 de descuento
    ↓
Envía a WooCommerce:
  - line_items: $15,000
  - coupon_lines: [{
      code: "NIVEL_BRONCE",
      discount: "750.00"
    }]
    ↓
WooCommerce aplica cupón NIVEL_BRONCE
    ↓
Ayres IT recibe pedido con:
  - Subtotal: $15,000
  - Descuento (cupón): -$750
  - Total: $14,250 ✅
```

## 🎯 Resultado Esperado

Una vez creados los cupones, los pedidos desde la app se crearán correctamente y Ayres IT verá:
- ✅ El descuento como línea de cupón
- ✅ El total correcto con descuento aplicado
- ✅ El nombre del nivel en el código del cupón
