# 🎨 CONFIGURAR TORTA TEMÁTICA BUTTERCREAM (SKU 20)

## ❗ PROBLEMA ACTUAL

El producto **"Torta Temática Buttercream" (SKU 20)** no aparece en `/tortas` porque:
- No está asignado a la categoría **"tortas clasicas"** en WooCommerce
- El API [`/api/woocommerce/tortas`](fidelizacion-zona/src/app/api/woocommerce/tortas/route.ts:238) solo muestra productos de esa categoría

## 📝 PASOS PARA HACERLO VISIBLE

### 1. En WooCommerce Admin

1. Ir a: **Productos → Todos los productos**
2. Buscar el producto con **SKU: 20** ("Torta Temática Buttercream")
3. Hacer clic para editar
4. En el panel derecho, sección **"Categorías"**:
   - ✅ Marcar: **"Tortas Clasicas"** (o "tortas clasicas")
5. Guardar cambios
6. **IMPORTANTE:** Anotar el **ID del producto** (aparece en la URL, ej: `post=XXX`)

### 2. Actualizar Código con el ID

Una vez que tengas el ID de WooCommerce del producto, actualizar estos archivos:

#### A. Archivo: `src/app/api/woocommerce/tortas/route.ts`

**Línea ~130 - Campos de texto personalizados:**

Reemplazar `XXX` con el ID real de WooCommerce:

```typescript
const CAMPOS_TEXTO_POR_PRODUCTO: { [key: number]: { nombre: string; placeholder: string; requerido: boolean }[] } = {
  764: [ // Torta Doble Oreo con Golosinas
    { nombre: 'Color de decoración', placeholder: 'Ej: Rosa, Celeste, Multicolor...', requerido: false }
  ],
  XXX: [ // Torta Temática Buttercream (SKU 20) - REEMPLAZAR XXX con ID real
    { nombre: 'Color de Decoración', placeholder: 'Ej: Rosa pastel, Azul bebé, Multicolor...', requerido: true },
    { nombre: 'Temática', placeholder: 'Ej: Unicornio, Frozen, Fútbol, Princesas...', requerido: true },
    { nombre: 'Mensaje en la torta', placeholder: 'Ej: Feliz cumpleaños María', requerido: true },
    { nombre: 'URL foto referencia', placeholder: 'Pegar link de Google Drive, Dropbox, etc.', requerido: true }
  ],
}
```

**Línea ~82 - Add-ons agrupados:**

Reemplazar `XXX` con el ID real de WooCommerce:

```typescript
const ADICIONALES_AGRUPADOS: { [key: number]: { nombre: string; tipo: 'radio' | 'checkbox'; requerido: boolean; opciones: { sku: string }[] }[] } = {
  764: [ // Torta Doble Oreo
    // ... configuración existente ...
  ],
  XXX: [ // Torta Temática Buttercream (SKU 20) - REEMPLAZAR XXX con ID real
    {
      nombre: 'Relleno',
      tipo: 'radio',
      requerido: true,
      opciones: [
        { sku: '467' }, // Relleno de Dulce de Leche
        { sku: '466' }, // Relleno de Chocolate
        { sku: '300' }, // Relleno de Nutella
        { sku: '376' }, // Relleno Frutos Rojos
        { sku: '375' }, // Relleno Maracuyá
        { sku: '263' }, // Relleno Frutilla
        { sku: '367' }, // Relleno Limón
        { sku: '257' }, // Relleno Dulce de Leche (variante)
        { sku: '314' }  // Relleno Crema Pastelera
      ]
    },
    {
      nombre: 'Bizcochuelo',
      tipo: 'radio',
      requerido: true,
      opciones: [
        { sku: '399' }, // Vainilla
        { sku: '398' }, // Chocolate
        { sku: '461' }  // Marmolado
      ]
    },
    {
      nombre: 'Cookies Temáticas',
      tipo: 'checkbox',
      requerido: false,
      opciones: [
        { sku: '31' }  // Cookies Temáticas (6 unidades)
      ]
    },
    {
      nombre: 'Macarons',
      tipo: 'checkbox',
      requerido: false,
      opciones: [
        { sku: '469' }, // Macaron Chocolate
        { sku: '254' }, // Macaron Frutos Rojos
        { sku: '256' }, // Macaron Dulce de Leche
        { sku: '255' }, // Macaron Limón
        { sku: '253' }, // Macaron Vainilla
        { sku: '84' }   // Macaron Frutilla
      ]
    }
  ]
}
```

### 3. Deploy

```bash
git add src/app/api/woocommerce/tortas/route.ts
git commit -m "feat: Agregar configuración para Torta Temática Buttercream (SKU 20)"
git push origin main
```

---

## 🔍 CÓMO ENCONTRAR EL ID EN WOOCOMMERCE

### Opción 1: Desde la Lista de Productos
1. Ir a **Productos → Todos los productos**
2. Buscar "Torta Temática Buttercream" o filtrar por SKU "20"
3. **Pasar el mouse** sobre el nombre del producto (NO hacer clic)
4. En la esquina inferior izquierda del navegador aparecerá una URL como:
   ```
   https://tutienda.com/wp-admin/post.php?post=123&action=edit
   ```
5. El número después de `post=` es el ID (en este ejemplo: **123**)

