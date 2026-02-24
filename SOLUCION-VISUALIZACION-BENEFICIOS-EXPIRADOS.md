# Solución: Visualización de Beneficios Expirados vs Usados

## Problema
Todos los beneficios del día aparecían como "expirados", cuando en realidad:
- Solo el beneficio del **lavadero** (cafe-lavadero) debe mostrar "Expirado" si pasaron las 19:00
- Los **otros beneficios normales** deben mostrar "Usado" si ya se canjearon hoy

## Causa Raíz
El frontend no distinguía entre:
1. **Beneficios usados**: Ya alcanzaron su límite diario (`usosHoy >= maxPorDia`)
2. **Beneficios expirados**: No disponibles por restricción de tiempo (ej: lavadero después de 19:00)

Todos se mostraban con el badge "⏰ Expirado" incorrectamente.

## Solución Implementada

### 1. Backend: Agregar Propiedad `expirado`
**Archivo**: [`src/app/api/pass/beneficios-disponibles/route.ts`](src/app/api/pass/beneficios-disponibles/route.ts)

```typescript
// Detectar si el beneficio expiró por tiempo (ej: lavadero después de 19:00)
let expirado = false
if (!estaDisponible && !yaUsado && cantidadUsosHoy === 0 && beneficio.requiereEstadoExterno) {
    // Verificar específicamente el beneficio del lavadero
    if (beneficio.id === 'beneficio-20porciento-lavadero') {
        const ahora = new Date()
        const cierreHoy = new Date(ahora)
        cierreHoy.setHours(19, 0, 0, 0) // 19:00 Argentina
        expirado = ahora > cierreHoy
    }
}
```

**Lógica**:
- Si el beneficio NO está disponible, NO fue usado como único, NO tiene usos hoy, y requiere estado externo
- Y es específicamente el beneficio del lavadero (`beneficio-20porciento-lavadero`)
- Y la hora actual es después de las 19:00
- Entonces `expirado = true`

### 2. Frontend: Distinguir Visualización
**Archivo**: [`src/app/pass/page.tsx`](src/app/pass/page.tsx)

#### Interface actualizada:
```typescript
interface BeneficioDisponible {
  // ... otros campos
  yaUsado?: boolean
  expirado?: boolean  // ← NUEVO
}
```

#### Lógica de badges:
```typescript
{beneficio.yaUsado ? (
  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">
    ✓ Usado
  </span>
) : beneficio.expirado ? (
  <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-semibold">
    ⏰ Expirado
  </span>
) : (
  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">
    ✓ Usado
  </span>
)}
```

#### Mensajes descriptivos:
```typescript
{beneficio.yaUsado
  ? `Beneficio de uso único ya utilizado`
  : beneficio.expirado
    ? `Beneficio expirado · Disponible solo hasta las 19:00`
    : `Ya usado hoy · ${beneficio.usosHoy}/${beneficio.maxPorDia} canje${beneficio.maxPorDia > 1 ? 's' : ''}`
}
```

## Comportamiento Esperado

### Caso 1: Beneficio del Lavadero (cafe-lavadero)
- **Antes de 19:00** + auto en lavadero + no usado hoy → ✅ **"Disponible"** (verde)
- **Antes de 19:00** + auto en lavadero + ya usado hoy → ✓ **"Usado"** (gris)
- **Después de 19:00** (sin importar si auto está en lavadero) → ⏰ **"Expirado"** (naranja)

### Caso 2: Beneficios Normales
- **No usado hoy** + cumple condiciones → ✅ **"Disponible"** (verde)
- **Ya usado hoy** (`usosHoy >= maxPorDia`) → ✓ **"Usado"** (gris)
- **Uso único ya utilizado** → No se muestra (se puede ver en historial)

### Caso 3: Beneficios de Uso Único
- **Nunca usado** + cumple condiciones → ✅ **"Disponible"** (verde)
- **Ya usado alguna vez** → ✓ **"Usado"** (gris) - No se muestra en lista de beneficios del día

## Archivos Modificados
1. ✅ [`src/app/api/pass/beneficios-disponibles/route.ts`](src/app/api/pass/beneficios-disponibles/route.ts) - Líneas 98-106
2. ✅ [`src/app/pass/page.tsx`](src/app/pass/page.tsx) - Líneas 12-24 y 437-471

## Testing Manual

### Escenario 1: Beneficio del lavadero antes de 19:00
```bash
# Con auto en lavadero, antes de 19:00
1. Iniciar sesión como cliente con auto registrado
2. Verificar que auto esté en estado LISTO (DeltaWash)
3. Verificar que beneficio aparezca como "✅ Disponible"
4. Canjear beneficio
5. Verificar que ahora aparezca como "✓ Usado"
```

### Escenario 2: Beneficio del lavadero después de 19:00
```bash
# Con auto en lavadero, después de 19:00
1. Cambiar hora del servidor a > 19:00 (o esperar)
2. Verificar que beneficio aparezca como "⏰ Expirado"
3. Verificar mensaje: "Disponible solo hasta las 19:00"
```

### Escenario 3: Beneficio normal usado
```bash
# Beneficio con maxPorDia = 1
1. Canjear beneficio (ej: "Café gratis")
2. Verificar que aparezca como "✓ Usado"
3. Verificar mensaje: "Ya usado hoy · 1/1 canje"
```

## Ventajas de Esta Solución
1. ✅ **Claridad**: Los clientes entienden por qué no pueden usar un beneficio
2. ✅ **Consistencia**: La lógica en [`beneficios.ts`](src/lib/beneficios.ts:45-53) ya estaba correcta
3. ✅ **Extensible**: Fácil agregar otros beneficios con restricciones horarias
4. ✅ **UX mejorada**: Badges y mensajes específicos para cada caso

## Código Relacionado
- **Lógica de beneficios**: [`src/lib/beneficios.ts`](src/lib/beneficios.ts:45-53) - Ya maneja correctamente la expiración a las 19:00
- **Estado de autos**: [`src/app/api/webhook/deltawash/route.ts`](src/app/api/webhook/deltawash/route.ts) - Webhook que actualiza el estado del auto
- **Eventos de escaneo**: [`src/app/api/otp/validar/route.ts`](src/app/api/otp/validar/route.ts) - Registra cuándo se usa un beneficio

## Próximos Pasos
1. ✅ Testing en desarrollo
2. ⏳ Commit y push
3. ⏳ Deploy a producción
4. ⏳ Testing con clientes reales
5. ⏳ Monitorear logs para validar comportamiento
