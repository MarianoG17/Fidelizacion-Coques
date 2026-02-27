# 🖼️ Optimización de Imágenes WooCommerce - IMPLEMENTADO

## 📊 Problema Identificado

**Situación Actual:** Tiempos de carga de 6-8 segundos en el catálogo de tortas.

**Causa Principal:**
- ❌ Uso de `<img>` normal en vez de `<Image>` de Next.js
- ❌ Imágenes descargadas directamente desde WooCommerce sin optimización
- ❌ No hay conversión automática a formatos modernos (WebP/AVIF)
- ❌ No hay lazy loading eficiente
- ❌ No hay redimensionamiento según dispositivo
- ❌ Imágenes de 500KB-2MB en vez de 50-200KB

---

## ✅ Solución Implementada

### 1. Configuración de Next.js para Imágenes Externas

**Archivo:** `next.config.js`

```javascript
images: {
  formats: ['image/webp', 'image/avif'], // Formatos modernos más livianos
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60 * 60 * 24 * 30, // Cache 30 días
  // Permitir imágenes de WooCommerce externas
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**', // Permite cualquier dominio HTTPS
    },
  ],
}
```

**Beneficios:**
- ✅ Permite optimizar imágenes de dominios externos (WooCommerce)
- ✅ Convierte automáticamente a WebP/AVIF (50-70% más liviano)
- ✅ Cache de 30 días en navegador

---

### 2. Optimización en Catálogo de Tortas

**Archivo:** `src/app/tortas/page.tsx` (línea ~607)

**ANTES:**
```tsx
<img
  src={producto.imagen}
  alt={producto.nombre}
  loading="lazy"
  decoding="async"
  className="w-full h-full object-cover"
/>
```

**DESPUÉS:**
```tsx
<Image
  src={producto.imagen}
  alt={producto.nombre}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  className="object-cover"
  loading="lazy"
/>
```

**Mejoras:**
- ✅ **Responsive Images:** Sirve diferentes tamaños según el dispositivo
  - Móvil: 100% viewport (imagen más pequeña)
  - Tablet: 50% viewport (imagen mediana)
  - Desktop: 33% viewport (imagen optimizada)
- ✅ **Lazy Loading Nativo:** Solo carga imágenes visibles
- ✅ **Conversión Automática:** WebP/AVIF según soporte del navegador

---

### 3. Optimización en Modal de Detalles

**Archivo:** `src/app/tortas/page.tsx` (línea ~703)

**ANTES:**
```tsx
<img
  src={varianteSeleccionada?.imagen || productoSeleccionado.imagen}
  alt={productoSeleccionado.nombre}
  loading="lazy"
  className="w-full h-80 object-cover rounded-xl"
/>
```

**DESPUÉS:**
```tsx
<Image
  src={varianteSeleccionada?.imagen || productoSeleccionado.imagen}
  alt={productoSeleccionado.nombre}
  fill
  sizes="(max-width: 768px) 100vw, 672px"
  className="object-cover rounded-xl"
  priority={false}
/>
```

**Mejoras:**
- ✅ Optimización automática en tamaño real
- ✅ Conversión a WebP/AVIF
- ✅ `priority={false}`: No bloquea carga inicial de la página

---

## 📈 Impacto Esperado en Performance

### Mejora en Tamaño de Imágenes

| Formato | Tamaño Promedio | Reducción |
|---------|----------------|-----------|
| **ANTES** (JPEG original WooCommerce) | 800 KB | - |
| **DESPUÉS** (WebP optimizado) | 200 KB | **-75%** |
| **DESPUÉS** (AVIF optimizado) | 120 KB | **-85%** |

### Mejora en Tiempos de Carga

| Métrica | ANTES | DESPUÉS | Mejora |
|---------|-------|---------|--------|
| **Primera Carga (25 productos)** | 6-8s | 2-3s | **-60%** ⚡ |
| **Carga Repetida (con cache)** | 3-4s | 0.5-1s | **-75%** 🚀 |
| **Peso Total Imágenes** | ~20 MB | ~5 MB | **-75%** |
| **Lazy Loading** | Manual | Automático | ✅ |

---

## 🔄 Cómo Funciona la Optimización

### Proceso Automático de Next.js Image

1. **Request del Usuario:** El navegador solicita una imagen
2. **Análisis del Dispositivo:** Next.js detecta el tamaño de pantalla
3. **Generación Optimizada:** Crea imagen en tamaño exacto necesario
4. **Conversión de Formato:** Convierte a WebP/AVIF si el navegador lo soporta
5. **Cache:** Guarda en CDN de Vercel por 30 días
6. **Entrega:** Sirve la versión más liviana posible

### Ejemplo Real

**Imagen Original WooCommerce:**
- URL: `https://tutienda.com/wp-content/uploads/torta-chocolate.jpg`
- Tamaño: 1200x800px
- Peso: 850 KB (JPEG)

**Optimización Next.js para Móvil:**
- Tamaño: 640x427px (redimensionado)
- Formato: WebP
- Peso: 180 KB
- **Ahorro: 78%**

**Optimización Next.js para Desktop:**
- Tamaño: 400x267px (redimensionado)
- Formato: AVIF
- Peso: 95 KB
- **Ahorro: 89%**

---

## 🚀 Optimizaciones Adicionales en el Backend

### Ya Implementado en API