### Opción 2: Desde la Edición del Producto
1. Editar el producto
2. Mirar la **barra de direcciones** del navegador:
   ```
   https://tutienda.com/wp-admin/post.php?post=123&action=edit
   ```
3. El número después de `post=` es el ID (en este ejemplo: **123**)

### Opción 3: Usando WooCommerce API (Terminal)
```bash
curl -X GET "https://TU-TIENDA.com/wp-json/wc/v3/products?sku=20" \
  -u "CONSUMER_KEY:CONSUMER_SECRET"
```

El campo `"id"` en la respuesta JSON es el ID de WooCommerce.

---

## ✅ VERIFICACIÓN

Después de hacer los cambios:

1. **Limpiar caché:** El API tiene caché de 2 horas. Para forzar recarga:
   - Opción A: Esperar 2 horas
   - Opción B: Reiniciar Vercel (re-deploy)
   - Opción C: Agregar `?nocache=true` a la URL: `/tortas?nocache=true`

2. **Verificar que aparece:**
   - Ir a `/tortas` (modo cliente) o `/tortas?modo=staff` (modo staff)
   - La Torta Temática Buttercream debe aparecer en la lista
   - Al hacer clic debe mostrar:
     - Opciones de Relleno (radio buttons)
     - Opciones de Bizcochuelo (radio buttons)
     - Opciones de Cookies (checkboxes)
     - Opciones de Macarons (checkboxes)
     - 4 campos de texto obligatorios

3. **Test completo:**
   - Seleccionar opciones
   - Completar los 4 campos de texto
   - Agregar al carrito
   - Verificar en carrito que todo se vea correcto
   - Hacer un pedido de prueba
   - Verificar en WooCommerce que llegó con todas las opciones

---

## 📊 CAMPOS Y OPCIONES COMPLETAS

### Campos de Texto (Obligatorios)
1. **Color de Decoración**
   - Ejemplo: "Rosa pastel", "Azul bebé", "Multicolor"
   
2. **Temática**
   - Ejemplo: "Unicornio", "Frozen", "Fútbol", "Princesas"
   
3. **Mensaje en la torta**
   - Ejemplo: "Feliz cumpleaños María"
   
4. **URL foto referencia**
   - Ejemplo: "https://drive.google.com/file/d/..."
   - **Fase 1:** Staff pega link de Google Drive/Dropbox
   - **Fase 2 (futuro):** Upload directo a Cloudinary

### Add-ons (Line Items Separados)

#### Relleno (Radio - Obligatorio)
- Dulce de Leche (SKU 467)
- Chocolate (SKU 466)
- Nutella (SKU 300)
- Frutos Rojos (SKU 376)
- Maracuyá (SKU 375)
- Frutilla (SKU 263)
- Limón (SKU 367)
- Dulce de Leche variante (SKU 257)
- Crema Pastelera (SKU 314)

#### Bizcochuelo (Radio - Obligatorio)
- Vainilla (SKU 399)
- Chocolate (SKU 398)
- Marmolado (SKU 461)

#### Cookies Temáticas (Checkbox - Opcional)
- Cookies Temáticas 6 unidades (SKU 31)

#### Macarons (Checkbox - Opcional)
- Macaron Chocolate (SKU 469)
- Macaron Frutos Rojos (SKU 254)
- Macaron Dulce de Leche (SKU 256)
- Macaron Limón (SKU 255)
- Macaron Vainilla (SKU 253)
- Macaron Frutilla (SKU 84)

---

## 🚨 IMPORTANTE

1. **Categoría correcta:** El producto DEBE estar en "Tortas Clasicas" o no aparecerá
2. **Estado publicado:** El producto debe estar en estado "Publicado" (no borrador)
3. **Stock:** Si tiene gestión de stock, debe tener unidades disponibles
4. **Visibilidad:** El producto debe ser visible en el catálogo

---

## 🛠️ TROUBLESHOOTING

### "No veo el producto después de agregarlo a la categoría"
- Esperar 2 horas (caché del API) o hacer re-deploy
- Verificar que el estado sea "Publicado"
- Verificar que tenga precio configurado

### "Los campos de texto no aparecen"
- Verificar que el ID en `CAMPOS_TEXTO_POR_PRODUCTO` coincida con el ID real
- Hacer commit y push del código modificado
- Esperar que Vercel complete el deploy

### "Los add-ons no aparecen"
- Verificar que el ID en `ADICIONALES_AGRUPADOS` coincida con el ID real
- Verificar que los productos con esos SKUs existan en WooCommerce
- Verificar que estén publicados y con precio

### "Error al agregar al carrito"
- Abrir consola del navegador (F12)
- Revisar errores en la pestaña "Console"
- Verificar que todos los campos obligatorios estén completos

---

## 📝 RESUMEN DE CAMBIOS

| Paso | Acción | Dónde |
|------|--------|-------|
| 1 | Asignar a categoría | WooCommerce → Producto SKU 20 → Categorías |
| 2 | Obtener ID | URL al editar producto |
| 3 | Actualizar código | `tortas/route.ts` líneas 82 y 130 |
| 4 | Deploy | Git commit + push |
| 5 | Verificar | `/tortas` en la app |

---

**Fecha:** 21 de Febrero 2026  
**Objetivo:** Hacer visible la Torta Temática Buttercream para pedidos staff  
**Estado:** Pendiente de configuración manual en WooCommerce
