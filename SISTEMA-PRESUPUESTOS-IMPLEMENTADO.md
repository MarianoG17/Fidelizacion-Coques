# Sistema de Presupuestos/Cotizaciones - Implementación Completa

## 📋 Resumen

Se implementó exitosamente un sistema completo de presupuestos/cotizaciones que permite a staff y clientes guardar pedidos incompletos, consultarlos posteriormente, y confirmarlos para generar pedidos en WooCommerce.

## ✅ Componentes Implementados

### 1. Base de Datos

**Modelo Presupuesto** agregado a Prisma Schema:
- **Campos principales:**
  - `codigo`: Código único autogenerado (ej: PRE-12ABC34-5DEF67)
  - `clienteId`: Relación opcional con cliente
  - `nombreCliente`, `telefonoCliente`, `emailCliente`: Datos de contacto
  - `items`: JSON con productos y configuraciones
  - `precioTotal`, `descuento`: Montos calculados
  - `fechaEntrega`, `horaEntrega`: Datos de entrega
  - `estado`: PENDIENTE | COMPLETO | CONFIRMADO | CANCELADO
  - `wooOrderId`: ID del pedido WooCommerce una vez confirmado
  - `camposPendientes`: JSON con campos que faltan completar
  - `notasCliente`, `notasInternas`: Observaciones
  - `creadoPor`: Identificador de quién creó el presupuesto

**Migración:**
- Base de datos actualizada con `prisma db push`
- Cliente Prisma regenerado automáticamente

### 2. APIs Implementadas

#### POST `/api/presupuestos`
- Crear nuevo presupuesto
- Genera código único automáticamente
- Soporta modo staff y modo cliente

#### GET `/api/presupuestos/:codigo`
- Obtener presupuesto específico por código
- Incluye datos del cliente y nivel

#### PATCH `/api/presupuestos/:codigo`
- Actualizar presupuesto existente
- No permite modificar presupuestos confirmados

#### DELETE `/api/presupuestos/:codigo`
- Cancelar presupuesto (cambio de estado, no eliminación)

#### POST `/api/presupuestos/:codigo/confirmar`
- Confirmar presupuesto y crear pedido en WooCommerce
- Convierte items del presupuesto en line_items de WooCommerce
- Actualiza estado a CONFIRMADO
- Guarda `wooOrderId` para referencia

#### GET `/api/admin/presupuestos`
- Listar todos los presupuestos (para admin)
- Filtros: estado, búsqueda, rango de fechas
- Paginación
- Estadísticas agregadas

### 3. Interfaz de Usuario

#### Carrito de Compras (modificado)
**Archivo:** `src/app/carrito/page.tsx`

**Nuevo botón "Guardar como Presupuesto":**
- Ubicado arriba del botón "Realizar Pedido"
- Guarda el estado actual del carrito
- No requiere completar todos los campos obligatorios
- Funciona tanto en modo staff como cliente

**Modal de confirmación:**
- Muestra código de presupuesto generado
- Botón para copiar código al portapapeles
- Botón para ver presupuesto directamente

**Función `guardarComoPresupuesto()`:**
```typescript
- Obtiene datos del cliente (staff o normal)
- Serializa items del carrito con add-ons y campos personalizados
- Calcula precios con descuentos aplicados
- Envía a API de presupuestos
- Muestra modal con código generado
```

#### Página de Presupuesto
**Archivo:** `src/app/presupuestos/[codigo]/page.tsx`

**Características:**
- Vista completa del presupuesto
- Estado visual con colores e iconos
- Desglose de productos con add-ons y personalizaciones
- Información del cliente y entrega
- Resumen de precios
- Botón "Confirmar Presupuesto" (si no está confirmado)
- Información de pedido WooCommerce (si está confirmado)

**Estados visuales:**
- 🟡 PENDIENTE: Amarillo
- 🔵 COMPLETO: Azul
- 🟢 CONFIRMADO: Verde
- 🔴 CANCELADO: Rojo

