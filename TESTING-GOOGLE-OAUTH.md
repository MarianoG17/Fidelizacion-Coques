# 🧪 Testing Google OAuth - Guía Completa

## 📋 Casos de Prueba

### ✅ Caso 1: Usuario Nuevo con Google OAuth

**Objetivo**: Verificar que un usuario nuevo puede registrarse con Google

**Pasos**:
1. Ir a `/login`
2. Click en **"Continuar con Google"**
3. Seleccionar cuenta de Google (que NO esté registrada en Coques)
4. Aceptar permisos
5. Debería aparecer modal pidiendo teléfono
6. Ingresar teléfono válido (ej: `+54 9 11 1234-5678`)
7. Click en **"Completar Registro"**

**Resultado Esperado**:
- ✅ Se crea el cliente en la DB
- ✅ Estado inicial: `PRE_REGISTRADO`
- ✅ Al completar teléfono, estado cambia a `ACTIVO`
- ✅ Campos: `googleId`, `authProvider='google'`, `profileImage` poblados
- ✅ Redirige a `/pass`
- ✅ Se ve el pase digital

**Verificar en DB**:
```sql
SELECT 
  nombre,
  email,
  phone,
  "authProvider",
  "googleId",
  estado,
  "profileImage"
FROM "Cliente"
WHERE email = 'email-de-prueba@gmail.com';
```

---

### ✅ Caso 2: Usuario Existente (Email/Password) usa Google

**Objetivo**: Verificar que un usuario con email/password puede vincular su cuenta de Google

**Setup Previo**:
1. Tener un usuario registrado con email/password
2. Email: `test@example.com`

**Pasos**:
1. Cerrar sesión (si está logueado)
2. Ir a `/login`
3. Click en **"Continuar con Google"**
4. Seleccionar cuenta de Google con el MISMO email (`test@example.com`)
5. Aceptar permisos

**Resultado Esperado**:
- ✅ NO pide teléfono (ya lo tiene)
- ✅ Redirige directamente a `/pass`
- ✅ Se actualiza el cliente con `googleId` y `authProvider='google'`
- ✅ Se mantiene el `password` anterior (puede seguir usando ambos métodos)
- ✅ Se actualiza `profileImage` con la foto de Google

**Verificar en DB**:
```sql
SELECT 
  nombre,
  email,
  "authProvider",
  "googleId" IS NOT NULL as tiene_google,
  password IS NOT NULL as tiene_password,
  "profileImage"
FROM "Cliente"
WHERE email = 'test@example.com';
```

Debería mostrar:
- `authProvider`: `google`
- `tiene_google`: `true`
- `tiene_password`: `true` (mantiene el password anterior)

---

### ✅ Caso 3: Usuario de Google vuelve a Loguear

**Objetivo**: Verificar que un usuario que ya usó Google puede loguear sin fricción

**Setup Previo**:
1. Usuario ya registrado con Google (del Caso 1)

**Pasos**:
1. Cerrar sesión
2. Ir a `/login`
3. Click en **"Continuar con Google"**
4. Seleccionar la misma cuenta de Google

**Resultado Esperado**:
- ✅ NO pide teléfono
- ✅ NO pide permisos (ya los aceptó antes)
- ✅ Redirige directamente a `/pass`
- ✅ Login casi instantáneo

---

### ✅ Caso 4: Usuario con Google intenta Login Email/Password

**Objetivo**: Verificar mensaje de error apropiado

**Setup Previo**:
1. Usuario registrado SOLO con Google (sin password)

**Pasos**:
1. Ir a `/login`
2. Ingresar email del usuario de Google
3. Ingresar cualquier contraseña
4. Click en **"Iniciar Sesión"**

**Resultado Esperado**:
- ✅ Error: `"Esta cuenta usa Google para iniciar sesión"`
- ✅ NO permite login con password
- ✅ Sugiere usar el botón de Google

---

