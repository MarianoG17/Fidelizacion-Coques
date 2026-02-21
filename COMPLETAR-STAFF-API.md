# Completar API de Staff - Instrucciones Exactas

## ⚠️ IMPORTANTE

El archivo [`src/app/api/woocommerce/crear-pedido/route.ts`](src/app/api/woocommerce/crear-pedido/route.ts) tiene errores de TypeScript que necesitan resolverse manualmente. Aquí están las instrucciones precisas.

## Cambios Necesarios

### 1. Interfaz DatosPedido (línea 36-42)

✅ YA MODIFICADO - Agregar campos:
```typescript
interface DatosPedido {
  items: ItemPedido[]
  notas?: string
  fechaEntrega?: string
  horaEntrega?: string
  modoStaff?: boolean  // AGREGADO
  datosCliente?: { nombre: string, telefono: string }  // AGREGADO
}
```

### 2. Inicio de la función POST (línea 49-95)

⚠️ TIENE ERRORES - Reemplazar completamente desde línea 49 hasta 95:

```typescript
export async function POST(req: NextRequest) {
  try {
    const body: DatosPedido = await req.json()
    const { items, notas, fechaEntrega, horaEntrega, modoStaff, datosCliente } = body

    let cliente: any = null  // any para evitar problemas de tipo

    if (modoStaff) {
      // MODO STAFF: No requiere autenticación
      console.log('[Staff Order] Pedido para:', datosCliente?.nombre, datosCliente?.telefono)
    } else {
      // MODO NORMAL: Cliente autenticado
      const clientePayload = await requireClienteAuth(req)
      if (!clientePayload) {
        return NextResponse.json(
          { error: 'No autorizado. Debes iniciar sesión para realizar un pedido.' },
          { status: 401 }
        )
      }

      cliente = await prisma.cliente.findUnique({
        where: { id: clientePayload.clienteId },
        select: {
          id: true,
          nombre: true,
          email: true,
          phone: true,
          nivel: {
            select: {
              nombre: true,
              descuentoPedidosTortas: true,
            }
          }
        }
      })

      if (!cliente) {
        return NextResponse.json(
          { error: 'Cliente no encontrado' },
          { status: 404 }
        )
      }
    }

    const wooUrl = process.env.WOOCOMMERCE_URL
    const wooKey = process.env.WOOCOMMERCE_KEY
    const wooSecret = process.env.WOOCOMMERCE_SECRET

    if (!wooUrl || !wooKey || !wooSecret) {
      return NextResponse.json(
        { error: 'Credenciales de WooCommerce no configuradas' },
        { status: 500 }
      )
    }
```

### 3. Cálculo de descuento (buscar línea ~300)

⚠️ MODIFICAR - Buscar esta línea:
```typescript
const descuentoPorcentaje = cliente.nivel?.descuentoPedidosTortas || 0
```

Reemplazar con:
```typescript
const descuentoPorcentaje = modoStaff ? 0 : (cliente?.nivel?.descuentoPedidosTortas || 0)
```

### 4. Construcción de customerNote (buscar línea ~275)

⚠️ MODIFICAR - Buscar:
```typescript
let customerNote = `📦 Pedido desde App de Fidelización\n👤 Cliente ID: ${cliente.id}\n📅 Fecha de entrega: ${fechaFormateada}\n⏰ Horario: ${horaEntrega} hs`
```

Reemplazar con:
```typescript
let customerNote = ''

if (modoStaff && datosCliente) {
  // MODO STAFF: Formato especial
  customerNote = `📦 PEDIDO STAFF\n👤 Cliente: ${datosCliente.nombre}\n📱 Tel: ${datosCliente.telefono}\n📅 Fecha de entrega: ${fechaFormateada}\n⏰ Horario: ${horaEntrega} hs`
  
  // Agregar campos personalizados si es SKU 20 (Torta Temática)
  const productoPrincipal = items[0]
  if (productoPrincipal?.camposTexto) {
    customerNote += '\n\n--- TORTA TEMÁTICA BUTTERCREAM ---\n'
    
    const campos = productoPrincipal.camposTexto
    if (campos['Colores decoración']) customerNote += `Colores: ${campos['Colores decoración']}\n`
    if (campos['Link foto referencia']) customerNote += `Foto: ${campos['Link foto referencia']}\n`
    if (campos['Descripción referencia']) customerNote += `Descripción: ${campos['Descripción referencia']}\n`
    if (campos['Color cubierta']) customerNote += `Cubierta: ${campos['Color cubierta']}\n`
    if (campos['Macarons']) customerNote += `Macarons: ${campos['Macarons']}\n`
    if (campos['Astromelias']) customerNote += `Astromelias: ${campos['Astromelias']}\n`
    if (campos['Nombre cumpleañer@']) customerNote += `Nombre: ${campos['Nombre cumpleañer@']}\n`
    if (campos['Edad']) customerNote += `Edad: ${campos['Edad']}\n`
  }
  
  customerNote += '\n--- Pedido tomado por: Equipo Coques ---\n'
} else {
  // MODO NORMAL
  customerNote = `📦 Pedido desde App de Fidelización\n👤 Cliente ID: ${cliente.id}\n📅 Fecha de entrega: ${fechaFormateada}\n⏰ Horario: ${horaEntrega} hs`
}
```