### 4. Flujos de Trabajo

#### Flujo Staff (Atención al Cliente)
1. Staff toma pedido de cliente
2. Agrega productos con personalizaciones
3. Si falta información o cliente quiere pensarlo:
   - Click en "Guardar como Presupuesto"
   - Sistema genera código único
   - Se guarda con datos del cliente
4. Posteriormente, staff o cliente puede:
   - Ingresar a `/presupuestos/CODIGO`
   - Completar información faltante (si hay)
   - Confirmar para generar pedido WooCommerce

#### Flujo Cliente Autónomo
1. Cliente navega catálogo de tortas
2. Configura su pedido personalizado
3. Si no está seguro o quiere consultar:
   - Click en "Guardar como Presupuesto"
   - Recibe código para consultar después
4. Cliente puede volver más tarde con el código
5. Confirma cuando esté listo

### 5. Integración con WooCommerce

**Al confirmar presupuesto:**
1. Se construye objeto `order` de WooCommerce
2. Se convierten items con add-ons a `line_items` y `meta_data`
3. Se agregan campos personalizados como meta data
4. Se incluyen fecha/hora de entrega
5. Se crean notas del pedido
6. Se marca con meta `_presupuesto_codigo` para trazabilidad
7. Se actualiza presupuesto con `wooOrderId`

## 📊 Estructura de Datos

### Item de Presupuesto
```json
{
  "productoId": 123,
  "varianteId": 456,
  "nombre": "Torta Temática",
  "cantidad": 1,
  "precio": 15000,
  "precioAddOns": 3600,
  "addOns": {
    "Tipo de cubierta": [
      { "sku": "9001", "etiqueta": "Buttercream", "id": "9001" }
    ],
    "Relleno Base Capa 1": [
      { "sku": "9101", "etiqueta": "Dulce de leche", "id": "9101" }
    ]
  },
  "camposTexto": {
    "Temática": "Unicornio",
    "Color de la cubierta": "Rosa pastel",
    "Tamaño de letra": "Grande"
  },
  "rendimiento": "25 a 30 porciones"
}
```

### Código de Presupuesto
Formato: `PRE-{timestamp_base36}-{random_hex}`
Ejemplo: `PRE-12ABC34-5DEF67`

- Único e identificable
- Fácil de comunicar por teléfono
- Corto pero seguro

## 🎯 Casos de Uso

### 1. Cliente Indeciso
- Configura torta pero quiere consultar precio con familia
- Guarda presupuesto
- Comparte código con familiares
- Confirman juntos más tarde

### 2. Información Incompleta
- Cliente no tiene fecha de entrega definida
- Staff guarda presupuesto con items
- Marca `camposPendientes` en JSON
- Cliente llama después con fecha
- Staff completa y confirma

### 3. Comparación de Opciones
- Cliente prueba diferentes configuraciones
- Guarda múltiples presupuestos
- Compara precios y características
- Confirma el que prefiere

### 4. Seguimiento Comercial
- Staff genera presupuestos para potenciales clientes
- Envía código por WhatsApp
- Cliente consulta online
- Realiza seguimiento de conversión

## 🔧 Mantenimiento

### Regenerar Prisma Client
Si aparecen errores de TypeScript:
```bash
cd fidelizacion-zona
npx prisma generate
```

### Ver Presupuestos en Base de Datos
```bash
npx prisma studio
# Navegar a modelo "Presupuesto"
```

### Consultar Presupuestos por API
```bash
# Obtener presupuesto
GET /api/presupuestos/PRE-12ABC34-5DEF67

# Listar presupuestos de cliente
GET /api/presupuestos?clienteId=uuid-del-cliente

# Listar por estado
GET /api/presupuestos?estado=PENDIENTE

# Admin: todos los presupuestos
GET /api/admin/presupuestos?page=1&limit=20
```

## ⚠️ Validaciones Implementadas

