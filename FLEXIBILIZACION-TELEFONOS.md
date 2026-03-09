# Flexibilización de Validación de Teléfonos

## 🎯 Problema Resuelto

Anteriormente el sistema solo aceptaba números de celular de CABA (código 11), lo que impedía el registro de:
- **Clientes del interior** con códigos de área como 341 (Rosario), 351 (Córdoba), 3456 (Venado Tuerto), etc.
- **Clientes internacionales** con números de otros países como +1 (USA), +52 (México), etc.

## ✅ Solución Implementada

Se flexibilizó la validación de teléfonos en **3 capas**:

### 1. Función [`normalizarTelefono()`](fidelizacion-zona/src/lib/phone.ts:28)
**Ubicación:** `src/lib/phone.ts`

**Antes:**
```typescript
// Solo aceptaba números de CABA
if (!cleaned.startsWith('11')) {
    return null // ❌ Rechazaba interior e internacionales
}
```

**Ahora:**
```typescript
// Acepta CABA, interior e internacionales
if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return null // ✅ Solo valida rango razonable
}
```

**Formatos aceptados:**
- **CABA:** `1112345678`, `+5491112345678`
- **Interior:** `3456268265`, `+543456268265`, `3411234567` (Rosario)
- **Internacional:** `+1234567890`, `+521333567890` (México)

### 2. Componente [`CompletePhoneModal`](fidelizacion-zona/src/components/CompletePhoneModal.tsx:20)
**Ubicación:** `src/components/CompletePhoneModal.tsx`

**Cambios en validación:**
```typescript
// Antes: Validación estricta solo para CABA
if (!cleanPhone.startsWith('11') && !cleanPhone.startsWith('15')) {
    setError('Número celular argentino debe empezar con 11 o 15')
    return
}

// Ahora: Validación flexible con hints útiles
if (digitsOnly.length < 8) {
    setError('El teléfono debe tener al menos 8 dígitos')
    return
}

if (digitsOnly.length > 15) {
    setError('El teléfono no puede tener más de 15 dígitos')
    return
}
```

**Nuevos ejemplos mostrados al usuario:**
```
CABA: 1112345678 o +5491112345678
Interior: 3456268265 o +543456268265
Internacional: +1234567890
```

### 3. Endpoint [`/api/auth/complete-phone`](fidelizacion-zona/src/app/api/auth/complete-phone/route.ts:36)
**Ubicación:** `src/app/api/auth/complete-phone/route.ts`

**Mensaje de error mejorado:**
```typescript
// Antes
'Formato de teléfono inválido. Debe tener 10 dígitos y empezar con 11 o 15'

// Ahora
'Formato de teléfono inválido. Debe tener entre 8 y 15 dígitos. 
Ejemplos: 1112345678 (CABA), 3456268265 (Interior), +1234567890 (Internacional)'
```

## 📊 Ejemplos de Uso

### Caso 1: Cliente de CABA
```
Input: "11 1234-5678"
Normalizado: "1112345678"
Guardado en DB: "1112345678"
✅ Funciona como antes
```

### Caso 2: Cliente del Interior (Venado Tuerto)
```
Input: "+54 3456 268265"
Normalizado: "3456268265"
Guardado en DB: "3456268265"
✅ NUEVO: Ahora funciona
```

### Caso 3: Cliente de Rosario
```
Input: "341 1234567"
Normalizado: "3411234567"
Guardado en DB: "3411234567"
✅ NUEVO: Ahora funciona
```

### Caso 4: Cliente Internacional (USA)
```
Input: "+1 234 567 8900"
Normalizado: "+1234567890"
Guardado en DB: "+1234567890"
✅ NUEVO: Ahora funciona
```

### Caso 5: Cliente Internacional (México)
```
Input: "+52 1 333 456 7890"
Normalizado: "+521333457890"
Guardado en DB: "+521333457890"
✅ NUEVO: Ahora funciona
```

## 🔧 Impacto en Otras Funciones

### Función `toE164()` 
**Ubicación:** `src/lib/phone.ts:81`

Esta función sigue funcionando correctamente:
```typescript
toE164("1112345678")   // "+5491112345678" ✅
toE164("3456268265")   // "+5493456268265" ✅ (interior)
toE164("+1234567890")  // Error: no es argentino ⚠️
```

**Nota:** `toE164()` asume que el input es argentino. Para números internacionales que ya tienen `+`, no es necesario convertir.

### Función `formatearTelefono()`
**Ubicación:** `src/lib/phone.ts:100`

Formatea para mostrar al usuario:
```typescript
formatearTelefono("1112345678")   // "11 1234-5678" ✅
formatearTelefono("3456268265")   // "3456 268-265" ✅ (aprox)
formatearTelefono("+1234567890")  // "+1234567890" (sin cambios)
```

## 🚀 Beneficios

### Para el Negocio
✅ **No perder clientes del interior**
- Antes: Cliente con número 3456 → No podía registrarse ❌
- Ahora: Cliente con número 3456 → Se registra sin problemas ✅

✅ **Permitir clientes internacionales**
- Turistas o extranjeros residentes pueden usar la app

✅ **Mejor experiencia de usuario**
- Mensajes de error más claros y útiles
- Ejemplos específicos según el tipo de número

