# 🐛 Solución: Errores en Acceso Rápido (Passkeys)

## 🔍 Problemas Reportados

### Error 1: "No autorizado"
Cliente intenta activar acceso rápido pero recibe error "No autorizado".

### Error 2: "Esta credencial ya está registrada"
Cliente intenta activar por primera vez pero dice que ya está registrada.

---

## 🕵️ Diagnóstico

### Error 1 - "No autorizado" (401)

**Causa:** Sesión de NextAuth expirada o inválida

**Código problemático:**
```typescript
// src/app/api/auth/passkey/register-options/route.ts (línea 15-21)
const session = await getServerSession(authOptions)
if (!session?.user?.email) {
    return NextResponse.json(
        { error: 'No autorizado' },  // ← Error que ven
        { status: 401 }
    )
}
```

**¿Por qué pasa?**
1. El cliente se registró/logueó hace tiempo
2. El token de NextAuth expiró (default: 30 días)
3. Cuando quiere activar passkey, la sesión ya no es válida
4. El servidor rechaza la petición

**¿Cuándo pasa?**
- Después de mucho tiempo sin usar la app
- Si el usuario borró cookies
- Si cambió de navegador
- Si la sesión se invalidó por alguna razón

---

### Error 2 - "Esta credencial ya está registrada" (400)

**Causa:** Registro parcial fallido anterior

**Código problemático:**
```typescript
// src/app/api/auth/passkey/register/route.ts (línea 115-124)
const existingPasskey = await prisma.passkey.findUnique({
    where: { credentialId: credentialIdBase64 }
})

if (existingPasskey) {
    return NextResponse.json(
        { error: 'Esta credencial ya está registrada' },  // ← Error que ven
        { status: 400 }
    )
}
```

**¿Por qué pasa?**
1. Usuario intentó activar passkey anteriormente
2. El registro llegó al paso de guardar en DB
3. Pero algo falló después (timeout, error de red, etc.)
4. La entrada quedó en DB pero el usuario no recibió confirmación
5. Intenta de nuevo → DB dice "ya existe"

**Escenario típico:**
```
Intento 1:
- Usuario: "Activar acceso rápido"
- App: Genera opciones ✅
- Usuario: Usa huella ✅
- App: Guarda en DB ✅
- App: Intenta responder al cliente ❌ (timeout/error)
- Usuario: Ve error, piensa que falló

Intento 2:
- Usuario: "Activar acceso rápido" (de nuevo)
- App: Genera opciones ✅
- Usuario: Usa huella ✅
- App: Intenta guardar en DB ❌ "Ya existe"
```

---

## ✅ Soluciones

### Solución 1: Mejorar Manejo de Sesión Expirada

Agregar lógica para re-autenticar al usuario si la sesión expiró:

```typescript
// src/hooks/usePasskey.ts
async function registrar(deviceName?: string) {
    try {
        setLoading(true)
        setError(null)
        
        // Paso 1: Solicitar opciones de registro
        const optionsRes = await fetch('/api/auth/passkey/register-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        
        if (optionsRes.status === 401) {
            // ✅ NUEVO: Manejar sesión expirada
            setError('Tu sesión expiró. Por favor, volvé a ingresar.')
            
            // Opcional: Redirigir al login
            setTimeout(() => {
                window.location.href = '/login'
            }, 2000)
            
            return
        }
        
        if (!optionsRes.ok) {
            const data = await optionsRes.json()
            throw new Error(data.error || 'Error al generar opciones')
        }
        
        // ... resto del código
    }
}
```

### Solución 2: Permitir Re-registro o Limpieza

Cambiar la lógica para permitir re-intentos:

**Opción A: Actualizar credencial existente**
```typescript
// src/app/api/auth/passkey/register/route.ts
// Reemplazar líneas 115-124

// Verificar si ya existe esta credencial
const existingPasskey = await prisma.passkey.findUnique({
    where: { credentialId: credentialIdBase64 }
})

if (existingPasskey) {
    // ✅ NUEVO: Si ya existe, actualizar en vez de rechazar
    console.log('[PASSKEY] Credencial ya existe, actualizando...')
    
    const passkey = await prisma.passkey.update({
        where: { id: existingPasskey.id },
        data: {
            publicKey: publicKeyBase64,
            counter: BigInt(counter),
            transports,
            dispositivoNombre: deviceName || existingPasskey.dispositivoNombre,
            userAgent: req.headers.get('user-agent') || undefined,
            ultimoUso: new Date(),
        }
    })
    
    return NextResponse.json({
        success: true,
        message: 'Biometría actualizada exitosamente',
        passkey: {
            id: passkey.id,
            dispositivoNombre: passkey.dispositivoNombre,
            createdAt: passkey.createdAt,
        }
    })
}
```

**Opción B: Endpoint para limpiar passkeys fallidas**
```typescript
// src/app/api/auth/passkey/reset/route.ts (NUEVO)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

/**
 * Elimina todas las passkeys del usuario
 * POST /api/auth/passkey/reset
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const cliente = await prisma.cliente.findUnique({
            where: { email: session.user.email }
        })

        if (!cliente) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        // Eliminar todas las passkeys del usuario
        await prisma.passkey.deleteMany({
            where: { clienteId: cliente.id }
        })

        return NextResponse.json({
            success: true,
            message: 'Passkeys eliminadas exitosamente'
        })
    } catch (error) {
        console.error('[PASSKEY] Error eliminando passkeys:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
```