### 5. Agregar notas adicionales (después de customerNote)

⚠️ AGREGAR - Después de la construcción de customerNote:
```typescript
if (notas && notas.trim()) {
  customerNote += `\n\n📝 Notas adicionales:\n${notas.trim()}`
}
```

### 6. Construcción de orderData (buscar línea ~360)

⚠️ MODIFICAR - Buscar:
```typescript
const orderData = {
  status: 'processing',
  set_paid: false,
  billing: {
    first_name: nombreCompleto,
    last_name: '',
    email: cliente.email || '',
    phone: cliente.phone || '',
  },
```

Reemplazar con:
```typescript
const orderData = {
  status: 'processing',
  set_paid: false,
  billing: modoStaff ? {
    first_name: datosCliente?.nombre || 'Cliente Staff',
    last_name: '',
    email: '',
    phone: datosCliente?.telefono || '',
  } : {
    first_name: nombreCompleto,
    last_name: '',
    email: cliente.email || '',
    phone: cliente.phone || '',
  },
```

### 7. Metadata (buscar meta_data en orderData, línea ~380)

⚠️ MODIFICAR - Buscar array de meta_data y agregar al final:
```typescript
meta_data: [
  {
    key: '_fecha_entrega',
    value: fechaFormateada,
  },
  {
    key: '_hora_entrega',
    value: horaEntrega,
  },
  {
    key: '_cliente_id',
    value: modoStaff ? 'STAFF' : cliente.id,
  },
  // AGREGAR ESTOS SI ES MODO STAFF:
  ...(modoStaff ? [
    {
      key: '_pedido_staff',
      value: 'true',
    },
    {
      key: '_staff_completado',
      value: 'Equipo de atención',
    },
    {
      key: '_cliente_nombre',
      value: datosCliente?.nombre || '',
    },
    {
      key: '_cliente_telefono',
      value: datosCliente?.telefono || '',
    }
  ] : []),
  // ... resto de metadata existente
]
```

### 8. Response final (buscar línea ~460)

⚠️ MODIFICAR - Buscar:
```typescript
return NextResponse.json({
  success: true,
  pedido: {
    id: order.id,
    numero: order.number,
  },
  cliente: {
    id: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: cliente.phone,
  },
```

Reemplazar con:
```typescript
return NextResponse.json({
  success: true,
  pedido: {
    id: order.id,
    numero: order.number,
  },
  cliente: modoStaff ? {
    nombre: datosCliente?.nombre,
    telefono: datosCliente?.telefono,
  } : {
    id: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: cliente.phone,
  },
```

## ✅ Testing

Una vez hechos los cambios:

1. Ejecutar: `npm run build` o `npx next build`
2. Verificar que no hay errores de TypeScript
3. Deploy: `vercel --prod` o el método que uses
4. Probar:
   - Staff → Tomar Pedido → Ingresar cliente → Seleccionar torta SKU 20
   - Agregar rellenos/bizcochuelos desde add-ons (tienen SKU)
   - Completar campos de texto
   - Crear pedido
   - Verificar en WooCommerce que llegó con customer_note formateado
   - Verificar en Ayres IT que tiene los comentarios

## 📝 Notas

- El archivo completo tiene ~490 líneas
- Los números de línea son aproximados
- Buscar por el texto exacto para encontrar las secciones
- Si hay dudas, el archivo de referencia con descuentos funcionando está en el mismo directorio
