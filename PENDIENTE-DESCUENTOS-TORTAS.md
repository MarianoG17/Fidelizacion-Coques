# PENDIENTE: Sistema de Descuentos por Nivel en Pedidos de Tortas

## Estado Actual
- ✅ Campo `descuentoPedidosTortas` agregado al modelo `Nivel` en Prisma
- ✅ Migración SQL creada: `prisma/migrations/20260220_add_descuento_tortas/migration.sql`
- ⏳ Falta aplicar migración en base de datos
- ⏳ Falta actualizar código para usar este campo

## Configuración Deseada
- **Bronce**: 5% de descuento
- **Plata**: 10% de descuento  
- **Oro**: 15% de descuento
- **Platino**: 20% de descuento (si existe)

**Descuento se aplica**: Al total del pedido de tortas (incluye torta base + adicionales)

## Tareas Pendientes

### 1. Aplicar Migración en Base de Datos
```bash
cd fidelizacion-zona
npx prisma migrate deploy
# O desde Vercel: agregar variable de entorno y redeploy
```

### 2. Actualizar Admin Panel de Niveles (`src/app/admin/niveles/page.tsx`)

**Cambios necesarios:**

a) Actualizar interfaz TypeScript:
```typescript
interface Nivel {
  id: string
  nombre: string
  orden: number
  descripcionBeneficios: string
  descuentoPedidosTortas: number  // ← AGREGAR
  criterios: {
    visitas: number
    diasVentana: number
    usosCruzados: number
  }
  _count: {
    clientes: number
  }
}
```

b) Actualizar formData state:
```typescript
const [formData, setFormData] = useState({ 
  visitas: 0, 
  usosCruzados: 0,
  descuentoPedidosTortas: 0  // ← AGREGAR
})
```

c) Actualizar función `iniciarEdicion`:
```typescript
function iniciarEdicion(nivel: Nivel) {
  setEditando(nivel.id)
  setFormData({
    visitas: nivel.criterios.visitas,
    usosCruzados: nivel.criterios.usosCruzados,
    descuentoPedidosTortas: nivel.descuentoPedidosTortas  // ← AGREGAR
  })
}
```

d) Agregar columna en la tabla:
```tsx
<th className="text-left p-4 text-slate-300 font-semibold">Descuento Tortas</th>
```

e) Mostrar descuento en la celda:
```tsx
<td className="p-4">
  {editando === nivel.id ? (
    <input
      type="number"
      min="0"
      max="100"
      value={formData.descuentoPedidosTortas}
      onChange={(e) => setFormData({ ...formData, descuentoPedidosTortas: parseInt(e.target.value) || 0 })}
      className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
    />
  ) : (
    <span className="px-3 py-1 bg-purple-600 rounded-full text-sm font-semibold">
      {nivel.descuentoPedidosTortas}%
    </span>
  )}
</td>
```

### 3. Actualizar API de Niveles (`src/app/api/admin/niveles/[id]/route.ts`)

Agregar `descuentoPedidosTortas` al update:

```typescript
const { visitas, usosCruzados, descuentoPedidosTortas } = await req.json()

// Validación
if (descuentoPedidosTortas !== undefined) {
  if (typeof descuentoPedidosTortas !== 'number' || descuentoPedidosTortas < 0 || descuentoPedidosTortas > 100) {
    return NextResponse.json(
      { error: 'descuentoPedidosTortas debe ser un número entre 0 y 100' },
      { status: 400 }
    )
  }
}

// Update
await prisma.nivel.update({
  where: { id },
  data: {
    ...(visitas !== undefined && { criterios: { ...criteriosActuales, visitas } }),
    ...(usosCruzados !== undefined && { criterios: { ...criteriosActuales, usosCruzados } }),
    ...(descuentoPedidosTortas !== undefined && { descuentoPedidosTortas }),
  }
})
```

### 4. Actualizar Página de Tortas (`src/app/tortas/page.tsx`)

**Cambios necesarios:**

