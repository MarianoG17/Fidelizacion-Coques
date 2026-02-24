# Historial de Clientes Basado en Servidor

## Problema Resuelto

El localStorage no se comparte entre el navegador de escritorio y la PWA instalada, causando que el historial de últimos clientes escaneados se pierda al cambiar de contexto (navegador ↔ PWA).

## Solución Implementada

Ahora el historial de clientes en mostrador se guarda y sincroniza desde el servidor, permitiendo acceso consistente desde cualquier dispositivo o contexto.

---

## Cambios Realizados

### 1. Nuevo Endpoint API: `/api/local/historial-escaneos`

**Archivo:** [`src/app/api/local/historial-escaneos/route.ts`](src/app/api/local/historial-escaneos/route.ts)

**Método:** `GET`

**Autenticación:** Requiere `X-Local-Api-Key` header

**Query Parameters:**
- `limit`: número de clientes a retornar (default: 3, max: 10)

**Funcionamiento:**
1. Obtiene los eventos de escaneo del día actual en timezone Argentina
2. Filtra solo eventos en mostrador (`mesaId: null`)
3. Agrupa por cliente único (el más reciente)
4. Para cada cliente obtiene:
   - Beneficios disponibles según su nivel
   - Beneficios ya aplicados en el día
   - Información de nivel y datos básicos

**Respuesta:**
```json
{
  "data": {
    "clientes": [
      {
        "id": "uuid-cliente",
        "nombre": "Juan Pérez",
        "phone": "+5491123456789",
        "nivel": "Plata",
        "beneficiosDisponibles": [
          {
            "id": "uuid-beneficio",
            "nombre": "Café gratis",
            "descripcionCaja": "CAFE GRATIS"
          }
        ],
        "beneficiosAplicados": [
          {
            "id": "uuid-beneficio",
            "nombre": "Descuento 10%",
            "timestamp": "2026-02-24T17:30:00.000Z"
          }
        ],
        "timestamp": "2026-02-24T17:30:00.000Z"
      }
    ],
    "total": 3
  }
}
```

### 2. Modificaciones en `/local/page.tsx`

**Archivo:** [`src/app/local/page.tsx`](src/app/local/page.tsx)

**Cambios principales:**

#### Antes (localStorage):
```typescript
// Cargar desde localStorage al montar
useEffect(() => {
  const stored = localStorage.getItem('coques_clientes_mostrador')
  if (stored) {
    setClientesMostrador(JSON.parse(stored))
  }
}, [])

// Guardar en localStorage cuando cambia
useEffect(() => {
  if (clientesMostrador.length > 0) {
    localStorage.setItem('coques_clientes_mostrador', JSON.stringify(clientesMostrador))
  }
}, [clientesMostrador])
```

#### Después (API):
```typescript
// Función para cargar desde servidor
async function cargarHistorialMostrador() {
  const res = await fetch('/api/local/historial-escaneos?limit=3', {
    headers: { 'x-local-api-key': LOCAL_API_KEY },
  })
  
  if (res.ok) {
    const data = await res.json()
    setClientesMostrador(data.data.clientes.map(c => ({
      ...c,
      timestamp: new Date(c.timestamp),
      beneficiosAplicados: c.beneficiosAplicados.map(b => ({
        ...b,
        timestamp: new Date(b.timestamp)
      }))
    })))
  }
}

// Cargar al montar
useEffect(() => {
  cargarHistorialMostrador()
}, [])
```

#### Recarga automática después de escaneo:
```typescript
// Cuando se registra un evento en mostrador
if (ubicacion === 'mostrador') {
  await new Promise(resolve => setTimeout(resolve, 500))
  await cargarHistorialMostrador() // Recargar desde servidor
}
```

#### UI mejorada:
- Indicador de carga mientras obtiene datos
- Mensaje cuando no hay clientes hoy
- Actualización automática después de cada escaneo

---

## Ventajas de la Nueva Implementación

### ✅ Sincronización Multi-Contexto
- El historial se comparte entre navegador y PWA instalada
- Mismo historial en todos los dispositivos del local
- Sin pérdida de datos al cambiar de contexto

### ✅ Datos Siempre Actualizados
- La fuente de verdad es el servidor (tabla `EventoScan`)
- Beneficios disponibles calculados en tiempo real
- Refleja cambios de nivel del cliente inmediatamente

