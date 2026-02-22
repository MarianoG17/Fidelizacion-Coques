# Plan: Edición de Productos en Presupuesto con Opciones Precargadas

## Objetivo
Permitir editar productos en [`/local/presupuestos/[codigo]/editar`](src/app/local/presupuestos/[codigo]/editar/page.tsx) haciendo click en ellos, abriendo un modal con las opciones YA SELECCIONADAS para poder modificarlas.

## Flujo Esperado
1. Staff abre presupuesto pendiente → `/local/presupuestos/PRE-XXX/editar`
2. Ve lista de productos (tortas con add-ons configurados)
3. Click en un producto
4. **Modal se abre con:**
   - Variante ya seleccionada
   - Add-ons ya seleccionados (ej: "Buttercream" checkbox marcado)
   - Campos de texto ya completados (ej: "Color: Rosa")
5. Staff puede modificar cualquier opción
6. Click "Guardar Cambios" → actualiza el item en el presupuesto
7. Precio total se recalcula automáticamente

## Implementación Técnica

### 1. Hacer Productos Clickeables

**Archivo:** `src/app/local/presupuestos/[codigo]/editar/page.tsx`

**Líneas 316-340:** Cambiar de solo lectura a clickeable:

```typescript
// AGREGAR ESTADOS
const [productoEditando, setProductoEditando] = useState<any>(null)
const [productoCompleto, setProductoCompleto] = useState<any>(null)
const [cargandoProducto, setCargandoProducto] = useState(false)
const [itemIndex, setItemIndex] = useState<number | null>(null)

// AGREGAR después de línea 314
const [addOnsEditando, setAddOnsEditando] = useState<any>({})
const [camposTextoEditando, setCamposTextoEditando] = useState<any>({})
const [varianteSeleccionada, setVarianteSeleccionada] = useState<any>(null)
```

### 2. Función para Abrir Edición con Precarga

```typescript
async function abrirEdicionProducto(item: any, index: number) {
  setItemIndex(index)
  setProductoEditando(item)
  setCargandoProducto(true)
  
  // PRECARGAR valores actuales del item
  setAddOnsEditando(item.addOns || {})
  setCamposTextoEditando(item.camposTexto || {})
  
  try {
    // Cargar datos completos del producto desde WooCommerce
    const response = await fetch('/api/woocommerce/tortas')
    const data = await response.json()
    
    const producto = data.productos.find((p: any) => p.id === item.productoId)
    
    if (!producto) {
      throw new Error('Producto no encontrado')
    }
    
    // Si tiene variante, cargar variaciones y preseleccionar
    if (item.varianteId && producto.tipo === 'variable') {
      const varResponse = await fetch(`/api/woocommerce/variaciones/${item.productoId}`)
      const varData = await varResponse.json()
      
      producto.variantes = varData.variantes || []
      
      // PRESELECCIONAR variante actual
      const varianteActual = producto.variantes.find((v: any) => v.id === item.varianteId)
      setVarianteSeleccionada(varianteActual || null)
    }
    
    setProductoCompleto(producto)
  } catch (error) {
    console.error('Error cargando producto:', error)
    alert('Error al cargar el producto')
    cerrarEdicion()
  } finally {
    setCargandoProducto(false)
  }
}
```

### 3. Función para Guardar Cambios

```typescript
function guardarEdicionProducto() {
  if (productoEditando === null || itemIndex === null) return
  
  // Recalcular precio de add-ons
  let precioAddOns = 0
  if (productoCompleto?.addOns) {
    productoCompleto.addOns.forEach((addOn: any) => {
      const seleccionados = addOnsEditando[addOn.nombre] || []
      seleccionados.forEach((seleccion: any) => {
        const opcion = addOn.opciones.find((o: any) => 
          o.sku === seleccion.sku || o.etiqueta === seleccion.etiqueta
        )
        if (opcion && opcion.precio) {
          precioAddOns += opcion.precio
        }
      })
    })
  }
  
  // Actualizar item en el array de items del presupuesto
  const itemsActualizados = [...presupuesto.items]
  itemsActualizados[itemIndex] = {
    ...itemsActualizados[itemIndex],
    addOns: Object.keys(addOnsEditando).length > 0 ? addOnsEditando : undefined,
    precioAddOns: precioAddOns > 0 ? precioAddOns : undefined,
    camposTexto: Object.keys(camposTextoEditando).length > 0 ? camposTextoEditando : undefined,
  }
  
  // Actualizar estado local del presupuesto
  setPresupuesto({
    ...presupuesto,
    items: itemsActualizados,
    precioTotal: calcularPrecioTotal(itemsActualizados)
  })
  
  cerrarEdicion()
}

function calcularPrecioTotal(items: any[]) {
  return items.reduce((total, item) => {
    const precioBase = item.precio * item.cantidad
    const precioAddOns = (item.precioAddOns || 0) * item.cantidad
    return total + precioBase + precioAddOns
  }, 0)
}

function cerrarEdicion() {
  setProductoEditando(null)
  setProductoCompleto(null)
  setAddOnsEditando({})
  setCamposTextoEditando({})
  setVarianteSeleccionada(null)
  setItemIndex(null)
}
```

