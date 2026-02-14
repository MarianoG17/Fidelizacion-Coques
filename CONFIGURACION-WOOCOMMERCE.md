# 🛍️ Configuración WooCommerce

Guía completa para integrar tu tienda WooCommerce con el sistema de fidelización.

## 📋 Requisitos Previos

- Una tienda WooCommerce activa (WordPress + WooCommerce instalado)
- Acceso de administrador a tu tienda
- Certificado SSL activo (HTTPS)

## 🔧 Paso 1: Configurar API REST en WooCommerce

### 1.1 Habilitar la API REST

La API REST de WooCommerce suele estar habilitada por defecto, pero verifica:

1. Ve a **WooCommerce → Ajustes → Avanzado → REST API**
2. Asegúrate de que la API esté habilitada

### 1.2 Crear Credenciales de API

1. Ve a **WooCommerce → Ajustes → Avanzado → REST API**
2. Haz clic en **Añadir clave**
3. Configura:
   - **Descripción**: `App Fidelización Coques`
   - **Usuario**: Selecciona un usuario administrador
   - **Permisos**: **Lectura/Escritura** (Read/Write)
4. Haz clic en **Generar clave API**
5. **¡IMPORTANTE!** Copia y guarda en un lugar seguro:
   - **Consumer Key** (comienza con `ck_`)
   - **Consumer Secret** (comienza con `cs_`)
   - ⚠️ No podrás ver el Consumer Secret de nuevo

## 🔐 Paso 2: Configurar Variables de Entorno

### 2.1 Desarrollo Local

Crea o edita el archivo `.env.local` en la raíz del proyecto:

```bash
# WooCommerce Integration
WOOCOMMERCE_URL="https://tutienda.com"
WOOCOMMERCE_KEY="ck_1234567890abcdef1234567890abcdef12345678"
WOOCOMMERCE_SECRET="cs_1234567890abcdef1234567890abcdef12345678"
```

**Importante:**
- `WOOCOMMERCE_URL` debe ser la URL completa de tu tienda **sin** `/` al final
- Ejemplo correcto: `https://tutienda.com`
- Ejemplo incorrecto: `https://tutienda.com/`

### 2.2 Producción (Vercel)

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com)
2. Ve a **Settings → Environment Variables**
3. Agrega cada variable:

| Name | Value | Environment |
|------|-------|-------------|
| `WOOCOMMERCE_URL` | `https://tutienda.com` | Production, Preview, Development |
| `WOOCOMMERCE_KEY` | `ck_xxxxx...` | Production, Preview, Development |
| `WOOCOMMERCE_SECRET` | `cs_xxxxx...` | Production, Preview, Development |

4. Guarda y redeploy tu aplicación

### 2.3 Reiniciar Servidor

Después de configurar las variables de entorno:

```bash
# Detén el servidor (Ctrl+C)
# Inicia de nuevo
npm run dev
```

## ✅ Paso 3: Probar la Conexión

### 3.1 Página de Prueba

1. Inicia sesión como administrador en tu app
2. Ve a la página de prueba: `/admin/woocommerce-test`
3. Haz clic en **"🔌 Probar Conexión"**
4. Deberías ver tus productos de WooCommerce

### 3.2 Prueba Manual con API

También puedes probar directamente el endpoint:

```bash
# Obtener productos
curl http://localhost:3000/api/woocommerce/test-products
```

### 3.3 Solución de Problemas

#### Error: "Credenciales de WooCommerce no configuradas"
- Verifica que las variables de entorno estén configuradas
- Asegúrate de haber reiniciado el servidor después de agregar las variables
- En Vercel, verifica que las variables estén en el environment correcto

#### Error: "Error al conectar con WooCommerce"
- Verifica que la URL de tu tienda sea correcta
- Asegúrate de que tu tienda tenga SSL (HTTPS)
- Verifica que las credenciales (Consumer Key/Secret) sean correctas
- Comprueba que la API REST esté habilitada en WooCommerce

#### Error 401 (Unauthorized)
- Las credenciales son incorrectas
- Regenera las credenciales en WooCommerce

#### Error 404
- La URL base está incorrecta
- Verifica que tu tienda WooCommerce esté accesible

## 📊 Endpoints Disponibles

### GET `/api/woocommerce/test-products`

Obtiene los primeros 5 productos publicados de tu tienda.

**Respuesta exitosa:**
```json
{
  "success": true,
  "count": 5,
  "products": [
    {
      "id": 123,
      "nombre": "Producto de prueba",
      "precio": "99.99",
      "precioRegular": "149.99",
      "precioOferta": "99.99",
      "descripcion": "Descripción del producto",
      "imagen": "https://...",
      "stock": 10,
      "enStock": true,
      "categorias": ["Categoría 1"]
    }
  ]
}
```

### POST `/api/woocommerce/test-order`

Crea un pedido de prueba en WooCommerce.

**Body:**
```json
{
  "clienteEmail": "cliente@ejemplo.com",
  "clienteNombre": "Juan Pérez",
  "clienteTelefono": "+5491112345678",
  "productoId": 123,
  "cantidad": 1
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Pedido creado exitosamente en WooCommerce",
  "order": {
    "id": 456,
    "numero": "456",
    "estado": "pending",
    "total": "99.99",
    "moneda": "ARS",
    "fechaCreacion": "2026-02-14T12:00:00",
    "urlAdmin": "https://tutienda.com/wp-admin/post.php?post=456&action=edit"
  }
}
```

## 🔄 Próximos Pasos

Una vez verificada la conexión, puedes implementar:

1. **Catálogo de productos**: Página donde los clientes ven productos disponibles
2. **Canje de puntos**: Sistema para canjear puntos de fidelización por productos
3. **Descuentos por nivel**: Aplicar descuentos automáticos según el nivel del cliente
4. **Webhooks**: Recibir notificaciones automáticas de WooCommerce cuando:
   - Se crea un pedido
   - Se actualiza el estado de un pedido
   - Se modifica un producto
5. **Historial de compras**: Integrar compras de WooCommerce con el historial del cliente

## 📚 Documentación Adicional

- [WooCommerce REST API Docs](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Autenticación WooCommerce](https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication)
- [Endpoints de Productos](https://woocommerce.github.io/woocommerce-rest-api-docs/#products)
- [Endpoints de Pedidos](https://woocommerce.github.io/woocommerce-rest-api-docs/#orders)

## 🔒 Seguridad

- **Nunca** compartas tus credenciales de API
- **Nunca** subas archivos `.env.local` a Git (ya está en `.gitignore`)
- Usa HTTPS siempre en producción
- Rota las credenciales periódicamente
- Considera usar permisos de solo lectura si solo necesitas consultar productos

## 💡 Tips

- Puedes crear múltiples claves API para diferentes propósitos
- Usa la descripción para identificar fácilmente cada clave
- Puedes revocar una clave en cualquier momento desde WooCommerce
- Las credenciales funcionan tanto con HTTP Basic Auth como con Query Parameters