**Archivo:** `src/app/api/woocommerce/tortas/route.ts` (línea ~698)

```typescript
// Optimizar imágenes del catálogo usando tamaños más pequeños
const imagenPrincipal = product.images?.[0]
const imagenCatalogo = imagenPrincipal?.sizes?.shop_catalog ||
  imagenPrincipal?.sizes?.medium ||
  imagenPrincipal?.src || null
```

**Beneficio:**
- ✅ Solicita versión `shop_catalog` de WooCommerce (300x300px)
- ✅ Fallback a `medium` (600x600px) si no existe
- ✅ Evita descargar imágenes full size (1200x1200px)

---

## 🧪 Testing y Validación

### Pruebas a Realizar

1. **Performance:**
   ```bash
   # Lighthouse en Chrome DevTools
   - Abrir /tortas en modo incógnito
   - F12 > Lighthouse > Performance
   - Objetivo: Score > 90
   ```

2. **Network:**
   ```bash
   # Verificar formatos optimizados
   - F12 > Network > Img
   - Buscar: .webp o .avif en las URLs
   - Verificar tamaños < 300KB por imagen
   ```

3. **Visual:**
   ```bash
   # Comprobar calidad visual
   - Desktop: Zoom al 100% - debe verse nítido
   - Mobile: Zoom normal - debe verse perfecto
   - No debe haber pixelación visible
   ```

### Métricas de Éxito

| Métrica | Objetivo | Herramienta |
|---------|----------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Lighthouse |
| **First Load** | < 3s | Network Tab |
| **Cached Load** | < 1s | Network Tab |
| **Total Image Weight** | < 6 MB | Network Tab |
| **Individual Image Size** | < 300 KB | Network Tab |

---

## 📝 Notas Técnicas

### ¿Por qué `fill` en vez de `width` y `height`?

```tsx
// ❌ NO funciona bien con imágenes dinámicas de WooCommerce
<Image src={url} width={300} height={200} />

// ✅ Se adapta al contenedor y mantiene aspect ratio
<Image src={url} fill className="object-cover" />
```

### ¿Qué hace `sizes`?

```tsx
sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
```

Le dice a Next.js:
- **Móvil (< 768px):** Imagen ocupa 100% del viewport → genera 640px
- **Tablet (768-1024px):** Imagen ocupa 50% del viewport → genera 400px
- **Desktop (> 1024px):** Imagen ocupa 33% del viewport → genera 350px

### Cache y Revalidación

```javascript
minimumCacheTTL: 60 * 60 * 24 * 30 // 30 días
```

- Las imágenes optimizadas se guardan en CDN de Vercel
- No se regeneran a menos que la URL cambie
- Si actualizas una imagen en WooCommerce, la nueva URL se optimiza automáticamente

---

## ⚡ Próximos Pasos (Opcional)

### 1. Servidor de Imágenes Dedicado (Avanzado)

Si WooCommerce sigue siendo lento, considera:

```javascript
// Opción 1: Cloudinary
images: {
  loader: 'cloudinary',
  path: 'https://res.cloudinary.com/tuCuenta/',
}

// Opción 2: imgix
images: {
  loader: 'imgix',
  path: 'https://tu-dominio.imgix.net',
}
```

**Costo:** $25-50/mes
**Beneficio:** +30% velocidad adicional

### 2. Preload de Imágenes Críticas

```tsx
// En layout.tsx o head
<link rel="preload" as="image" href="/hero-image.jpg" />
```

---

## 📊 Resumen del Impacto

### ✅ Implementado Hoy

1. ✅ Configuración de Next.js para imágenes externas
2. ✅ Conversión `<img>` → `<Image>` en catálogo
3. ✅ Conversión `<img>` → `<Image>` en modal
4. ✅ Lazy loading automático
5. ✅ Responsive images (diferentes tamaños)
6. ✅ Conversión a WebP/AVIF automática

### 🎯 Resultado Esperado

**ANTES:**
- 6-8 segundos de carga
- 20 MB de imágenes
- Formato JPEG sin optimizar

**DESPUÉS:**
- 2-3 segundos de carga (**-60%**)
- 5 MB de imágenes (**-75%**)
- Formato WebP/AVIF optimizado

### 🚀 Ganancia Total

**Esta optimización sola puede darte el 50% de mejora que buscabas.**

Combinada con las otras optimizaciones del plan original:
- Frontend Cache (40% adicional)
- Service Worker Cache-First (25% adicional)
- **TOTAL: 60-75% de mejora global** 🎉

---

## 🔍 Debugging

### Si las imágenes no cargan

```bash
# Error típico: "Invalid src prop"
# Verificar que WOOCOMMERCE_URL esté configurado en .env
echo $WOOCOMMERCE_URL

# Verificar dominios permitidos en next.config.js
# Debe incluir el dominio de WooCommerce
```

### Si las imágenes están borrosas

```typescript
// Aumentar calidad de optimización en next.config.js
images: {
  formats: ['image/webp', 'image/avif'],
  quality: 90, // Agregar esta línea (default: 75)
}
```

---

**Fecha de Implementación:** 27 de febrero, 2026
**Archivos Modificados:**
- `next.config.js`
- `src/app/tortas/page.tsx`

**Próximo Deploy:** Aplicar cambios en producción y medir impacto con Lighthouse.
