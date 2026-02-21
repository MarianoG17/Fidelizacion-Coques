# Cambios Torta Temática (SKU 20)

## Última actualización: 2026-02-21

## Cambios Implementados

### 1. **Tipo de cubierta** - Opciones actualizadas
- ✅ Buttercream
- ✅ Ganache Negro (antes: "Ganache de chocolate")
- ✅ Ganache Blanco (NUEVO)

### 2. **Color de la cubierta** - Campo obligatorio
- ✅ Ahora es **obligatorio** completar este campo
- ✅ Solo aparece si se selecciona **Buttercream**
- ✅ Si se selecciona Ganache (Negro o Blanco), el campo no se muestra

### 3. **Rellenos** - Estructura por capas
Cada capa (1, 2, 3) tiene:
- **Base (radio, requerido)**:
  - Dulce de leche (sin costo)
  - Chocolate (+$3600)
  - Nutella (+$6200)
- **Extras (checkbox, opcional)**:
  - Oreos trituradas (+$2400)
  - Rocklets (sin costo)
  - Merenguitos (sin costo)
  - Chips de chocolate (sin costo)
  - Nueces (sin costo)

### 4. **Bizcochuelo** - Opciones
- Vainilla (sin costo)
- Chocolate (sin costo)
- Colores (+$2400)

### 5. **Colores del Bizcochuelo** - Condicional
- ✅ Solo aparece si se selecciona "Bizcochuelo Colores"
- ✅ Máximo 4 colores seleccionables
- Opciones: Verde, Amarillo, Naranja, Rojo, Celeste, Violeta

### 6. **Cookies Temáticas** - Campo cantidad
- ✅ Campo "Cantidad de Cookies Temáticas" agregado
- ✅ Solo aparece si se tildan las Cookies Temáticas

### 7. **Macarons** - Sabores actualizados
Todos a $2800 c/u:
- Macarrón de Dulce de Leche
- Macarrón Pistacho
- Macarrón Limón
- Macarrón Frambuesa
- Macarrón Chocolate Blanco
- Macarrón Chocolate Negro

### 8. **Sistema de descuentos**
- ✅ Las tortas temáticas NO reciben descuento por nivel
- ✅ Se paga precio completo independientemente del nivel del cliente
- ✅ Cálculo de descuento con useMemo para reactividad correcta

### 9. **Modo Staff**
- ✅ Carrito se limpia al cambiar de cliente
- ✅ Tortas temáticas no tienen descuento en pedidos staff

---

## ⚠️ PENDIENTE: Actualización en WooCommerce

### Información del producto SKU 20 que debe actualizarse manualmente:

**Descripción corta actualizada:**
```
18cm de diámetro x 15cm de alto
Rendimiento: 25 a 30 porciones medianas
```

**Dónde actualizar:**
1. Ir a WooCommerce > Productos
2. Buscar producto SKU "20" (Torta Temática Buttercream)
3. En "Descripción corta", actualizar con el texto de arriba
4. Guardar cambios

---

## Archivos Modificados

### Backend (API)
- `src/app/api/woocommerce/tortas/route.ts`
  - Actualizado PRODUCTOS_SIN_SKU con nombres ganache
  - Campo "Color de la cubierta" ahora obligatorio
  - Campo "Cantidad de Cookies Temáticas" agregado
  - Opciones de ganache: Negro y Blanco

### Frontend
- `src/app/tortas/page.tsx`
  - Lógica condicional para "Colores del Bizcochuelo"
  - Lógica condicional para "Color de la cubierta"
  - Lógica condicional para "Cantidad de Cookies"

- `src/app/carrito/page.tsx`
  - Cálculos de descuento con useMemo para reactividad
  - Fix: descuento se recalcula correctamente al eliminar productos

### Hooks
- `src/hooks/useCarrito.ts`
  - Interfaz ItemCarrito actualizada con nuevo formato add-ons

---

## Testing Recomendado

1. ✅ Verificar que colores de bizcochuelo solo aparezcan con "Bizcochuelo Colores"
2. ✅ Verificar que color de cubierta solo aparezca con "Buttercream"
3. ✅ Verificar que campo cantidad cookies solo aparezca si se tildan cookies
4. ✅ Verificar que todos los precios se sumen correctamente
5. ✅ Verificar que torta temática NO tenga descuento
6. ✅ Verificar que descuento se recalcule al eliminar productos del carrito
7. ⏳ Verificar descripción actualizada en el catálogo (pendiente WooCommerce)

---

## Notas Técnicas

### IDs de productos sin SKU (PRODUCTOS_SIN_SKU):
- 9001: Buttercream
- 9002: Ganache Negro  
- 9003: Ganache Blanco
- 9101-9104: Rellenos base y extras
- 9201-9202: Bizcochuelos
- 9211-9216: Colores bizcochuelo
- 9301: Cookies temáticas
- 9401-9406: Macarons
- 9501: Flores Astromelias

### Identificador único de add-ons:
```typescript
const id = sku || wooId?.toString() || etiqueta
```

Este sistema permite trabajar con productos que tienen SKU y productos virtuales sin SKU.