### 4. Modificar Rendering de Productos

**Reemplazar líneas 316-340:**

```typescript
{/* Productos (clickeables para editar) */}
<div className="bg-white rounded-lg shadow-md p-6 mb-6">
  <h3 className="font-bold text-gray-800 mb-3">
    Productos ({presupuesto.items.length})
  </h3>
  <p className="text-sm text-purple-600 mb-4">
    ✏️ Hacé click en un producto para editarlo
  </p>
  <div className="space-y-3">
    {presupuesto.items.map((item: any, index: number) => (
      <div 
        key={index} 
        onClick={() => abrirEdicionProducto(item, index)}
        className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-all"
      >
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{item.nombre}</p>
          {item.nombreVariante && (
            <p className="text-sm text-gray-600">{item.nombreVariante}</p>
          )}
          {item.addOns && Object.keys(item.addOns).length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {Object.entries(item.addOns).map(([nombre, opciones]: [string, any]) => (
                <span key={nombre} className="mr-2">
                  • {nombre}: {opciones.map((o: any) => o.etiqueta).join(', ')}
                </span>
              ))}
            </div>
          )}
          {item.camposTexto && Object.keys(item.camposTexto).length > 0 && (
            <div className="text-xs text-purple-600 mt-1">
              {Object.entries(item.camposTexto).map(([campo, valor]: [string, any]) => (
                <span key={campo} className="mr-2">
                  {campo}: {valor}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-1">Cantidad: {item.cantidad}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-600 text-lg">
            ${formatearPrecio(item.precio * item.cantidad)}
          </p>
          {item.precioAddOns && (
            <p className="text-xs text-gray-500">
              + ${formatearPrecio(item.precioAddOns * item.cantidad)} add-ons
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
  <div className="border-t border-gray-300 mt-4 pt-4">
    <div className="flex justify-between font-bold text-xl">
      <span>Total:</span>
      <span className="text-green-600">${formatearPrecio(presupuesto.precioTotal)}</span>
    </div>
  </div>
</div>
```

### 5. Modal de Edición

**Agregar antes del cierre del return (línea 377):**

