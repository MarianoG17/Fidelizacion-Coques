# Sistema de Pedidos Staff - PENDIENTE

## ✅ COMPLETADO (70%)

### Frontend
- ✅ [`/local/tomar-pedido/page.tsx`](src/app/local/tomar-pedido/page.tsx) - Formulario datos cliente
- ✅ [`/local/page.tsx`](src/app/local/page.tsx:492) - Botón "📝 Pedido"
- ✅ [`/tortas/page.tsx`](src/app/tortas/page.tsx) - Modo staff con banner
- ✅ [`/carrito/page.tsx`](src/app/carrito/page.tsx) - Validación estricta + modo staff

## ⚠️ PENDIENTE (30%)

### 1. API Crear Pedido
**Archivo:** `src/app/api/woocommerce/crear-pedido/route.ts`

**Modificar líneas 36-41 (interface DatosPedido):**
```typescript
interface DatosPedido {
  items: ItemPedido[]
  notas?: string
  fechaEntrega?: string
  horaEntrega?: string
  modoStaff?: boolean  // AGREGAR
  datosCliente?: { nombre: string, telefono: string }  // AGREGAR
}
```

**Modificar líneas 47-80 (autenticación):**
```typescript
export async function POST(req: NextRequest) {
  try {
    const body: DatosPedido = await req.json()
    const { items, notas, fechaEntrega, horaEntrega, modoStaff, datosCliente } = body
    
    let cliente = null
    let descuentoPorcentaje = 0
    
    if (modoStaff) {
      // MODO STAFF: No requiere autenticación de cliente
      console.log('[Staff Order] Pedido para:', datosCliente?.nombre, datosCliente?.telefono)
      descuentoPorcentaje = 0 // Sin descuentos
    } else {
      // MODO NORMAL: Cliente autenticado
      const clientePayload = await requireClienteAuth(req)
      if (!clientePayload) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        )
      }
      
      cliente = await prisma.cliente.findUnique({
        where: { id: clientePayload.clienteId },
        include: { nivel: true }
      })
      
      if (!cliente) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      }
      
      descuentoPorcentaje = cliente.nivel?.descuentoPedidosTortas || 0
    }
    
    // ... continuar con el resto del código
```

**Buscar donde se construye `orderData` para WooCommerce (aprox línea 300) y agregar:**
```typescript
// Construir notas con formato especial si es modo staff
let notasFinal = notas || ''

if (modoStaff && datosCliente) {
  // Formatear campos personalizados si el producto es SKU/ID 20
  const productoPrincipal = items[0] // Asumimos que la torta es el primer item
  
  if (productoPrincipal.camposTexto) {
    notasFinal += '\n\n--- TORTA TEMÁTICA BUTTERCREAM ---\n'
    
    if (productoPrincipal.camposTexto['Colores decoración']) {
      notasFinal += `Colores: ${productoPrincipal.camposTexto['Colores decoración']}\n`
    }
    if (productoPrincipal.camposTexto['Link foto referencia']) {
      notasFinal += `Foto: ${productoPrincipal.camposTexto['Link foto referencia']}\n`
    }
    if (productoPrincipal.camposTexto['Descripción referencia']) {
      notasFinal += `Descripción: ${productoPrincipal.camposTexto['Descripción referencia']}\n`
    }
    if (productoPrincipal.camposTexto['Color cubierta']) {
      notasFinal += `Cubierta: ${productoPrincipal.camposTexto['Color cubierta']}\n`
    }
    if (productoPrincipal.camposTexto['Macarons']) {
      notasFinal += `Macarons: ${productoPrincipal.camposTexto['Macarons']}\n`
    }
    if (productoPrincipal.camposTexto['Astromelias']) {
      notasFinal += `Astromelias: ${productoPrincipal.camposTexto['Astromelias']}\n`
    }
    if (productoPrincipal.camposTexto['Nombre cumpleañer@']) {
      notasFinal += `Nombre: ${productoPrincipal.camposTexto['Nombre cumpleañer@']}\n`
    }
    if (productoPrincipal.camposTexto['Edad']) {
      notasFinal += `Edad: ${productoPrincipal.camposTexto['Edad']}\n`
    }
  }
  
  notasFinal += `\n--- Cliente: ${datosCliente.nombre} - Tel: ${datosCliente.telefono} ---\n`
  notasFinal += 'Pedido tomado por: Equipo Coques\n'
}

const orderData = {
  // ... campos existentes
  customer_note: notasFinal,
  meta_data: [
    // ... metadata existente
    ...(modoStaff ? [
      { key: '_pedido_staff', value: 'true' },
      { key: '_staff_completado', value: 'Equipo de atención' },
      { key: '_cliente_nombre', value: datosCliente?.nombre || '' },
      { key: '_cliente_telefono', value: datosCliente?.telefono || '' }
    ] : [])
  ]
}
```

### 2. Configurar Producto en WooCommerce

**IMPORTANTE:** Primero necesitás confirmar si el producto tiene:
- SKU 20, o
- ID 20

Luego, configurar campos en WooCommerce usando plugin "Product Add-Ons":

#### Campos a agregar:
1. **Colores decoración** - Text field
2. **Link foto referencia** - Text field (REQUIRED)
3. **Descripción referencia** - Textarea
4. **Color cubierta** - Radio buttons (Buttercream / Ganache)
5. **Macarons** - Text field (cantidad)
6. **Astromelias** - Text field (cantidad)
7. **Nombre cumpleañer@** - Text field (optional)
8. **Edad** - Number field (optional)

#### Campos existentes (verificar):
- ✅ Rellenos - ya tienen SKU como productos separados
- ✅ Bizcochuelos - ya tienen SKU como productos separados
- ⚠️ Eliminar opción "Marmolado" del bizcochuelo

### 3. Testing

Cuando esté todo implementado:

1. Staff ingresa a `/local`
2. Click en "📝 Pedido"
3. Ingresa nombre: "Juan Pérez" y teléfono: "11 1234 5678"
4. Navega a tortas (modo staff activo, banner visible)
5. Selecciona "Torta Temática Buttercream"
6. Completa TODOS los campos
7. Agrega rellenos/bizcochuelos desde los add-ons existentes
8. Va al carrito
9. Selecciona fecha/hora
10. Click "Confirmar pedido"
11. Verificar en WooCommerce:
    - Customer note con formato especial
    - Metadata: `_pedido_staff: true`
12. Verificar en Ayres IT:
    - Pedido llegó con precio correcto
    - Comentarios tienen toda la info

## 📝 Notas

### Productos con SKU (agregar como line items):
- Rellenos: 467, 466, 300, 376, 375, 263, 367, 257, 314
- Bizcochuelos: 399 (Vainilla), 398 (Chocolate), Colores
- Cookies: 31
- Macarons: 469, 254, 256, 255, 253, 84

### Campos en notas (texto libre):
Solo para producto SKU/ID 20:
- Colores decoración
- Link foto
- Descripción referencia
- Color cubierta
- Macarons cantidad (si no se agregan con SKU)
- Astromelias cantidad
- Nombre cumpleañer@
- Edad
