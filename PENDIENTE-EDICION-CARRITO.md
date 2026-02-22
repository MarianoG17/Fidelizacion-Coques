# Pendiente: Edición de Productos en Carrito

## Objetivo
Permitir que staff pueda hacer click en un producto del carrito y editarlo (cambiar add-ons y campos de texto) sin tener que eliminarlo y agregarlo de nuevo.

## Implementación Requerida

### 1. Hook useCarrito
✅ Ya agregada función `actualizarItem()`

### 2. Carrito Page - Estados
Agregar:
```typescript
const [productoEditando, setProductoEditando] = useState<ItemCarrito | null>(null)
const [productoCompleto, setProductoCompleto] = useState<any>(null) // Datos completos de WooCommerce
const [addOnsEditando, setAddOnsEditando] = useState<any>({})
const [camposTextoEditando, setCamposTextoEditando] = useState<any>({})
const [cargandoProducto, setCargandoProducto] = useState(false)
```

### 3. Función para abrir edición
```typescript
async function abrirEdicionProducto(item: ItemCarrito) {
  setProductoEditando(item)
  setCargandoProducto(true)
  
  // Precargar valores actuales
  setAddOnsEditando(item.addOns || {})
  setCamposTextoEditando(item.camposTexto || {})
  
  try {
    // Cargar datos completos del producto desde WooCommerce
    const response = await fetch(`/api/woocommerce/tortas`)
    const data = await response.json()
    
    const producto = data.productos.find((p: any) => p.id === item.productoId)
    
    if (producto && item.varianteId) {
      // Cargar variaciones si es necesario
      const varResponse = await fetch(`/api/woocommerce/variaciones/${item.productoId}`)
      const varData = await varResponse.json()
      producto.variantes = varData.variantes
    }
    
    setProductoCompleto(producto)
  } catch (error) {
    console.error('Error cargando producto:', error)
    alert('Error al cargar los datos del producto')
    setProductoEditando(null)
  } finally {
    setCargandoProducto(false)
  }
}
```

### 4. Función para guardar cambios
```typescript
function guardarEdicion() {
  if (!productoEditando) return
  
  // Recalcular precio de add-ons
  let precioAddOns = 0
  if (productoCompleto?.addOns) {
    productoCompleto.addOns.forEach((addOn: any) => {
      const seleccionados = addOnsEditando[addOn.nombre] || []
      seleccionados.forEach((seleccion: any) => {
        const opcion = addOn.opciones.find((o: any) => 
          o.sku === seleccion.sku || o.etiqueta === seleccion.etiqueta
        )
        if (opcion) {
          precioAddOns += opcion.precio
        }
      })
    })
  }
  
  // Actualizar item en carrito
  actualizarItem(productoEditando.productoId, productoEditando.varianteId, {
    addOns: Object.keys(addOnsEditando).length > 0 ? addOnsEditando : undefined,
    precioAddOns: precioAddOns > 0 ? precioAddOns : undefined,
    camposTexto: Object.keys(camposTextoEditando).length > 0 ? camposTextoEditando : undefined,
  })
  
  // Cerrar modal
  cerrarEdicion()
}

function cerrarEdicion() {
  setProductoEditando(null)
  setProductoCompleto(null)
  setAddOnsEditando({})
  setCamposTextoEditando({})
}
```

### 5. Hacer productos clickeables
En el render de items, cambiar:
```typescript
// ANTES:
<div key={i} className="bg-white rounded-lg p-4">

// DESPUÉS:
<div 
  key={i} 
  onClick={() => abrirEdicionProducto(item)}
  className="bg-white rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
>
  {/* Agregar indicador visual */}
  <div className="text-xs text-gray-500 mb-2">
    ✏️ Click para editar
  </div>
```

### 6. Modal de Edición
Agregar al final del componente, antes del cierre:
```typescript
{/* Modal de edición */}
{productoEditando && (
  <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">Editar Producto</h2>
        <button onClick={cerrarEdicion} className="text-gray-500 text-2xl">×</button>
      </div>
      
      {/* Contenido */}
      <div className="p-6">
        {cargandoProducto ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando opciones...</p>
          </div>
        ) : productoCompleto ? (
          <>
            {/* Mostrar add-ons igual que en /tortas */}
            {productoCompleto.addOns?.map((addOn: any) => (
              <div key={addOn.nombre} className="mb-4">
                <h3 className="font-bold mb-2">{addOn.nombre}</h3>
                {addOn.opciones.map((opcion: any) => (
                  <label key={opcion.etiqueta} className="flex items-center gap-2 p-2">
                    <input 
                      type={addOn.tipo === 'radio' ? 'radio' : 'checkbox'}
                      checked={addOnsEditando[addOn.nombre]?.some((o: any) => o.etiqueta === opcion.etiqueta)}
                      onChange={() => {/* lógica toggle */}}
                    />
                    <span>{opcion.etiqueta}</span>
                    {opcion.precio > 0 && <span className="text-green-600">+${opcion.precio}</span>}
                  </label>
                ))}
              </div>
            ))}
            
            {/* Mostrar campos de texto */}
            {productoCompleto.camposTexto?.map((campo: any) => (
              <div key={campo.nombre} className="mb-4">
                <label className="block font-bold mb-2">{campo.nombre}</label>
                <input
                  type="text"
                  value={camposTextoEditando[campo.nombre] || ''}
                  onChange={(e) => setCamposTextoEditando(prev => ({
                    ...prev,
                    [campo.nombre]: e.target.value
                  }))}
                  placeholder={campo.placeholder}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            ))}
          </>
        ) : (
          <p className="text-center text-gray-600">Error cargando datos</p>
        )}
      </div>
      
      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2">
        <button 
          onClick={cerrarEdicion}
          className="flex-1 py-3 border rounded-lg font-bold"
        >
          Cancelar
        </button>
        <button 
          onClick={guardarEdicion}
          disabled={cargandoProducto}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold disabled:bg-gray-400"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  </div>
)}
```

## Estimación
- **Tiempo:** 2-3 horas
- **Complejidad:** Media-Alta
- **Archivos afectados:** 
  - `src/app/carrito/page.tsx` (principal)
  - `src/hooks/useCarrito.ts` (ya actualizado ✅)

## Alternativa Temporal
Por ahora, staff puede:
1. Eliminar producto del carrito
2. Ir a `/tortas`
3. Agregar nuevamente con opciones correctas

## Prioridad
Media - Mejora UX pero no bloquea funcionalidad