```typescript
{/* Modal de edición de producto */}
{productoEditando && (
  <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{productoEditando.nombre}</h2>
          <p className="text-sm text-gray-600">Modificá las opciones del producto</p>
        </div>
        <button 
          onClick={cerrarEdicion}
          className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
        >
          ×
        </button>
      </div>
      
      {/* Contenido */}
      <div className="p-6">
        {cargandoProducto ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando opciones...</p>
          </div>
        ) : productoCompleto ? (
          <>
            {/* Variantes (si aplica) */}
            {productoCompleto.variantes && productoCompleto.variantes.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3">Tamaño</h3>
                <div className="space-y-2">
                  {productoCompleto.variantes.map((variante: any) => (
                    <button
                      key={variante.id}
                      onClick={() => setVarianteSeleccionada(variante)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        varianteSeleccionada?.id === variante.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold">{variante.nombreVariante}</span>
                        <span className="text-green-600 font-bold">
                          ${formatearPrecio(variante.precio)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Add-ons con valores PRECARGADOS */}
            {productoCompleto.addOns && productoCompleto.addOns.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3">Adicionales</h3>
                <div className="space-y-4">
                  {productoCompleto.addOns.map((addOn: any) => (
                    <div key={addOn.nombre} className="border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold mb-3">{addOn.nombre}</h4>
                      <div className="space-y-2">
                        {addOn.opciones.map((opcion: any) => (
                          <label 
                            key={opcion.etiqueta}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type={addOn.tipo === 'radio' ? 'radio' : 'checkbox'}
                                name={addOn.tipo === 'radio' ? addOn.nombre : undefined}
                                // IMPORTANTE: checkbox marcado si está en addOnsEditando
                                checked={
                                  addOnsEditando[addOn.nombre]?.some(
                                    (o: any) => o.etiqueta === opcion.etiqueta
                                  ) || false
                                }
                                onChange={() => {
                                  // Lógica toggle (copiar de /tortas)
                                  setAddOnsEditando((prev: any) => {
                                    const current = prev[addOn.nombre] || []
                                    const exists = current.some((o: any) => o.etiqueta === opcion.etiqueta)
                                    
                                    if (addOn.tipo === 'radio') {
                                      return {
                                        ...prev,
                                        [addOn.nombre]: [{
                                          id: opcion.sku || opcion.etiqueta,
                                          sku: opcion.sku,
                                          etiqueta: opcion.etiqueta
                                        }]
                                      }
                                    } else {
                                      if (exists) {
                                        return {
                                          ...prev,
                                          [addOn.nombre]: current.filter((o: any) => o.etiqueta !== opcion.etiqueta)
                                        }
                                      } else {
                                        return {
                                          ...prev,
                                          [addOn.nombre]: [...current, {
                                            id: opcion.sku || opcion.etiqueta,
                                            sku: opcion.sku,
                                            etiqueta: opcion.etiqueta
                                          }]
                                        }
                                      }
                                    }
                                  })
                                }}
                                className="w-5 h-5"
                              />
                              <span className="text-gray-800">{opcion.etiqueta}</span>
                            </div>
                            {opcion.precio > 0 && (
                              <span className="text-green-600 font-semibold">
                                +${formatearPrecio(opcion.precio)}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Campos de texto con valores PRECARGADOS */}
            {productoCompleto.camposTexto && productoCompleto.camposTexto.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3">Personalizaciones</h3>
                <div className="space-y-4">
                  {productoCompleto.camposTexto.map((campo: any) => (
                    <div key={campo.nombre}>
                      <label className="block font-semibold text-gray-700 mb-2">
                        {campo.nombre}
                        {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        // IMPORTANTE: valor precargado desde camposTextoEditando
                        value={camposTextoEditando[campo.nombre] || ''}
                        onChange={(e) => setCamposTextoEditando((prev: any) => ({
                          ...prev,
                          [campo.nombre]: e.target.value
                        }))}
                        placeholder={campo.placeholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-red-600 py-8">Error cargando datos del producto</p>
        )}
      </div>
      
      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
        <button 
          onClick={cerrarEdicion}
          className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button 
          onClick={guardarEdicionProducto}
          disabled={cargandoProducto}
          className={`flex-1 py-3 rounded-lg font-bold ${
            cargandoProducto
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          💾 Guardar Cambios
        </button>
      </div>
    </div>
  </div>
)}
```

### 6. Modificar guardarCambios() Principal

Actualizar para enviar items modificados:

```typescript
async function guardarCambios() {
  // ... validaciones existentes ...
  
  try {
    const response = await fetch(`/api/presupuestos/${codigo}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombreCliente: nombreCliente.trim() || null,
        telefonoCliente: telefonoCliente.trim() || null,
        emailCliente: emailCliente.trim() || null,
        fechaEntrega: fechaEntrega || null,
        horaEntrega: horaEntrega || null,
        notasCliente: notasCliente.trim() || null,
        notasInternas: notasInternas.trim() || null,
        items: presupuesto.items, // ← AGREGAR items actualizados
        precioTotal: presupuesto.precioTotal, // ← AGREGAR precio recalculado
        estado: /* lógica existente */
      })
    })
    // ... resto del código
  }
}
```

### 7. Actualizar API Route

**Archivo:** `src/app/api/presupuestos/[codigo]/route.ts`

**En PATCH handler, permitir actualizar items:**

```typescript
const { items, precioTotal, ...otherFields } = await req.json()

const updateData: any = {
  ...otherFields,
}

// Si se envían items, actualizar
if (items !== undefined) {
  updateData.items = items
}

// Si se envía nuevo precio total, actualizar
if (precioTotal !== undefined) {
  updateData.precioTotal = precioTotal
}

const presupuestoActualizado = await prisma.presupuesto.update({
  where: { codigo },
  data: updateData,
  // ...
})
```

## Resumen de Archivos a Modificar

1. **`src/app/local/presupuestos/[codigo]/editar/page.tsx`** - Principal (agregar estados, funciones, modal)
2. **`src/app/api/presupuestos/[codigo]/route.ts`** - Permitir actualizar items en PATCH

## Estimación

- **Tiempo:** 3-4 horas
- **Complejidad:** Alta
- **Testing:** 1 hora adicional

## Punto Clave

**PRECARGAR valores:** Los checkboxes, radios e inputs deben estar MARCADOS/COMPLETADOS con los valores que ya tiene el item en `presupuesto.items[index]`.

## Prioridad

Alta - Bloquea workflow de staff para modificar presupuestos incompletos
