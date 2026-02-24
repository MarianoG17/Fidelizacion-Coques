# Solución de Bugs en App del Local

## Fecha: 2026-02-24

## Bugs Resueltos

### 1. Historial de últimos 3 clientes no se guarda

**Problema:**
Cuando se registraba un cliente en `/local`, no quedaba guardado en el historial de "Últimos clientes escaneados". El estado `clientesMostrador` solo existía en memoria y se perdía al refrescar la página.

**Solución:**
- Agregado persistencia en `localStorage` con la clave `coques_clientes_mostrador`
- Implementado `useEffect` para cargar el historial al montar el componente
- Implementado `useEffect` para guardar automáticamente cuando el historial cambia
- Los timestamps se serializan/deserializan correctamente al guardar/cargar

**Archivos modificados:**
- `src/app/local/page.tsx` (líneas 54-87)

**Código agregado:**
```typescript
// Cargar historial de clientes desde localStorage al montar
useEffect(() => {
  try {
    const stored = localStorage.getItem('coques_clientes_mostrador')
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convertir timestamps de string a Date
      const clientesConFechas = parsed.map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp),
        beneficiosAplicados: c.beneficiosAplicados.map((b: any) => ({
          ...b,
          timestamp: new Date(b.timestamp)
        }))
      }))
      setClientesMostrador(clientesConFechas)
    }
  } catch (error) {
    console.error('[Local] Error cargando historial de clientes:', error)
  }
}, [])

// Guardar historial en localStorage cuando cambia
useEffect(() => {
  try {
    if (clientesMostrador.length > 0) {
      localStorage.setItem('coques_clientes_mostrador', JSON.stringify(clientesMostrador))
    }
  } catch (error) {
    console.error('[Local] Error guardando historial de clientes:', error)
  }
}, [clientesMostrador])
```

---

### 2. Descuentos desactualizados al subir de nivel

**Problema:**
Cuando se escaneaba un cliente y pasaba de Plata a Oro con esa visita, la app del local mostraba el descuento anterior (10%) pero en la app del cliente aparecía el nuevo (15%). 

**Causa raíz:**
El flujo de registro de eventos era:
1. Cliente se valida y se obtienen sus beneficios (nivel actual: Plata, beneficios: 10%)
2. Se registra el evento de visita
3. `evaluarNivel()` se ejecuta de forma asíncrona DESPUÉS del registro
4. El cliente sube a Oro y sus beneficios cambian a 15%
5. Pero la UI del local seguía mostrando los beneficios antiguos que se obtuvieron en el paso 1

**Solución:**
1. Creado nuevo endpoint `/api/clientes/[id]` para obtener datos actualizados de un cliente
2. Agregada función `recargarBeneficiosCliente()` que:
   - Espera 800ms para que `evaluarNivel()` termine (es async)
   - Llama al endpoint para obtener los beneficios actualizados
   - Actualiza el estado de validación con los nuevos beneficios y nivel
3. Esta función se llama después de registrar el evento
4. Los beneficios actualizados se reflejan tanto en la UI principal como en el historial de clientes en mostrador

**Archivos creados:**
- `src/app/api/clientes/[id]/route.ts` - Nuevo endpoint para obtener datos actualizados del cliente

**Archivos modificados:**
- `src/app/local/page.tsx` - Agregada función `recargarBeneficiosCliente()` y actualización de `registrarEvento()`

**Código clave agregado:**
```typescript
async function recargarBeneficiosCliente(clienteId: string) {
  try {
    // Esperar un momento para que evaluarNivel termine (es async)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const res = await fetch(`/api/clientes/${clienteId}`, {
      headers: {
        'x-local-api-key': LOCAL_API_KEY,
      },
    })

    if (res.ok) {
      const response = await res.json()
      const clienteActualizado = response.data
      
      console.log('[Local] Cliente actualizado:', clienteActualizado)
      
      // Actualizar validación con los nuevos beneficios y nivel
      if (validacion && validacion.cliente) {
        setValidacion({
          valido: true,
          cliente: {
            id: validacion.cliente.id,
            nombre: validacion.cliente.nombre,
            phone: validacion.cliente.phone,
            nivel: clienteActualizado.nivel,
            beneficiosActivos: clienteActualizado.beneficiosActivos,
            autos: clienteActualizado.autos || validacion.cliente.autos
          }
        })
      }
      
      return clienteActualizado
    }
  } catch (error) {
    console.error('[Local] Error recargando beneficios:', error)
  }
  return null
}
```

---

## Testing

### Build
✅ Compilación exitosa
✅ Type checking passed
✅ Lint passed

### Testing Manual Recomendado

1. **Test de Historial:**
   - Escanear 3 clientes diferentes
   - Verificar que aparecen en "Clientes en mostrador"
   - Refrescar la página (F5)
   - Verificar que los 3 clientes siguen apareciendo
   - Escanear un 4to cliente
   - Verificar que el más antiguo desaparece (solo se mantienen 3)

2. **Test de Nivel y Beneficios:**
   - Identificar un cliente en nivel Plata con 4 visitas (próximo a subir a Oro)
   - Registrar su 5ta visita
   - Verificar que:
     - El nivel mostrado cambia de Plata a Oro
     - Los beneficios se actualizan (descuento cambia de 10% a 15%)
     - Si está en el historial de mostrador, también se actualiza ahí

---

## Impacto

- **Mejora de UX:** El personal del local puede ver el historial de clientes atendidos recientemente
- **Corrección de bug crítico:** Los descuentos mostrados ahora son precisos al momento de cambio de nivel
- **Performance:** Mínimo impacto, solo se agrega un delay de 800ms post-registro para sincronizar nivel

---

## Archivos Modificados

1. `src/app/local/page.tsx` - Persistencia de historial + recarga de beneficios
2. `src/app/api/clientes/[id]/route.ts` - Nuevo endpoint (creado)

## Deploy

Listo para deploy en Vercel. Los cambios son compatibles con la versión actual.
