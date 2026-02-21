# Cambios en Torta Temática - 21 Feb 2026

## 🎯 Problemas Resueltos

### 1. ✅ Opciones de Add-ons No Clickeables
**Problema:** Los radio buttons y checkboxes de la torta temática no eran clickeables.

**Causa:** Los IDs virtuales (9001, 9002, etc.) estaban definidos pero faltaba la descripción en la interfaz de `ADICIONALES_AGRUPADOS`.

**Solución:**
- Agregado campo `descripcion` opcional en la interfaz de `ADICIONALES_AGRUPADOS`
- Actualizada la renderización para usar `grupo.descripcion` en los add-ons
- Agregado ID 9003 para "Color de cubierta (especificar)"

**Archivos modificados:**
- [`src/app/api/woocommerce/tortas/route.ts`](src/app/api/woocommerce/tortas/route.ts): Líneas 122-128, 623-630

---

### 2. ✅ Reorganización de Campos de Cubierta

**Cambio:** Separar "Tipo de cubierta" del campo "Color de la cubierta"

**Antes:**
```
- Campo texto: "Color de la cubierta" (siempre visible)
```

**Ahora:**
```
- Radio: "Tipo de cubierta" (Buttercream / Ganache) - REQUERIDO
- Checkbox: "Color de la cubierta (solo para Buttercream)" - OPCIONAL
```

**Lógica:**
- Si elige **Buttercream**: debe especificar color (rosa, azul, etc.)
- Si elige **Ganache**: no hay opción de color (siempre chocolate)

**Archivos modificados:**
- [`src/app/api/woocommerce/tortas/route.ts`](src/app/api/woocommerce/tortas/route.ts): Líneas 366-389

---

### 3. ✅ Descuentos por Nivel Deshabilitados para Torta Temática

**Problema:** La torta temática (SKU 20) mostraba descuentos por nivel (5% Bronce, 10% Plata, etc.)

**Requisito:** Las tortas temáticas NO deben tener descuento, independientemente del nivel del cliente.

**Solución:**
- Detecta si el producto tiene campos personalizados con "temática" en el nombre
- Si es torta temática: `descuentoPorcentaje = 0`
- Si NO es torta temática: aplica descuento normal según nivel

**Archivos modificados:**
- [`src/app/tortas/page.tsx`](src/app/tortas/page.tsx): Líneas 360-368
- [`src/app/carrito/page.tsx`](src/app/carrito/page.tsx): Líneas 313-322

**Código clave:**
```typescript
// Verificar si es Torta Temática
const esTortaTematica = productoSeleccionado?.camposTexto?.some(campo => 
  campo.nombre.toLowerCase().includes('temática')
) || false

// NO aplicar descuento si es torta temática
const porcentajeDescuento = esTortaTematica ? 0 : (nivelCliente?.descuento || 0)
```

---

### 4. ✅ Limpieza de Carrito al Cambiar Cliente (Modo Staff)

**Problema:** Al tomar un nuevo pedido en modo staff, el carrito mantenía productos del cliente anterior.

**Solución:**
- Al iniciar un nuevo pedido (página `/local/tomar-pedido`), se limpia el `localStorage` del carrito
- Esto asegura que cada cliente tenga un carrito limpio

**Archivos modificados:**
- [`src/app/local/tomar-pedido/page.tsx`](src/app/local/tomar-pedido/page.tsx): Líneas 53-56

**Código:**
```typescript
// Limpiar carrito anterior antes de iniciar un nuevo pedido
localStorage.removeItem('fidelizacion_carrito')
```

---

## 📋 Campos Finales de Torta Temática

### Campos de Texto Personalizados
1. **Nombre del cumpleañero** (opcional)
2. **Años que cumple** (opcional)
3. **Temática** (requerido) - Ej: Unicornio, Frozen, Fútbol
4. **Mensaje en la torta** (requerido)
5. **URL Imagen Referencia** (requerido)
6. **Referencia de la imagen** (requerido) - Descripción de colores, texto, estilo

### Add-ons (Radio/Checkbox)
1. **Tipo de cubierta** (radio, requerido)
   - Buttercream
   - Ganache de chocolate

2. **Color de la cubierta** (checkbox, opcional)
   - Solo si se eligió Buttercream
   - Campo de texto para especificar color

3. **Relleno Capa 1, 2 y 3** (radio, requerido cada uno)
   - Dulce de leche
   - Chocolate
   - Nutella
   - Crema con oreos trituradas
   - Rocklets
   - Merenguitos
   - Chips de chocolate
   - Nueces

4. **Bizcochuelo** (radio, requerido)
   - Vainilla
   - Chocolate
   - Colores

5. **Cookies Temáticas** (checkbox, opcional)
6. **Macarons** (checkbox, opcional)
   - 6 sabores disponibles
7. **Flores Astromelias** (checkbox, opcional)

---

## 🎨 Experiencia de Usuario

### Modo Normal (Cliente con Cuenta)
- ✅ Ve todos los productos con descuento según su nivel
- ❌ **Excepto Torta Temática**: Sin descuento

### Modo Staff (Sin Cuenta)
- ✅ Inicia pedido con datos del cliente (nombre, teléfono)
- ✅ Carrito se limpia automáticamente al cambiar de cliente
- ✅ Precio estándar (sin descuentos)

---

## 🧪 Testing Recomendado

### Test 1: Descuento
1. Login como cliente Bronce
2. Agregar torta clásica → Debe mostrar 5% descuento
3. Agregar torta temática → NO debe mostrar descuento
4. Ir al carrito → Verificar que solo hay descuento si NO tiene torta temática

### Test 2: Carrito en Modo Staff
1. `/local` → "📝 Pedido"
2. Ingresar Cliente A
3. Agregar productos al carrito
4. Volver a `/local`
5. "📝 Pedido" → Ingresar Cliente B
6. Verificar que el carrito esté vacío

### Test 3: Campos de Cubierta
1. Abrir Torta Temática
2. Seleccionar "Buttercream" → Debe aparecer opción de color
3. Seleccionar "Ganache" → Color opcional (no requerido)
4. Completar formulario y agregar al carrito
5. Verificar en el pedido que se envíen correctamente los datos

---

## 📝 Notas Técnicas

### IDs Virtuales (Sin SKU en WooCommerce)
Los siguientes IDs son virtuales y solo van a comentarios:
- 9001: Buttercream
- 9002: Ganache de chocolate
- 9003: Color de cubierta (especificar)
- 9101-9104: Rellenos base
- 9201-9202: Bizcochuelos
- 9301: Cookies
- 9401-9406: Macarons
- 9501: Flores Astromelias

### Detección de Torta Temática
El sistema detecta torta temática buscando la palabra "temática" en los campos personalizados:
```typescript
const esTortaTematica = productoSeleccionado?.camposTexto?.some(campo => 
  campo.nombre.toLowerCase().includes('temática')
)
```

---

**Última actualización:** 21 de Febrero de 2026
