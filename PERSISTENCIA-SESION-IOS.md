# Persistencia de Sesión - iOS vs Android

## 🎯 Problema

¿Se puede modificar la app para que una vez logueado el usuario **no se desloguee automáticamente**?

## ✅ Estado Actual

Tu app **YA está configurada para mantener la sesión por 30 días**:

```typescript
// src/lib/auth-options.ts (línea 250)
session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
}
```

**Pero en iOS, la sesión se pierde antes de los 30 días.** ¿Por qué?

## 🍎 El Problema de iOS (ITP)

Apple implementó **ITP (Intelligent Tracking Prevention)** en Safari/iOS que:

### 1. Limpia Storage Después de 7 Días de Inactividad
```
Día 0: Usuario se loguea ✅
Día 1-6: Todo funciona ✅
Día 7: Si no abrió la app, iOS limpia storage ❌
Día 8: Al abrir, está deslogueado ❌
```

### 2. Limpia Cookies de Terceros
- Cookies de `next-auth` se consideran "tracking"
- Se eliminan después de 7 días sin uso
- No hay forma de evitarlo desde tu código

### 3. Reinstalación de PWA
- Si el usuario "desinstala" la PWA de inicio
- iOS borra TODO el storage asociado
- Al reinstalar, es como usuario nuevo

## 📊 Comparación iOS vs Android

| Característica | iOS Safari PWA | Android Chrome PWA |
|---------------|----------------|-------------------|
| **Session maxAge configurado** | 30 días | 30 días |
| **Session real (sin uso)** | ~7 días | ~30 días |
| **Storage persistente** | ❌ Se limpia | ✅ Persistente |
| **Cookies persistentes** | ❌ Limitadas | ✅ Persistentes |
| **ITP activo** | ✅ Sí | ❌ No |
| **Se desloguea solo** | ✅ Después de ~7 días inactivo | ❌ Casi nunca |

## 🛠️ Soluciones Posibles

### Solución 1: Extender maxAge a 90 días (Parcial) ⚠️

**Código:**
```typescript
// src/lib/auth-options.ts
session: {
    strategy: "jwt",
    maxAge: 90 * 24 * 60 * 60, // 90 días en vez de 30
}
```

**Efecto:**
- ✅ En Android: Sesión dura 90 días reales
- ⚠️ En iOS: **Sigue limitado a ~7 días por ITP**
- ❌ No soluciona el problema de iOS

**Recomendación:** Puedes hacerlo, pero no resuelve iOS.

---

### Solución 2: Guardar Token en localStorage (Actual - Ya implementado) ✅

Tu app **ya hace esto**:

```typescript
// src/components/CompletePhoneModal.tsx (línea 82)
localStorage.setItem('fidelizacion_token', data.token)

// src/app/api/auth/session-token/route.ts
const token = jwt.sign({...}, JWT_SECRET, { expiresIn: '30d' })
```

**Problema en iOS:**
- localStorage también se limpia después de 7 días de inactividad
- No hay forma de evitarlo

---

### Solución 3: Guardar en IndexedDB + Service Worker ⭐ (Mejor para iOS)

**IndexedDB NO se limpia tan agresivamente como localStorage en iOS.**

**Implementación:**

#### Paso 1: Crear utility para IndexedDB
```typescript
// src/lib/storage.ts
const DB_NAME = 'fidelizacion-db'
const STORE_NAME = 'auth'

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function saveToken(token: string): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  
  return new Promise((resolve, reject) => {
    const request = store.put(token, 'jwt_token')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getToken(): Promise<string | null> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  
  return new Promise((resolve, reject) => {
    const request = store.get('jwt_token')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}
```

#### Paso 2: Usar en login
```typescript
// src/components/CompletePhoneModal.tsx
import { saveToken } from '@/lib/storage'

// Después de login exitoso
if (data.token) {
    // Guardar en AMBOS lugares
    localStorage.setItem('fidelizacion_token', data.token)
    await saveToken(data.token) // IndexedDB (más persistente en iOS)
}
```

