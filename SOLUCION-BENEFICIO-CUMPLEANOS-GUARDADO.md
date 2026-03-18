# Solución: Problema de Guardado de Configuración de Cumpleaños en Beneficios

## 🐛 Problema Reportado

Al configurar el descuento por cumpleaños en el panel de beneficios:
1. Se ingresaban los datos (días antes, días después, porcentaje, etc.)
2. Se presionaba "Guardar"
3. Al reabrir para modificar, los campos aparecían reseteados
4. La configuración no se persistía en la base de datos

## 🔍 Causa Raíz

El backend **NO** estaba recibiendo ni guardando el objeto `condiciones` completo que enviaba el formulario.

### Frontend (BeneficioForm.tsx)
```typescript
// ✅ El frontend SÍ enviaba todo correctamente
const body = {
  nombre,
  descripcionCaja,
  tipo,
  descuento: ...,
  icono,
  descripcion,
  maxPorDia,
  usoUnico,
  activo,
  niveles: nivelesSeleccionados,
  condiciones: esBeneficioCumpleanos ? condiciones : undefined, // ✅ Enviaba este objeto
}
```

### Backend (route.ts) - ANTES ❌
```typescript
const body = await req.json()
const {
  nombre,
  descripcionCaja,
  tipo,
  descuento,
  // ... otros campos
  niveles,
  // ❌ FALTABA: condiciones  <-- No se extraía del body
} = body

// ❌ Se construía manualmente, IGNORANDO lo que venía del body
const condiciones: any = {
  tipo,
  icono: icono || '🎁',
  descripcion: descripcion || '',
  maxPorDia: maxPorDia || 0,
  usoUnico: usoUnico || false,
}
```

**Resultado:** Los campos de cumpleaños (diasAntes, diasDespues, requiereFechaCumpleanos, etc.) se perdían completamente.

## ✅ Solución Implementada

Modificados 2 archivos:

### 1. POST `/api/admin/beneficios` - Crear beneficio
**Archivo:** `src/app/api/admin/beneficios/route.ts`

```typescript
const body = await req.json()
const {
  nombre,
  descripcionCaja,
  tipo,
  descuento,
  icono,
  descripcion,
  maxPorDia,
  usoUnico,
  activo,
  requiereEstadoExterno,
  estadoExternoTrigger,
  localDestinoId,
  niveles,
  condiciones: condicionesBody, // ✅ NUEVO: Extraer del body
} = body

// ✅ NUEVO: Priorizar objeto condiciones del body
let condiciones: any

if (condicionesBody && typeof condicionesBody === 'object') {
  // Si viene completo, usarlo (casos de cumpleaños)
  condiciones = condicionesBody
  console.log('[BENEFICIO] Creando con condiciones del body:', condiciones)
} else {
  // Si no, construir desde campos individuales (compatibilidad)
  condiciones = {
    tipo,
    icono: icono || '🎁',
    descripcion: descripcion || '',
    maxPorDia: maxPorDia || 0,
    usoUnico: usoUnico || false,
  }
  if (tipo === 'DESCUENTO') {
    condiciones.descuento = descuento
  }
}
```

### 2. PATCH `/api/admin/beneficios/[id]` - Actualizar beneficio
**Archivo:** `src/app/api/admin/beneficios/[id]/route.ts`

```typescript
const body = await req.json()
const {
  nombre,
  descripcionCaja,
  tipo,
  descuento,
  icono,
  descripcion,
  maxPorDia,
  usoUnico,
  activo,
  requiereEstadoExterno,
  estadoExternoTrigger,
  localDestinoId,
  niveles,
  condiciones: condicionesBody, // ✅ NUEVO: Extraer del body
} = body

const beneficioExistente = await prisma.beneficio.findUnique({
  where: { id: params.id },
})

const condicionesActuales = beneficioExistente.condiciones as any
let condiciones: any

// ✅ NUEVO: Priorizar objeto condiciones del body
if (condicionesBody && typeof condicionesBody === 'object') {
  // Merge con las actuales para no perder datos
  condiciones = {
    ...condicionesActuales,
    ...condicionesBody,
  }
  console.log('[BENEFICIO] Usando condiciones del body:', condiciones)
} else {
  // Si no, construir desde campos individuales
  condiciones = {
    tipo: tipo || condicionesActuales?.tipo || 'OTRO',
    icono: icono !== undefined ? icono : (condicionesActuales?.icono || '🎁'),
    descripcion: descripcion !== undefined ? descripcion : (condicionesActuales?.descripcion || ''),
    maxPorDia: maxPorDia !== undefined ? maxPorDia : (condicionesActuales?.maxPorDia || 0),
    usoUnico: usoUnico !== undefined ? usoUnico : (condicionesActuales?.usoUnico || false),
  }
  if (tipo === 'DESCUENTO' || condicionesActuales?.tipo === 'DESCUENTO') {
    condiciones.descuento = descuento !== undefined ? descuento : condicionesActuales?.descuento
  }
}
```

## 🎯 Beneficios

### ✅ Ahora funciona:
1. **Crear** beneficio de cumpleaños → Se guarda completo
2. **Editar** beneficio de cumpleaños → Se actualiza correctamente
3. **Reabrir** formulario → Los campos aparecen con los valores guardados

### ✅ Compatibilidad hacia atrás:
- Beneficios creados con el sistema anterior siguen funcionando
- Beneficios simples (sin objeto condiciones) se construyen como antes
- No se rompe nada existente

## 📊 Qué se guarda ahora en `condiciones` JSON

### Beneficio normal:
```json
{
  "tipo": "DESCUENTO",
  "descuento": 0.15,
  "icono": "🎁",
  "descripcion": "15% de descuento",
  "maxPorDia": 1,
  "usoUnico": false
}
```

### Beneficio de cumpleaños:
```json
{
  "tipo": "DESCUENTO",
  "descuento": 0.15,
  "icono": "🎂",
  "descripcion": "15% en tu cumpleaños",
  "maxPorDia": 1,
  "usoUnico": false,
  "requiereFechaCumpleanos": true,
  "diasAntes": 3,
  "diasDespues": 3,
  "porcentajeDescuento": 15,
  "diasMinimosEntreUsos": 365,
  "mensaje": "¡Feliz cumpleaños! Disfrutá tu 15% de descuento"
}
```

## ✅ Testing

Para probar que funciona:

1. Ir a `/admin/beneficios`
2. Crear/Editar un beneficio
3. Marcar checkbox "Es beneficio de cumpleaños"
4. Configurar días antes: 3, días después: 3, descuento: 15%
5. Guardar
6. Verificar en logs del servidor: `[BENEFICIO] Creando con condiciones del body:`
7. Recargar página y volver a editar
8. **Resultado esperado:** Los campos aparecen con los valores guardados

## 🚀 Deploy

```bash
git add .
git commit -m "fix: Guardar correctamente configuración de cumpleaños en beneficios"
git push
```

Vercel detectará el push y hará deploy automáticamente.

---

**Estado:** ✅ Resuelto
**Fecha:** 2026-03-18
**Archivos modificados:** 
- `src/app/api/admin/beneficios/route.ts`
- `src/app/api/admin/beneficios/[id]/route.ts`