### Solución 3: Mejorar Mensajes de Error en el Frontend

```typescript
// src/hooks/usePasskey.ts
async function registrar(deviceName?: string) {
    try {
        setLoading(true)
        setError(null)
        
        const optionsRes = await fetch('/api/auth/passkey/register-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        
        // ✅ MEJORADO: Mensajes más claros
        if (optionsRes.status === 401) {
            setError('⏱️ Tu sesión expiró. Volvé a ingresar y probá de nuevo.')
            setTimeout(() => window.location.href = '/login', 2000)
            return
        }
        
        if (!optionsRes.ok) {
            const data = await optionsRes.json()
            setError(`❌ ${data.error || 'Error desconocido'}`)
            throw new Error(data.error)
        }
        
        const options = await optionsRes.json()
        
        const credential = await startRegistration(options)
        
        const verifyRes = await fetch('/api/auth/passkey/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                credential,
                deviceName: deviceName || 'Mi dispositivo'
            })
        })
        
        if (!verifyRes.ok) {
            const data = await verifyRes.json()
            
            // ✅ MEJORADO: Manejar error específico de duplicado
            if (data.error?.includes('ya está registrada')) {
                setError('🔄 Parece que ya intentaste activar esto antes. Probá reingresar a la app.')
                
                // Opcional: Ofrecer resetear
                if (confirm('¿Querés resetear y volver a intentar?')) {
                    await fetch('/api/auth/passkey/reset', { method: 'POST' })
                    // Reintentar
                    return registrar(deviceName)
                }
            } else {
                setError(`❌ ${data.error || 'Error al verificar'}`)
            }
            
            throw new Error(data.error)
        }
        
        // ... resto del código
    } catch (err: any) {
        // ✅ MEJORADO: Mensajes según tipo de error
        if (err.name === 'NotAllowedError') {
            setError('❌ Cancelaste la activación o tu dispositivo no soporta biometría')
        } else if (err.name === 'InvalidStateError') {
            setError('🔄 Esta huella ya está registrada. Probá con otro dedo o resetea la biometría.')
        } else if (err.message?.includes('sesión')) {
            // Ya manejado arriba
        } else {
            setError('❌ Error al activar biometría. Intentá de nuevo.')
        }
        
        console.error('[PASSKEY] Error:', err)
        throw err
    } finally {
        setLoading(false)
    }
}
```

---

## 🚀 Implementación Recomendada

### Cambios Mínimos (Rápidos)

1. ✅ **Mejorar mensajes de error** (Solución 3)
   - No requiere cambios en DB
   - Solo actualizar `usePasskey.ts`
   - 10 minutos

2. ✅ **Actualizar en vez de rechazar** (Solución 2, Opción A)
   - Cambio en `register/route.ts`
   - 5 minutos

### Cambios Completos (Ideales)

1. ✅ Implementar Solución 1 (manejar sesión expirada)
2. ✅ Implementar Solución 2 Opción A (actualizar si existe)
3. ✅ Implementar Solución 2 Opción B (endpoint reset)
4. ✅ Implementar Solución 3 (mejores mensajes)

**Tiempo total:** 30-40 minutos

---

## 🧪 Testing

### Caso 1: Sesión Expirada

```
1. Registrarse/loguearse
2. Esperar que expire la sesión (o borrar cookies manualmente)
3. Intentar activar passkey
4. Debería mostrar: "Tu sesión expiró. Volvé a ingresar."
5. Redirigir al login automáticamente
```

### Caso 2: Registro Fallido

```
1. Activar passkey
2. Simular error de red (Chrome DevTools → Network → Offline antes de confirmar)
3. Intentar de nuevo
4. Debería: Actualizar la credencial existente O ofrecer resetear
5. No debería mostrar "ya está registrada"
```

---

## 📝 SQL para Investigar

Si querés ver qué passkeys tienen tus usuarios:

```sql
-- Ver passkeys registradas
SELECT 
    c.email,
    c.nombre,
    p.dispositivoNombre,
    p.createdAt,
    p.ultimoUso
FROM "Passkey" p
JOIN "Cliente" c ON c.id = p.clienteId
ORDER BY p.createdAt DESC;

-- Ver passkeys nunca usadas (posibles registros fallidos)
SELECT 
    c.email,
    p.dispositivoNombre,
    p.createdAt,
    p.ultimoUso
FROM "Passkey" p
JOIN "Cliente" c ON c.id = p.clienteId
WHERE p.ultimoUso IS NULL
ORDER BY p.createdAt DESC;

-- Eliminar passkey específica (si un usuario tiene problema)
DELETE FROM "Passkey" 
WHERE credentialId = 'xxx' -- El ID problemático
```

---

## 🎯 Recomendación Final

**Para los clientes que tuvieron el error:**

1. **Error "No autorizado":**
   - Pedirles que cierren sesión y vuelvan a ingresar
   - Después que intenten activar biometría de nuevo

2. **Error "Ya está registrada":**
   - Ejecutá este SQL para ese cliente:
   ```sql
   DELETE FROM "Passkey" 
   WHERE clienteId = (
       SELECT id FROM "Cliente" WHERE email = 'email-del-cliente@ejemplo.com'
   );
   ```
   - Pedile que intente de nuevo

**Para prevenir futuros errores:**
- Implementá las soluciones arriba (especialmente mejorar mensajes y permitir actualización)

---

¿Querés que implemente las soluciones ahora?
