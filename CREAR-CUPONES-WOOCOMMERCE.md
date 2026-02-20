# 🎫 Crear Cupones de Descuento en WooCommerce

## Cupones Necesarios para el Sistema de Fidelización

Debes crear estos cupones en WooCommerce para que el sistema funcione correctamente:

### 1. NIVEL_BRONCE
- **Código del cupón**: `NIVEL_BRONCE`
- **Tipo de descuento**: Descuento fijo del carrito
- **Importe del cupón**: 0 (se aplicará dinámicamente desde la app)
- **Fecha de caducidad**: (dejar vacío - sin fecha)
- **Límite de uso por cupón**: (dejar vacío - sin límite)
- **Límite de uso por usuario**: (dejar vacío - sin límite)

### 2. NIVEL_PLATA
- **Código del cupón**: `NIVEL_PLATA`
- **Tipo de descuento**: Descuento fijo del carrito
- **Importe del cupón**: 0 (se aplicará dinámicamente)
- **Fecha de caducidad**: (dejar vacío)
- **Límite de uso por cupón**: (dejar vacío)
- **Límite de uso por usuario**: (dejar vacío)

### 3. NIVEL_ORO
- **Código del cupón**: `NIVEL_ORO`
- **Tipo de descuento**: Descuento fijo del carrito
- **Importe del cupón**: 0 (se aplicará dinámicamente)
- **Fecha de caducidad**: (dejar vacío)
- **Límite de uso por cupón**: (dejar vacío)
- **Límite de uso por usuario**: (dejar vacío)

### 4. NIVEL_PLATINO (Opcional)
- **Código del cupón**: `NIVEL_PLATINO`
- **Tipo de descuento**: Descuento fijo del carrito
- **Importe del cupón**: 0 (se aplicará dinámicamente)
- **Fecha de caducidad**: (dejar vacío)
- **Límite de uso por cupón**: (dejar vacío)
- **Límite de uso por usuario**: (dejar vacío)

## 📝 Pasos para Crear los Cupones

1. Ir a **Marketing > Cupones** (o **WooCommerce > Cupones** en versiones antiguas)
2. Click en **Añadir cupón**
3. **PESTAÑA GENERAL**: Completar los campos:
   - **Código del cupón**: Exactamente como está arriba (con mayúsculas, ejemplo: `NIVEL_BRONCE`)
   - **Tipo de descuento**: Seleccionar "Descuento fijo del carrito"
   - **Importe del cupón**: Poner **0** (cero)
   - **Permitir uso gratuito**: Si aparece esta opción, activarla ✅
   - **Fecha de caducidad**: NO poner ninguna fecha (dejar vacío)

4. **PESTAÑA LÍMITES DE USO**: Configurar límites
   - **Límite de uso por cupón**: Dejar vacío (sin límite)
   - **Límite de uso por usuario**: Dejar vacío (sin límite)
   - **Límite de artículos X (número de artículos)**: Dejar vacío

5. **PESTAÑA RESTRICCIONES DE USO**:
   - Dejar todo vacío (no poner restricciones)

6. Click en **Publicar** el cupón
7. Repetir para cada nivel (BRONCE, PLATA, ORO, PLATINO)

## ⚠️ IMPORTANTE

- Los códigos deben ser **EXACTAMENTE** como están escritos (con guiones bajos y mayúsculas)
- El importe debe ser **0** porque la app calculará y aplicará el monto dinámicamente
- **NO poner fecha de caducidad** - estos cupones son permanentes
- **NO poner límites de uso** - dejar los campos de límites vacíos
- **NO poner restricciones** - dejar las restricciones vacías

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