a) Obtener nivel del cliente:
```typescript
const [nivelCliente, setNivelCliente] = useState<{nivel: string, descuento: number} | null>(null)

useEffect(() => {
  async function fetchNivelCliente() {
    const token = localStorage.getItem('token')
    if (!token) return
    
    const res = await fetch('/api/pass', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (res.ok) {
      const data = await res.json()
      setNivelCliente({
        nivel: data.data.nivel,
        descuento: data.data.nivelInfo?.descuentoPedidosTortas || 0
      })
    }
  }
  
  fetchNivelCliente()
}, [])
```

b) Calcular precio con descuento en `calcularPrecioTotal`:
```typescript
const calcularPrecioTotal = useCallback((): {precioOriginal: number, precioConDescuento: number, descuento: number} => {
  if (!productoSeleccionado) return {precioOriginal: 0, precioConDescuento: 0, descuento: 0}
  
  let precioOriginal = precioBase // precio de la torta + addons
  
  // Aplicar descuento por nivel
  const porcentajeDescuento = nivelCliente?.descuento || 0
  const montoDescuento = precioOriginal * (porcentajeDescuento / 100)
  const precioConDescuento = precioOriginal - montoDescuento
  
  return {
    precioOriginal,
    precioConDescuento,
    descuento: montoDescuento
  }
}, [productoSeleccionado, varianteSeleccionada, addOnsSeleccionados, nivelCliente])
```

c) Mostrar descuento en la UI:
```tsx
{nivelCliente && nivelCliente.descuento > 0 && (
  <div className="bg-purple-900/30 border border-purple-500 rounded-xl p-4 mb-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-purple-200 mb-1">
          🎁 Descuento Nivel {nivelCliente.nivel}
        </p>
        <p className="text-xs text-purple-300">
          {nivelCliente.descuento}% de descuento en tu pedido
        </p>
      </div>
      <p className="text-2xl font-bold text-purple-400">
        -{formatearPrecio(precios.descuento)}
      </p>
    </div>
  </div>
)}

<div className="text-right">
  {nivelCliente && nivelCliente.descuento > 0 && (
    <p className="text-slate-400 line-through mb-2">
      Total: {formatearPrecio(precios.precioOriginal)}
    </p>
  )}
  <p className="text-3xl font-bold text-white">
    Total: {formatearPrecio(precios.precioConDescuento)}
  </p>
</div>
```

### 5. Enviar Descuento a WooCommerce (`src/app/api/woocommerce/crear-pedido/route.ts`)

**Agregar descuento como cupón (coupon_lines):**

```typescript
// En el body del pedido:
const orderData = {
  // ... resto del código
  line_items: lineItems,
  coupon_lines: descuentoAplicado > 0 ? [
    {
      code: `NIVEL_${nivelCliente}`,  // "NIVEL_BRONCE", "NIVEL_PLATA", etc.
      discount: descuentoMontoTotal.toString(),
      discount_tax: "0"
    }
  ] : [],
  meta_data: [
    // ... campos existentes
    {
      key: 'descuento_nivel',
      value: `${nivelCliente} - ${descuentoPorcentaje}%`
    }
  ]
}
```

### 6. Actualizar API /api/pass para Incluir Descuento

```typescript
// En src/app/api/pass/route.ts
const nivelInfo = await prisma.nivel.findUnique({
  where: { id: cliente.nivelId },
  select: { 
    nombre: true, 
    orden: true,
    descuentoPedidosTortas: true  // ← AGREGAR
  }
})

return NextResponse.json({
  data: {
    // ... resto
    nivelInfo: {
      nombre: nivelInfo?.nombre,
      orden: nivelInfo?.orden,
      descuentoPedidosTortas: nivelInfo?.descuentoPedidosTortas || 0  // ← AGREGAR
    }
  }
})
```

## Testing

1. Aplicar migración en producción
2. Configurar descuentos en admin panel (5%, 10%, 15%)
3. Iniciar sesión como cliente de cada nivel
4. Crear pedido de torta y verificar:
   - Se muestra el descuento en la UI
   - El precio final es correcto
   - WooCommerce recibe el descuento como cupón
   - Ayresit ve el descuento aplicado

## Notas Importantes

- El descuento se aplica **solo en /tortas**, no en otros beneficios
- El descuento es **acumulativo** con el subtotal (torta + addons)
- Se envía como **coupon_line** a WooCommerce para que Ayresit lo vea como descuento genérico
- El admin puede editar los porcentajes en cualquier momento desde `/admin/niveles`