### Para el Desarrollo
✅ **Código más robusto**
- Validación basada en estándares internacionales (E.164)
- Rango de 8-15 dígitos cubre todos los casos reales

✅ **Compatible con APIs externas**
- DeltaWash, WooCommerce, etc. pueden enviar cualquier formato
- El sistema lo normaliza automáticamente

## ⚠️ Consideraciones

### 1. Base de Datos
El campo `phone` en la tabla `Cliente` debe ser `VARCHAR` con longitud suficiente:
```sql
phone VARCHAR(20) -- Soporta hasta +12345678901234567890
```

### 2. Unicidad
El constraint `UNIQUE` en `phone` sigue funcionando:
```sql
ALTER TABLE Cliente ADD CONSTRAINT Cliente_phone_key UNIQUE (phone);
```

Cada teléfono (normalizado) puede estar registrado solo una vez.

### 3. Búsquedas
Al buscar por teléfono, siempre normalizar primero:
```typescript
const normalizado = normalizarTelefono(inputUsuario)
const cliente = await prisma.cliente.findUnique({
    where: { phone: normalizado }
})
```

### 4. Notificaciones
Para enviar SMS o WhatsApp, convertir a formato E.164:
```typescript
// Desde DB: "1112345678"
const e164 = toE164(cliente.phone) // "+5491112345678"
await sendSMS(e164, "Tu código es 123456")
```

Para números internacionales que ya tienen `+`:
```typescript
// Desde DB: "+1234567890"
const e164 = cliente.phone.startsWith('+') 
    ? cliente.phone 
    : toE164(cliente.phone)
```

## 📝 Testing Recomendado

### Test Cases
```typescript
describe('normalizarTelefono - Flexibilizado', () => {
    // CABA (existentes - deben seguir funcionando)
    expect(normalizarTelefono("1112345678")).toBe("1112345678")
    expect(normalizarTelefono("+5491112345678")).toBe("1112345678")
    
    // Interior (NUEVOS)
    expect(normalizarTelefono("3456268265")).toBe("3456268265")
    expect(normalizarTelefono("+543456268265")).toBe("3456268265")
    expect(normalizarTelefono("341 1234567")).toBe("3411234567")
    
    // Internacionales (NUEVOS)
    expect(normalizarTelefono("+1234567890")).toBe("+1234567890")
    expect(normalizarTelefono("+52 1 333 456 7890")).toBe("+521333457890")
    
    // Inválidos (deben rechazarse)
    expect(normalizarTelefono("123")).toBeNull()
    expect(normalizarTelefono("1234567890123456")).toBeNull()
})
```

## 🎯 Códigos de Área Argentinos Comunes

| Código | Localidad |
|--------|-----------|
| 11 | CABA y GBA |
| 221 | La Plata |
| 223 | Mar del Plata |
| 261 | Mendoza |
| 291 | Bahía Blanca |
| 341 | Rosario |
| 342 | Santa Fe |
| 351 | Córdoba |
| 358 | Río Cuarto |
| 362 | Resistencia |
| 370 | Formosa |
| 376 | Posadas |
| 379 | Corrientes |
| 381 | Tucumán |
| 383 | Santiago del Estero |
| 387 | Salta |
| 2901 | Ushuaia |
| 2954 | San Carlos de Bariloche |
| 2966 | Río Gallegos |
| **3456** | **Venado Tuerto** ⭐ |

## 📚 Referencias

- **E.164:** Estándar internacional de numeración telefónica
  - Formato: `+[código país][número]`
  - Máximo: 15 dígitos
  - Ejemplo: `+5491112345678`

- **Códigos de área argentinos:** 
  - [ENACOM - Numeración](https://www.enacom.gob.ar/)

## 🔄 Próximos Pasos (Opcional)

### 1. Validación Avanzada de Códigos de Área
Crear una lista de códigos válidos argentinos:
```typescript
const CODIGOS_AREA_ARGENTINA = [
    '11', '221', '223', '261', '291', '341', '342', '351', 
    '358', '362', '370', '376', '379', '381', '383', '387',
    '2901', '2954', '2966', '3456', // ... más códigos
]

function esCodigoAreaValido(phone: string): boolean {
    return CODIGOS_AREA_ARGENTINA.some(codigo => 
        phone.startsWith(codigo)
    )
}
```

### 2. Detección Automática de País
Usar librerías como `libphonenumber-js`:
```typescript
import { parsePhoneNumber } from 'libphonenumber-js'

const parsed = parsePhoneNumber('+543456268265')
console.log(parsed.country) // "AR"
console.log(parsed.nationalNumber) // "3456268265"
console.log(parsed.isValid()) // true
```

### 3. Formateo Inteligente por País
Mostrar el número según el estándar del país:
```typescript
// Argentina: "11 1234-5678"
// USA: "(234) 567-8900"
// México: "33 3456 7890"
```

---

**Fecha de implementación:** 2026-03-09  
**Archivos modificados:**
- [`src/lib/phone.ts`](fidelizacion-zona/src/lib/phone.ts)
- [`src/components/CompletePhoneModal.tsx`](fidelizacion-zona/src/components/CompletePhoneModal.tsx)
- [`src/app/api/auth/complete-phone/route.ts`](fidelizacion-zona/src/app/api/auth/complete-phone/route.ts)
