# Estado de Implementación: Sistema de Pedidos para Staff

## ✅ Completado (Frontend)

### 1. Página de Datos del Cliente
**Archivo:** [`src/app/local/tomar-pedido/page.tsx`](src/app/local/tomar-pedido/page.tsx)
- ✅ Formulario para ingresar nombre y teléfono del cliente
- ✅ Validación de campos obligatorios
- ✅ Redirección a catálogo en modo staff
- ✅ Datos guardados en `sessionStorage`

### 2. Botón en App Staff
**Archivo:** [`src/app/local/page.tsx`](src/app/local/page.tsx) (línea 492)
- ✅ Botón "📝 Pedido" agregado junto a Scanner y Salón
- ✅ Navegación a `/local/tomar-pedido`

### 3. Catálogo en Modo Staff
**Archivo:** [`src/app/tortas/page.tsx`](src/app/tortas/page.tsx)
- ✅ Detecta parámetro `?modo=staff` en URL
- ✅ Carga datos del cliente desde `sessionStorage`
- ✅ Banner sticky mostrando datos del cliente
- ✅ NO busca descuentos de fidelización
- ✅ Botón "Volver" redirige a `/local`

### 4. Carrito en Modo Staff
**Archivo:** [`src/app/carrito/page.tsx`](src/app/carrito/page.tsx)
- ✅ Detecta modo staff desde `sessionStorage`
- ✅ Validación estricta de campos personalizados
- ✅ Construcción de request con `modoStaff: true` y `datosCliente`
- ✅ No requiere token de cliente autenticado

## ⚠️ Pendiente (Backend)

### 5. API Crear Pedido
**Archivo:** [`src/app/api/woocommerce/crear-pedido/route.ts`](src/app/api/woocommerce/crear-pedido/route.ts)

**Cambios necesarios:**

```typescript
export async function POST(req: NextRequest) {
  try {
    const body: DatosPedido = await req.json()
    const { items, notas, fechaEntrega, horaEntrega, modoStaff, datosCliente } = body
    
    let cliente = null
    let descuentoPorcentaje = 0
    
    if (modoStaff) {
      // MODO STAFF: No buscar cliente autenticado
      console.log('[Staff Order] Pedido para:', datosCliente.nombre, datosCliente.telefono)
      // Sin descuentos
      descuentoPorcentaje = 0
    } else {
      // MODO NORMAL: Cliente autenticado
      const clientePayload = await requireClienteAuth(req)
      if (!clientePayload) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
      
      cliente = await prisma.cliente.findUnique({
        where: { id: clientePayload.clienteId },
        include: { nivel: true }
      })
      
      descuentoPorcentaje = cliente?.nivel?.descuentoPedidosTortas || 0
    }
    
    // ... resto del código igual, usando descuentoPorcentaje
    
    // Al crear pedido en WooCommerce, agregar metadata si es staff
    if (modoStaff && datosCliente) {
      orderData.meta_data = [
        ...orderData.meta_data,
        { key: '_pedido_staff', value: 'true' },
        { key: '_staff_completado', value: 'Equipo de atención' },
        { key: '_cliente_nombre', value: datosCliente.nombre },
        { key: '_cliente_telefono', value: datosCliente.telefono }
      ]
    }
    
    // ... crear pedido
  }
}
```

## ⚠️ Pendiente (Configuración Producto)

### 6. Producto ID 20: Torta Temática Buttercream

**Ubicación:** WooCommerce → Productos → Torta Temática Buttercream

**Add-ons a configurar/verificar:**

#### Existentes en WooCommerce:
- ✅ Relleno (verificar que valor sea por capa)
- ✅ Bizcochuelo (verificar que NO incluya "Marmolado", agregar nota)

#### A AGREGAR en WooCommerce:
- ❌ **Colores**: Campo de texto o add-on múltiple (valor por capa)
- ❌ **Link de foto de referencia**: Campo de texto OBLIGATORIO
- ❌ **Descripción de referencia**: Campo de texto (tipografía, decoración, colores, etc.)
- ❌ **Color de cubierta**: Radio buttons (Buttercream / Ganache de chocolate)
- ❌ **Adicionales**: Checkboxes opcionales
  - Macarons (+ precio)
  - Cookies temáticas (+ precio)
  - Astromelias (+ precio)
- ❌ **Nombre cumpleañer@**: Campo de texto opcional
- ❌ **Edad**: Campo numérico opcional

#### Variante de 20 porciones:
- ❌ Crear variante o usar lógica de descuento 20%
- Medidas: 16cm diámetro × 13cm alto
- Agregar nota automática en comentarios

**Rendimiento:**
- Variante estándar: 30 porciones medianas
- Variante reducida: 20 porciones

## 🔧 Próximos Pasos Recomendados

### Opción A: Configuración Manual en WooCommerce (Más Rápido)
1. Ir a WooCommerce → Productos → Editar "Torta Temática Buttercream"
2. Instalar plugin "Product Add-Ons" si no está instalado
3. Agregar los campos mencionados arriba
4. Marcar "Link de foto de referencia" como obligatorio
5. Probar desde la app que los campos aparezcan

### Opción B: Implementación Programática (Más Complejo)
1. Terminar modificación de [`/api/woocommerce/crear-pedido`](src/app/api/woocommerce/crear-pedido/route.ts)
2. Crear script para configurar producto via API de WooCommerce
3. Testear flujo completo

## 📝 Notas Importantes

### Sobre las Fotos
- **Fase 1 (Actual):** Campo de texto para pegar link de WhatsApp/Drive
- **Fase 2 (Futuro):** Upload directo con Cloudinary
  - Requiere configurar cuenta en Cloudinary
  - Agregar variables de entorno: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - Implementar componente de upload en frontend

### Sobre Descuentos
- En modo staff: **sin descuentos de fidelización**
- Variante 20 porciones: aplicar descuento 20% en frontend + nota en comentarios
- No se aplica el redondeo a $100 en modo staff

### Metadata en WooCommerce
Cuando el pedido es completado por staff, se agrega:
```json
{
  "_pedido_staff": "true",
  "_staff_completado": "Equipo de atención",
  "_cliente_nombre": "Nombre del Cliente",
  "_cliente_telefono": "11 1234 5678"
}
```

Esto permite en Ayres IT identificar pedidos tomados presencialmente.

## ⚡ Testing Checklist

Cuando esté completo, probar:
- [ ] Staff ingresa nombre + teléfono
- [ ] Navega a catálogo, ve banner con datos del cliente
- [ ] Selecciona producto ID 20
- [ ] Completa TODOS los campos personalizados
- [ ] Intenta continuar sin completar un campo → debe mostrar error
- [ ] Completa todo y crea pedido
- [ ] Verificar en WooCommerce que llegó con metadata de staff
- [ ] Verificar en Ayres IT que llegó el pedido con precio correcto
