# 🔧 Solución: Registro con Google + Teléfono

## 🎯 Problema Identificado

Cuando un cliente se registraba con Google y luego intentaba completar su número de teléfono, el sistema:

1. ❌ **Aceptaba números incompletos** - Números como "11", "5411", "54911" pasaban la validación del frontend
2. ❌ **No se actualizaba la sesión** - Después de guardar el teléfono, la sesión seguía con estado PRE_REGISTRADO
3. ❌ **Cliente quedaba en loop** - Volvía siempre a la pantalla de completar teléfono sin poder acceder

El cliente veía su cuenta como registrada en el admin, pero no podía terminar de loguearse.

## ✅ Soluciones Implementadas

### 1. Validación de Formato en Frontend
**Archivo:** [`src/components/CompletePhoneModal.tsx`](src/components/CompletePhoneModal.tsx)

Agregamos validación estricta de formato **antes** de enviar al backend:

```typescript
// Validar formato de teléfono
const cleanPhone = phone.replace(/\D/g, '')

// Validar longitud mínima
if (cleanPhone.length < 8) {
    setError('El teléfono debe tener al menos 8 dígitos')
    return
}

// Para números argentinos de celular, verificar formato
if (cleanPhone.length === 10) {
    // Debe empezar con 11 o 15
    if (!cleanPhone.startsWith('11') && !cleanPhone.startsWith('15')) {
        setError('Número celular argentino debe empezar con 11 o 15. Ej: 1112345678')
        return
    }
}
```

**Formatos válidos aceptados:**
- ✅ `1112345678` (10 dígitos)
- ✅ `1512345678` (10 dígitos, se normaliza a 11)
- ✅ `541112345678` (12 dígitos con código país)
- ✅ `+5491112345678` (13 dígitos formato internacional)

**Formatos rechazados:**
- ❌ `11` (muy corto)
- ❌ `5411` (incompleto)
- ❌ `54911` (incompleto)
- ❌ `3312345678` (no es celular de CABA/GBA)

### 2. Mensajes de Error Mejorados
**Archivo:** [`src/app/api/auth/complete-phone/route.ts`](src/app/api/auth/complete-phone/route.ts)

Mensajes más descriptivos y logging para debugging:

```typescript
console.log('[COMPLETE-PHONE] Request from user:', session.user.email, 'phone:', phone)
console.log('[COMPLETE-PHONE] Normalized phone:', normalizedPhone)

if (!normalizedPhone) {
    return NextResponse.json(
        { error: 'Formato de teléfono inválido. Debe tener 10 dígitos y empezar con 11 o 15. Ejemplo: 1112345678' },
        { status: 400 }
    )
}
```

### 3. Actualización Automática de Sesión JWT
**Archivo:** [`src/lib/auth-options.ts`](src/lib/auth-options.ts)

El problema principal era que NextAuth usa JWT y cachea el token. Después de actualizar el teléfono en la DB, el token seguía con el teléfono temporal.

**Solución:** Forzar consulta a la DB cuando el teléfono es temporal:

```typescript
async jwt({ token, user, account, trigger }) {
    // ...
    
    // CLAVE: Consultar BD si el teléfono es temporal
    const hasTemporaryPhone = token.phone && String(token.phone).includes('TEMP')
    const needsDbQuery = isFirstLogin || !token.userId || !!account || hasTemporaryPhone || trigger === 'update'
    
    if (needsDbQuery && token.email) {
        const cliente = await prisma.cliente.findUnique({
            where: { email: token.email }
        })

        if (cliente) {
            token.phone = cliente.phone
            // Solo necesita completar teléfono si es temporal
            token.needsPhone = cliente.phone?.includes('TEMP') || false
        }
    }
    
    return token
}
```

**Flujo actualizado:**

```
1. Usuario completa teléfono → Backend actualiza DB
2. Modal hace hard redirect → window.location.href = '/pass'
3. NextAuth ejecuta callback JWT
4. Detecta token.phone.includes('TEMP') = true
5. Consulta DB y obtiene teléfono actualizado
6. Actualiza token con needsPhone = false
7. Usuario ve su Pass normalmente ✅
```

### 4. Hard Redirect para Forzar Regeneración
**Archivo:** [`src/components/CompletePhoneModal.tsx`](src/components/CompletePhoneModal.tsx)

Cambiamos de `router.push()` a `window.location.href` para forzar full page reload:

```typescript
// IMPORTANTE: Hacer un hard redirect para forzar a NextAuth a regenerar la sesión
window.location.href = '/pass'
```