#### Paso 3: Verificar al cargar la app
```typescript
// src/app/layout.tsx o middleware
import { getToken } from '@/lib/storage'

// Al cargar la app
const token = await getToken()
if (token) {
    // Restaurar sesión automáticamente
    await fetch('/api/auth/session-token', {
        method: 'POST',
        body: JSON.stringify({ token })
    })
}
```

**Ventajas:**
- IndexedDB persiste más tiempo que localStorage en iOS
- iOS limpia IndexedDB **después de 14-30 días** (no 7)
- Sigue siendo storage del lado del cliente (no requiere backend)

**Desventajas:**
- Más complejo de implementar
- Aún puede limpiarse en iOS (solo tarda más)

---

### Solución 4: Refresh Token con Llamada Periódica 🔄 (Avanzado)

**Concepto:** Cada vez que el usuario abre la app, refrescar el token automáticamente.

```typescript
// src/middleware.ts o src/app/layout.tsx
useEffect(() => {
  async function refreshSession() {
    try {
      const currentToken = localStorage.getItem('fidelizacion_token')
      if (!currentToken) return
      
      // Verificar si el token está cerca de expirar
      const decoded = jwt.decode(currentToken)
      const expiresAt = decoded.exp * 1000
      const now = Date.now()
      const daysUntilExpire = (expiresAt - now) / (1000 * 60 * 60 * 24)
      
      // Si quedan menos de 5 días, renovar
      if (daysUntilExpire < 5) {
        console.log('[AUTH] Token cerca de expirar, renovando...')
        const res = await fetch('/api/auth/refresh-token', {
          method: 'POST',
          body: JSON.stringify({ token: currentToken })
        })
        
        const data = await res.json()
        if (data.token) {
          localStorage.setItem('fidelizacion_token', data.token)
          await saveToken(data.token) // IndexedDB también
        }
      }
    } catch (err) {
      console.error('[AUTH] Error refreshing token:', err)
    }
  }
  
  // Ejecutar al montar
  refreshSession()
  
  // Ejecutar cada hora mientras la app está abierta
  const interval = setInterval(refreshSession, 60 * 60 * 1000)
  
  return () => clearInterval(interval)
}, [])
```

**Endpoint de refresh:**
```typescript
// src/app/api/auth/refresh-token/route.ts
export async function POST(req: NextRequest) {
  const { token } = await req.json()
  
  try {
    // Verificar token actual
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Consultar DB para datos actualizados
    const cliente = await prisma.cliente.findUnique({
      where: { id: decoded.clienteId }
    })
    
    if (!cliente) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    
    // Generar nuevo token con fecha extendida
    const newToken = jwt.sign(
      {
        clienteId: cliente.id,
        email: cliente.email,
        phone: cliente.phone,
        // ... otros datos
      },
      JWT_SECRET,
      { expiresIn: '30d' } // Nuevo token con 30 días más
    )
    
    return NextResponse.json({ token: newToken })
  } catch (err) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
}
```

**Ventajas:**
- Token siempre "fresco" (nunca expira si el usuario usa la app)
- Funciona en iOS y Android
- Datos actualizados desde DB

**Desventajas:**
- Requiere backend adicional
- Más llamadas a la base de datos
- Solo funciona si el usuario abre la app al menos una vez cada ~7 días

---

### Solución 5: App Nativa (React Native / Capacitor) 🚀 (Definitiva)

**Si el problema de deslogueo en iOS es crítico**, considera migrar a app nativa:

#### Opción A: Capacitor (más fácil)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

**Ventajas:**
- Tu código Next.js sigue igual
- Storage persistente nativo
- No hay ITP
- Notificaciones push nativas
- Acceso a APIs nativas (biometría, cámara, etc.)

**Desventajas:**
- Requiere publicar en App Store ($99/año)
- Proceso de revisión de Apple
- Mayor complejidad de deploy

