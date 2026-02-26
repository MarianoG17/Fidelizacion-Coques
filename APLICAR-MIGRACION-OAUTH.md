# 📋 Aplicar Migración de Google OAuth

## 🎯 Objetivo

Aplicar la migración de base de datos que agrega los campos necesarios para Google OAuth.

---

## ⚠️ IMPORTANTE: Leer Antes de Ejecutar

1. **Backup**: Esta migración agrega columnas nuevas, es segura
2. **Downtime**: No requiere detener la aplicación
3. **Reversible**: Los campos son opcionales, no afectan usuarios existentes
4. **Usuarios existentes**: Se les asigna automáticamente `authProvider = 'email'`

---

## 🗄️ Paso 1: Ejecutar Migración SQL

### 1.1 Conectarse a la Base de Datos

**Opción A: Neon Dashboard**
1. Ir a: https://console.neon.tech
2. Seleccionar tu proyecto: `fidelizacion-coques`
3. Click en **SQL Editor**

**Opción B: psql Local**
```bash
psql "postgresql://user:password@host.neon.tech/fidelizacion?sslmode=require"
```

### 1.2 Ejecutar el Script

Copiar y pegar todo el contenido:

```sql
-- Migration: Add OAuth fields to Cliente table
-- Date: 2026-02-26
-- Purpose: Support Google OAuth authentication

-- Add OAuth fields to Cliente table
ALTER TABLE "Cliente" 
ADD COLUMN IF NOT EXISTS "googleId" TEXT,
ADD COLUMN IF NOT EXISTS "authProvider" TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS "profileImage" TEXT;

-- Create unique index on googleId
CREATE UNIQUE INDEX IF NOT EXISTS "Cliente_googleId_key" ON "Cliente"("googleId");

-- Update existing clients to have authProvider = 'email'
UPDATE "Cliente" 
SET "authProvider" = 'email' 
WHERE "authProvider" IS NULL;
```

### 1.3 Verificar la Migración

```sql
-- Ver las columnas nuevas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Cliente'
  AND column_name IN ('googleId', 'authProvider', 'profileImage');
```

Deberías ver:

| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| googleId | text | YES | NULL |
| authProvider | text | YES | 'email'::text |
| profileImage | text | YES | NULL |

### 1.4 Verificar Usuarios Existentes

```sql
-- Ver que todos los usuarios tienen authProvider = 'email'
SELECT 
  "authProvider",
  COUNT(*) as total
FROM "Cliente"
GROUP BY "authProvider";
```

Deberías ver:

| authProvider | total |
|--------------|-------|
| email | (número de clientes) |

---

## 🔧 Paso 2: Regenerar Prisma Client

```bash
cd fidelizacion-zona
npx prisma generate
```

Deberías ver:
```
✔ Generated Prisma Client (x.x.x) to ./node_modules/@prisma/client
```

---

## 🚀 Paso 3: Deploy a Producción

### 3.1 Commit y Push

```bash
git add .
git commit -m "feat: Add Google OAuth authentication"
git push origin main
```

### 3.2 Vercel Deploy Automático

- Vercel detectará el push y hará deploy automático
- Esperar 2-3 minutos

### 3.3 Verificar Variables de Entorno en Vercel

1. Ir a Vercel Dashboard
2. Settings > Environment Variables
3. Verificar que estén estas variables:
   - ✅ `GOOGLE_CLIENT_ID`
   - ✅ `GOOGLE_CLIENT_SECRET`
   - ✅ `NEXTAUTH_SECRET`
   - ✅ `NEXTAUTH_URL`

Si faltan, agregarlas y hacer **Redeploy**

---

## ✅ Paso 4: Testing

### 4.1 Test en Desarrollo

```bash
npm run dev
```

1. Ir a: http://localhost:3000/login
2. Debería aparecer el botón **"Continuar con Google"**
3. Click y probar el flujo

### 4.2 Test en Producción

1. Ir a: https://app.coques.com.ar/login
2. Click en **"Continuar con Google"**
3. Probar con una cuenta de Google de prueba

**Casos a probar:**

✅ **Usuario nuevo con Google**
- Se crea cuenta
- Pide completar teléfono
- Redirige a /pass

✅ **Usuario existente (email/password) usando Google por primera vez**
- Vincula las cuentas automáticamente
- No pide teléfono (ya lo tiene)
- Redirige a /pass

✅ **Usuario que ya usó Google antes**
- Login directo
- Redirige a /pass

---

## 🐛 Troubleshooting

### Error: "column already exists"

**Causa**: La migración ya fue aplicada antes

**Solución**: No hacer nada, es normal. El `IF NOT EXISTS` previene errores

### Error: "index already exists"

**Causa**: El índice ya fue creado antes

**Solución**: No hacer nada, es normal. El `IF NOT EXISTS` previene errores

### Error: "Cannot find module 'next-auth'"

**Causa**: No se instaló NextAuth.js

**Solución**:
```bash
npm install next-auth@latest
```

### Error: "NEXTAUTH_SECRET not configured"

**Causa**: Falta la variable de entorno

**Solución**:
```bash
# Generar secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Agregar a .env.local
echo "NEXTAUTH_SECRET=tu-secret-aqui" >> .env.local
```

---

## 📊 Verificación Post-Deploy

### Verificar en Base de Datos

```sql
-- Ver estructura de Cliente
\d "Cliente"

-- Ver clientes con Google OAuth
SELECT 
  nombre,
  email,
  "authProvider",
  "googleId" IS NOT NULL as tiene_google,
  estado
FROM "Cliente"
WHERE "authProvider" = 'google'
ORDER BY "createdAt" DESC
LIMIT 5;
```

### Verificar en la App

1. Login con Google funciona ✅
2. Login con email/password sigue funcionando ✅
3. Se puede vincular cuenta existente con Google ✅
4. Se pide teléfono a usuarios nuevos de Google ✅

---

## 🎉 ¡Listo!

La migración de Google OAuth está completa. Los clientes ahora pueden:
- ✅ Registrarse con Google en 1 click
- ✅ Iniciar sesión con Google
- ✅ Mantener su método de login anterior (email/password)
- ✅ Vincular ambos métodos automáticamente

---

## 📝 Notas Importantes

1. **Usuarios existentes**: No se ven afectados, pueden seguir usando email/password
2. **Vincular cuentas**: Si un usuario se registró con email/password y después usa Google con el mismo email, las cuentas se vinculan automáticamente
3. **Teléfono requerido**: Los nuevos usuarios de Google deben completar su teléfono
4. **Compatibilidad**: El sistema actual de JWT sigue funcionando para las APIs
5. **Sesiones**: NextAuth maneja sus propias sesiones con cookies

---

## 🔄 Rollback (si es necesario)

Si necesitás revertir la migración:

```sql
-- Eliminar columnas (NO RECOMENDADO si ya hay datos)
ALTER TABLE "Cliente" 
DROP COLUMN IF EXISTS "googleId",
DROP COLUMN IF EXISTS "authProvider",
DROP COLUMN IF EXISTS "profileImage";

-- Eliminar índice
DROP INDEX IF EXISTS "Cliente_googleId_key";
```

⚠️ **ADVERTENCIA**: Esto borrará todos los datos de Google OAuth. Solo hacer en emergencia.