1. **Al crear presupuesto:**
   - Items no pueden estar vacíos
   - Precio total debe ser válido
   - Código debe ser único

2. **Al actualizar:**
   - No se puede modificar si está CONFIRMADO
   - Solo campos permitidos pueden cambiar

3. **Al confirmar:**
   - Solo estados PENDIENTE o COMPLETO
   - No se puede confirmar CANCELADO
   - Validación opcional de campos pendientes

4. **Al cancelar:**
   - No se puede cancelar CONFIRMADO

## 📝 Pendientes (Opcionales)

### Funcionalidades Adicionales Sugeridas:
1. **Lista de presupuestos en perfil de cliente**
   - Página `/presupuestos` con todos los presupuestos del cliente
   - Filtros por estado
   
2. **Panel admin de presupuestos**
   - Página `/admin/presupuestos`
   - Tabla con búsqueda y filtros
   - Estadísticas de conversión
   - Exportación a Excel

3. **Notificaciones**
   - Email cuando se crea presupuesto
   - Recordatorio si está pendiente >X días
   - Confirmación por email al confirmar

4. **Vencimiento automático**
   - Marcar como CANCELADO después de X días
   - Job automático en `/api/jobs/vencer-presupuestos`

5. **Edición de presupuesto**
   - Permitir modificar items antes de confirmar
   - Recalcular precios automáticamente

6. **Versiones de presupuesto**
   - Guardar historial de cambios
   - Comparar versiones

## 🚀 Deploy

Al deployar a producción:

1. **Asegurar variables de entorno:**
   ```env
   DATABASE_URL=...
   WOOCOMMERCE_URL=...
   WOOCOMMERCE_CONSUMER_KEY=...
   WOOCOMMERCE_CONSUMER_SECRET=...
   ```

2. **Aplicar migración:**
   ```bash
   npm run db:push
   # o si usas migraciones:
   npx prisma migrate deploy
   ```

3. **Verificar:**
   - Probar crear presupuesto en carrito
   - Probar consultar presupuesto por código
   - Probar confirmar presupuesto
   - Verificar pedido creado en WooCommerce

## 📞 Uso para Staff

### Crear Presupuesto
1. Ir a "Tomar Pedido" (modo staff)
2. Seleccionar o crear cliente
3. Agregar productos
4. Click "Guardar como Presupuesto"
5. Anotar código generado
6. Comunicar código al cliente

### Consultar Presupuesto
1. Ir a URL directa: `/presupuestos/CODIGO`
2. Ver detalles completos
3. Si está listo, click "Confirmar"

### Completar Pendiente
1. Cliente llama con código
2. Staff abre `/presupuestos/CODIGO`
3. Ve qué falta completar
4. Actualiza información faltante (vía API PATCH)
5. Confirma pedido

## 🎓 Aprendizajes Técnicos

### Generación de Código Único
```typescript
function generarCodigoPresupuesto(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = randomBytes(3).toString('hex').toUpperCase()
  return `PRE-${timestamp}-${random}`
}
```

### Serialización de Carrito
```typescript
items: items.map(item => ({
  productoId: item.productoId,
  varianteId: item.varianteId,
  nombre: item.nombre,
  cantidad: item.cantidad,
  precio: item.precio,
  precioAddOns: item.precioAddOns || 0,
  addOns: item.addOns || {},
  camposTexto: item.camposTexto || {},
  rendimiento: item.rendimiento
}))
```

### Conversión a WooCommerce Order
```typescript
items.forEach((item: any) => {
  const lineItem: any = {
    product_id: item.productoId,
    quantity: item.cantidad || 1
  }
  
  // Add-ons como meta_data
  Object.entries(item.addOns).forEach(([nombre, opciones]) => {
    opciones.forEach(opcion => {
      metaData.push({
        key: nombre,
        value: opcion.etiqueta
      })
    })
  })
})
```

---

**Documentación creada:** ${new Date().toISOString().split('T')[0]}
**Versión:** 1.0
**Estado:** Producción Ready ✅