#### Opción B: React Native (más completo)
- Reescribir UI en React Native
- Mayor control
- Mejor rendimiento

---

## 💡 Recomendación por Prioridad

### Corto Plazo (1-2 días) - FÁCIL
1. **Extender `maxAge` a 90 días** en [`auth-options.ts`](fidelizacion-zona/src/lib/auth-options.ts:250)
   - Ayuda en Android (sin cambios en iOS)
   - Una línea de código

2. **Implementar Refresh Token automático**
   - Mantiene la sesión "viva" mientras el usuario use la app
   - ~2 horas de desarrollo

### Mediano Plazo (1 semana) - MODERADO
3. **Migrar a IndexedDB** en vez de localStorage
   - Persiste más tiempo en iOS (~14-30 días en vez de 7)
   - ~4-6 horas de desarrollo

### Largo Plazo (1 mes) - AVANZADO
4. **Migrar a Capacitor** (app híbrida nativa)
   - Solución definitiva al problema de iOS
   - Storage persistente real
   - ~2-4 semanas de adaptación y testing

---

## 🧪 Testing del Problema

Para reproducir el deslogueo en iOS:

```javascript
// En Safari iOS:
1. Loguear en la app
2. Settings → Safari → Advanced → Website Data
3. Buscar tu dominio (zona.com.ar)
4. Eliminar todos los datos
5. Recargar la app → Deslogueado
```

O esperar 7 días sin abrir la app.

---

## 📋 Checklist de Implementación (Recomendado)

### Fase 1: Quick Win (1 día)
- [ ] Extender `maxAge` de 30 a 90 días
- [ ] Agregar endpoint `/api/auth/refresh-token`
- [ ] Implementar auto-refresh en `layout.tsx`
- [ ] Testing en iOS y Android

### Fase 2: Storage Persistente (1 semana)
- [ ] Crear `src/lib/storage.ts` con IndexedDB
- [ ] Migrar `localStorage` a IndexedDB
- [ ] Agregar fallback a localStorage si IndexedDB falla
- [ ] Testing exhaustivo en iOS (7+ días)

### Fase 3: Monitoreo (ongoing)
- [ ] Agregar analytics de "sesiones perdidas"
- [ ] Detectar cuántos usuarios se desloguean involuntariamente
- [ ] Evaluar si vale la pena migrar a app nativa

---

## 📊 Tabla Comparativa de Soluciones

| Solución | Complejidad | Tiempo | Efectividad iOS | Efectividad Android | Costo |
|----------|-------------|--------|----------------|-------------------|-------|
| Extender maxAge | 🟢 Fácil | 5 min | ❌ 0% (sigue 7 días) | ✅ 100% | $0 |
| Refresh Token | 🟡 Media | 2 hrs | ⚠️ 50% (si usa app) | ✅ 100% | $0 |
| IndexedDB | 🟡 Media | 6 hrs | ⚠️ 70% (14-30 días) | ✅ 100% | $0 |
| Capacitor | 🔴 Alta | 2-4 sem | ✅ 100% | ✅ 100% | $99/año Apple |
| React Native | 🔴 Muy Alta | 1-2 meses | ✅ 100% | ✅ 100% | $99/año Apple |

---

## 🎯 Respuesta Directa

**¿Se puede modificar para que no se desloguee?**

- ✅ **En Android:** Ya funciona bien (30 días)
- ⚠️ **En iOS (PWA):** Solo parcialmente (max ~14-30 días con IndexedDB)
- ✅ **En iOS (app nativa):** Sí, completamente (requiere Capacitor)

**La limitación de 7 días en iOS PWA es de Apple (ITP), no de tu código.**

---

**¿Quieres que implemente alguna de estas soluciones?** La más rápida y efectiva es:
1. Extender maxAge a 90 días (5 minutos)
2. Implementar Refresh Token automático (2 horas)