Esto fuerza a NextAuth a:
1. ✅ Validar el token de sesión
2. ✅ Ejecutar el callback `jwt()` que consulta la DB
3. ✅ Regenerar el token con los datos actualizados (`needsPhone: false`)

## 🧪 Cómo Probar

### Escenario: Registro nuevo con Google

1. **Limpiar sesión:**
   ```javascript
   // En la consola del navegador
   localStorage.clear()
   sessionStorage.clear()
   // Cerrar sesión de Google si es necesario
   ```

2. **Registrarse con Google:**
   - Ir a `/login`
   - Click en "Continuar con Google"
   - Elegir cuenta de Google
   - Se crea cliente con `estado: PRE_REGISTRADO` y `phone: +549TEMP123456789`

3. **Completar teléfono:**
   - Debe aparecer modal pidiendo teléfono
   - Probar números inválidos:
     - `11` → ❌ "El número es muy corto"
     - `5411` → ❌ "El número es muy corto"
     - `54911` → ❌ "El número es muy corto"
   - Ingresar número válido: `1112345678` ✅
   - Sistema debe:
     - Actualizar DB con teléfono normalizado
     - Redirigir a `/pass`
     - Mostrar Pass sin volver a pedir teléfono

4. **Verificar en Admin:**
   - Ir a `/admin`
   - Buscar el cliente recién registrado
   - Debe mostrar:
     - ✅ Estado: ACTIVO
     - ✅ Teléfono: 1112345678 (sin TEMP)
     - ✅ Auth Provider: Google

### Casos de Prueba

| Entrada | Resultado Esperado |
|---------|-------------------|
| `1112345678` | ✅ Acepta (formato estándar) |
| `1512345678` | ✅ Acepta (normaliza a 11) |
| `+5491112345678` | ✅ Acepta (formato internacional) |
| `11 1234-5678` | ✅ Acepta (limpia espacios) |
| `11` | ❌ Rechaza (muy corto) |
| `5411` | ❌ Rechaza (incompleto) |
| `54911` | ❌ Rechaza (incompleto) |
| `112345678` | ❌ Rechaza (9 dígitos, falta 1) |
| `3312345678` | ❌ Rechaza (código de área de Rosario, no es celular CABA) |

## 🐛 Debugging

Si el problema persiste, revisar logs en la consola del navegador y del servidor:

### Frontend (Console):
```
[CompletePhoneModal] Teléfono actualizado exitosamente: {...}
[CompletePhoneModal] Redirigiendo para actualizar sesión...
```

### Backend (Server logs):
```
[COMPLETE-PHONE] Request from user: email@example.com phone: 1112345678
[COMPLETE-PHONE] Normalized phone: 1112345678
[COMPLETE-PHONE] Existing client with this phone: NO
[COMPLETE-PHONE] Current client estado: PRE_REGISTRADO phone: +549TEMP123456789
[COMPLETE-PHONE] Cliente actualizado exitosamente: { id, email, phone: '1112345678', estado: 'ACTIVO', hasOtpSecret: true }

[AUTH-JWT] Consulting DB for: email@example.com reason: { hasTemporaryPhone: false, ... }
[AUTH-JWT] Token updated: { userId, phone: '1112345678', needsPhone: false }
```

## 📋 Archivos Modificados

1. **[`src/components/CompletePhoneModal.tsx`](src/components/CompletePhoneModal.tsx)**
   - Validación estricta de formato de teléfono
   - Hard redirect con `window.location.href`
   - Mejores mensajes de error para el usuario

2. **[`src/app/api/auth/complete-phone/route.ts`](src/app/api/auth/complete-phone/route.ts)**
   - Logging detallado para debugging
   - Mensajes de error más descriptivos
   - Verificación de estado del cliente

3. **[`src/lib/auth-options.ts`](src/lib/auth-options.ts)**
   - Callback JWT consulta DB si detecta teléfono temporal
   - Logging para tracking de actualización de token
   - Soporte para `trigger` parameter de NextAuth

## ✅ Resultado Final

- ✅ **Validación robusta** - Solo acepta números completos y válidos
- ✅ **Sesión actualizada** - El token JWT se regenera automáticamente
- ✅ **Sin loops** - El cliente completa el registro exitosamente
- ✅ **Estado correcto** - Cliente queda ACTIVO en la DB
- ✅ **Debugging facilitado** - Logs claros para identificar problemas

---

**Última actualización:** 2026-03-05  
**Estado:** ✅ Implementado y listo para testing en producción