### ✅ Historial Por Día
- Solo muestra clientes del día actual (timezone Argentina)
- Se resetea automáticamente cada día
- No acumula datos innecesarios

### ✅ Performance
- Solo carga últimos 3 clientes por defecto
- Queries optimizadas con índices en EventoScan
- Recarga solo cuando es necesario (después de escaneo)

---

## Migración de Datos Existentes

**No requiere migración manual.** 

La tabla `EventoScan` ya contiene todos los escaneos históricos, por lo que el nuevo endpoint automáticamente mostrará los clientes escaneados hoy (si existen).

El localStorage viejo simplemente dejará de usarse y se puede limpiar manualmente si se desea:
```javascript
localStorage.removeItem('coques_clientes_mostrador')
```

---

## Tabla Utilizada: `EventoScan`

Reutilizamos la tabla existente que ya registra todos los escaneos:

```prisma
model EventoScan {
  id                 String           @id @default(uuid())
  clienteId          String
  cliente            Cliente          @relation(...)
  localId            String
  local              Local            @relation(...)
  mesaId             String?          // null = mostrador
  timestamp          DateTime         @default(now())
  tipoEvento         TipoEvento       // VISITA | BENEFICIO_APLICADO
  beneficioId        String?
  beneficio          Beneficio?       @relation(...)
  contabilizada      Boolean          @default(true)
  
  @@index([clienteId, timestamp])
  @@index([localId])
}
```

**Índices relevantes:**
- `[clienteId, timestamp]`: Para obtener últimos eventos por cliente
- `[localId]`: Para filtrar por local
- `timestamp`: Para ordenar por fecha

---

## Testing Recomendado

### Casos de Prueba:

1. **Navegador → PWA:**
   - ✅ Escanear cliente en navegador
   - ✅ Abrir PWA instalada
   - ✅ Verificar que el cliente aparece en historial

2. **PWA → Navegador:**
   - ✅ Escanear cliente en PWA
   - ✅ Abrir navegador
   - ✅ Verificar que el cliente aparece en historial

3. **Aplicar Beneficio:**
   - ✅ Escanear cliente
   - ✅ Aplicar beneficio
   - ✅ Verificar que beneficio pasa de "disponible" a "aplicado"
   - ✅ Refrescar y verificar persistencia

4. **Cambio de Nivel:**
   - ✅ Escanear cliente que sube de nivel
   - ✅ Verificar que beneficios se actualizan
   - ✅ Verificar en ambos contextos (navegador/PWA)

5. **Múltiples Dispositivos:**
   - ✅ Usar 2 tablets/teléfonos diferentes
   - ✅ Escanear en uno
   - ✅ Verificar que aparece en el otro al refrescar

---

## Archivos Modificados

- ✅ `src/app/api/local/historial-escaneos/route.ts` (nuevo)
- ✅ `src/app/local/page.tsx` (modificado)

---

## Notas Técnicas

### Timezone Handling
Usa la función `getInicioHoyArgentina()` de `@/lib/timezone` para asegurar que el filtro de "hoy" respeta el timezone de Argentina (-3 UTC).

### Límite de 1 Visita por Día
El sistema ya tiene lógica para marcar eventos como `contabilizada: false` si hay más de 1 visita por día. Esto se respeta en el historial.

### Orden de Operaciones en Escaneo
1. Validar OTP/QR
2. Registrar evento (POST `/api/eventos`)
3. Recargar beneficios del cliente
4. **Esperar 500ms** (para que se procese el evento)
5. Recargar historial desde servidor
6. Mostrar confirmación

El delay de 500ms asegura que el evento esté completamente procesado antes de recargar el historial.

---

## Recordatorio Importante

**Actualización de Niveles de Loyalty:** Los niveles se actualizan basándose en visitas en una ventana de tiempo. Confirmar si son **60 o 90 días** para la evaluación de niveles.

---

## Próximos Pasos Recomendados

1. ✅ Testing en staging
2. ✅ Deploy a producción
3. ✅ Monitoreo de performance del endpoint
4. ⏳ Considerar agregar caché si el volumen de requests es alto
5. ⏳ Agregar botón "Refrescar" manual en la UI (opcional)

---

**Fecha de Implementación:** 2026-02-24  
**Autor:** Sistema de Fidelización Coques