### ✅ Caso 5: Teléfono Duplicado

**Objetivo**: Verificar validación de teléfono único

**Setup Previo**:
1. Usuario A con teléfono `+54 9 11 1234-5678`

**Pasos**:
1. Registrarse con Google (Usuario B)
2. En modal de teléfono, ingresar: `+54 9 11 1234-5678` (mismo que Usuario A)
3. Click en **"Completar Registro"**

**Resultado Esperado**:
- ✅ Error: `"Este teléfono ya está registrado en otra cuenta"`
- ✅ No se completa el registro
- ✅ Pide otro teléfono

---

### ✅ Caso 6: Cancelar Modal de Teléfono

**Objetivo**: Verificar comportamiento si el usuario cierra el modal sin completar

**Pasos**:
1. Registrarse con Google (usuario nuevo)
2. Aparece modal de teléfono
3. NO ingresar teléfono, cerrar el navegador

**Resultado Esperado**:
- ✅ Se crea el cliente en estado `PRE_REGISTRADO`
- ✅ Teléfono temporal: `+549TEMP{timestamp}`
- ✅ Al volver a loguear con Google, vuelve a pedir el teléfono
- ✅ El sistema detecta `needsPhone: true`

**Verificar en DB**:
```sql
SELECT 
  email,
  phone,
  estado
FROM "Cliente"
WHERE phone LIKE '+549TEMP%';
```

---

### ✅ Caso 7: Múltiples Cuentas de Google

**Objetivo**: Verificar que el usuario puede elegir qué cuenta usar

**Pasos**:
1. Ir a `/login`
2. Click en **"Continuar con Google"**
3. Si tiene múltiples cuentas, aparece selector de Google
4. Seleccionar cuenta

**Resultado Esperado**:
- ✅ Permite elegir entre múltiples cuentas
- ✅ Cada cuenta de Google se registra como cliente separado
- ✅ No hay conflicto entre cuentas

---

### ✅ Caso 8: Rechazar Permisos de Google

**Objetivo**: Verificar comportamiento si el usuario NO acepta permisos

**Pasos**:
1. Ir a `/login`
2. Click en **"Continuar con Google"**
3. En la pantalla de permisos de Google, click en **"Cancelar"**

**Resultado Esperado**:
- ✅ Vuelve a `/login`
- ✅ Muestra mensaje de error (opcional)
- ✅ No se crea ningún cliente en la DB
- ✅ Puede intentar de nuevo

---

## 🔧 Testing en Desarrollo

### Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env.local
cp .env.example .env.local

# 3. Agregar variables de Google OAuth
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# NEXTAUTH_SECRET=...
# NEXTAUTH_URL=http://localhost:3000

# 4. Iniciar servidor
npm run dev
```

### URLs de Testing

- Login: http://localhost:3000/login
- Pass: http://localhost:3000/pass
- Perfil: http://localhost:3000/perfil

---

## 🚀 Testing en Producción

### Pre-requisitos

1. ✅ Variables de entorno configuradas en Vercel
2. ✅ Redirect URIs configuradas en Google Console
3. ✅ App de Google publicada (o emails en Test Users)
4. ✅ Migración de DB aplicada

### URLs de Testing

- Login: https://app.coques.com.ar/login
- Pass: https://app.coques.com.ar/pass

---

## 📊 Verificación en Base de Datos

### Ver todos los usuarios de Google

```sql
SELECT 
  nombre,
  email,
  phone,
  "authProvider",
  "googleId" IS NOT NULL as es_google,
  estado,
  "createdAt"
FROM "Cliente"
WHERE "authProvider" = 'google'
ORDER BY "createdAt" DESC;
```

### Ver usuarios con ambos métodos

```sql
SELECT 
  nombre,
  email,
  "authProvider",
  "googleId" IS NOT NULL as tiene_google,
  password IS NOT NULL as tiene_password
FROM "Cliente"
WHERE "googleId" IS NOT NULL 
