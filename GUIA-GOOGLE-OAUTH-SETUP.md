# 🔐 Guía: Configuración de Google OAuth para Login

## 📋 Resumen

Esta guía te ayudará a configurar Google OAuth para que los clientes puedan registrarse e iniciar sesión con su cuenta de Google en lugar de crear email/contraseña.

---

## 🎯 Paso 1: Crear Proyecto en Google Cloud Console

### 1.1 Ir a Google Cloud Console

1. Ve a: https://console.cloud.google.com
2. Inicia sesión con tu cuenta de Google (preferiblemente la de Coques)

### 1.2 Crear Nuevo Proyecto

1. Click en el menú desplegable de proyectos (arriba a la izquierda)
2. Click en **"New Project"** (Nuevo Proyecto)
3. Configurar:
   - **Project name**: `Coques Fidelizacion`
   - **Organization**: Dejar como está
   - **Location**: Dejar como está
4. Click en **"Create"** (Crear)
5. Esperar unos segundos a que se cree el proyecto

---

## 🔧 Paso 2: Configurar OAuth Consent Screen

### 2.1 Acceder a OAuth Consent Screen

1. En el menú lateral, ir a: **APIs & Services** > **OAuth consent screen**
2. O usar este link directo: https://console.cloud.google.com/apis/credentials/consent

### 2.2 Configurar la Pantalla de Consentimiento

**User Type:**
- Seleccionar: **External** (permite que cualquier persona con cuenta de Google se registre)
- Click en **"Create"**

**App Information:**
- **App name**: `Coques Fidelización`
- **User support email**: `tu-email@coques.com.ar` (tu email)
- **App logo**: (Opcional) Subir el logo de Coques (192x192px mínimo)

**App domain:**
- **Application home page**: `https://app.coques.com.ar`
- **Application privacy policy**: `https://app.coques.com.ar/privacidad` (crear después)
- **Application terms of service**: `https://app.coques.com.ar/terminos` (crear después)

**Authorized domains:**
- Agregar: `coques.com.ar`
- Agregar: `vercel.app` (para testing en Vercel)

**Developer contact information:**
- **Email addresses**: `tu-email@coques.com.ar`

Click en **"Save and Continue"**

### 2.3 Scopes (Permisos)

1. Click en **"Add or Remove Scopes"**
2. Seleccionar:
   - ✅ `userinfo.email` - Ver tu dirección de email
   - ✅ `userinfo.profile` - Ver tu información personal (nombre, foto)
   - ✅ `openid` - Autenticación OpenID
3. Click en **"Update"**
4. Click en **"Save and Continue"**

### 2.4 Test Users (Solo si es necesario)

- Si tu app está en modo "Testing", agregar emails de prueba
- **Para producción**: Publicar la app (ver sección 6)
- Click en **"Save and Continue"**

### 2.5 Resumen

- Revisar toda la información
- Click en **"Back to Dashboard"**

---

## 🔑 Paso 3: Crear OAuth 2.0 Credentials

### 3.1 Crear Credenciales

1. En el menú lateral: **APIs & Services** > **Credentials**
2. O usar este link: https://console.cloud.google.com/apis/credentials
3. Click en **"+ Create Credentials"** (arriba)
4. Seleccionar: **"OAuth client ID"**

### 3.2 Configurar el Cliente OAuth

**Application type:**
- Seleccionar: **Web application**

**Name:**
- `Coques Fidelizacion Web Client`

**Authorized JavaScript origins:**
```
https://app.coques.com.ar
https://tu-proyecto.vercel.app
http://localhost:3000
```

**Authorized redirect URIs:**
```
https://app.coques.com.ar/api/auth/callback/google
https://tu-proyecto.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

⚠️ **IMPORTANTE**: Las URLs deben ser EXACTAS, sin espacios ni `/` al final (excepto el path)

Click en **"Create"**

### 3.3 Guardar las Credenciales

Aparecerá un popup con:
- **Client ID**: `123456789-abcdefghijk.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abcdefghijklmnopqrst`

⚠️ **MUY IMPORTANTE**: 
- Copiar ambos valores
- Guardarlos en un lugar seguro
- NO compartirlos públicamente
- NO subirlos a Git

---

## 🌐 Paso 4: Configurar Variables de Entorno

### 4.1 En Desarrollo Local

Crear archivo `.env.local` (si no existe):

```bash
# Google OAuth
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"

# NextAuth Secret (generar uno nuevo)
NEXTAUTH_SECRET="generar-con-el-comando-de-abajo"
NEXTAUTH_URL="http://localhost:3000"
```

**Generar NEXTAUTH_SECRET:**

```bash
# En Windows (PowerShell)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# O usar este generador online:
https://generate-secret.vercel.app/32
```

### 4.2 En Vercel (Producción)

1. Ir a tu proyecto en Vercel: https://vercel.com/tu-usuario/fidelizacion-zona
2. Click en **Settings** > **Environment Variables**
3. Agregar las siguientes variables:

| Name | Value | Environment |
|------|-------|-------------|
| `GOOGLE_CLIENT_ID` | `tu-client-id.apps.googleusercontent.com` | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | `tu-client-secret` | Production, Preview, Development |
| `NEXTAUTH_SECRET` | `tu-secret-aleatorio-de-64-chars` | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://app.coques.com.ar` | Production |

4. Click en **"Save"** en cada una

⚠️ **IMPORTANTE**: Después de agregar las variables, hacer un **Redeploy** del proyecto

---

## 🗄️ Paso 5: Aplicar Migración de Base de Datos

### 5.1 Aplicar la Migración SQL

Conectarse a la base de datos y ejecutar:

```sql
-- Ver archivo: prisma/migrations/20260226_add_oauth_fields.sql

ALTER TABLE "Cliente" 
ADD COLUMN IF NOT EXISTS "googleId" TEXT,
ADD COLUMN IF NOT EXISTS "authProvider" TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS "profileImage" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Cliente_googleId_key" ON "Cliente"("googleId");

UPDATE "Cliente" 
SET "authProvider" = 'email' 
WHERE "authProvider" IS NULL;
```

### 5.2 Regenerar Prisma Client

```bash
cd fidelizacion-zona
npx prisma generate
```

---

## 🚀 Paso 6: Publicar la App de Google (Producción)

### 6.1 ¿Por qué publicar?

- En modo "Testing", solo pueden registrarse los emails que agregaste como "Test users"
- En modo "Published", cualquier persona con cuenta de Google puede registrarse

### 6.2 Cómo Publicar

1. Ir a: **OAuth consent screen**
2. En la sección **"Publishing status"**
3. Click en **"Publish App"**
4. Confirmar la publicación

⚠️ **Nota**: Si la app solicita permisos sensibles (no es nuestro caso), Google puede requerir una verificación que toma 3-5 días. Los scopes que usamos (`email` y `profile`) no requieren verificación.

---

## ✅ Paso 7: Testing

### 7.1 Testing Local

1. Iniciar el servidor de desarrollo:
```bash
cd fidelizacion-zona
npm run dev
```

2. Ir a: http://localhost:3000/login
3. Click en **"Continuar con Google"**
4. Debería abrirse el popup de Google
5. Seleccionar tu cuenta de Google
6. Aceptar permisos
7. Debería redirigir a `/pass` (o pedir el teléfono si es primera vez)

### 7.2 Testing en Producción

1. Ir a: https://app.coques.com.ar/login
2. Click en **"Continuar con Google"**
3. Probar el flujo completo

### 7.3 Casos de Prueba

**Caso 1: Usuario nuevo con Google**
- ✅ Se crea cuenta automáticamente
- ✅ Pide completar teléfono
- ✅ Al completar teléfono, redirige a `/pass`

**Caso 2: Usuario existente (email/password) que usa Google**
- ✅ Vincula automáticamente las cuentas
- ✅ Puede loguear con Google o email/password

**Caso 3: Usuario que ya usó Google antes**
- ✅ Login directo sin pedir datos

---

## 🔒 Consideraciones de Seguridad

### ✅ Qué hace Google OAuth:

1. **Google maneja la autenticación**: No guardamos passwords de Google
2. **Email verificado**: Google ya verificó el email del usuario
3. **Tokens seguros**: Google maneja tokens con expiración
4. **2FA gratis**: Si el usuario tiene 2FA en Google, se aplica automáticamente

### ⚠️ Cosas a considerar:

1. **Vincular cuentas**: Si un usuario se registró con email/password y después usa Google con el mismo email, las cuentas se vinculan automáticamente

2. **Teléfono requerido**: Google no provee el teléfono, por eso lo pedimos después del login

3. **Cliente sin teléfono**: El sistema crea el cliente en estado `PRE_REGISTRADO` con un teléfono temporal, y lo activa cuando completa el teléfono

4. **Passwords opcionales**: Los clientes de Google no tienen password en nuestra DB (campo `password` es `null`)

---

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"

**Causa**: La URL de callback no está autorizada en Google Console

**Solución**:
1. Ir a Google Cloud Console > Credentials
2. Editar el OAuth Client ID
3. Verificar que la URL esté EXACTAMENTE así:
   ```
   https://app.coques.com.ar/api/auth/callback/google
   ```
4. No debe tener espacios, ni `/` extra al final
5. Guardar y esperar 5 minutos

### Error: "Access blocked: This app's request is invalid"

**Causa**: Falta configurar el OAuth Consent Screen

**Solución**:
1. Completar todos los campos del OAuth Consent Screen
2. Agregar al menos 1 scope (email, profile)
3. Publicar la app

### Error: "This app isn't verified"

**Causa**: La app está en modo Testing pero no agregaste tu email como Test User

**Solución Rápida**:
1. Agregar tu email en Test Users
2. O publicar la app (Publish App)

**Solución Permanente**:
- Publicar la app (Paso 6)

### Error: "NEXTAUTH_SECRET not configured"

**Causa**: Falta la variable de entorno `NEXTAUTH_SECRET`

**Solución**:
1. Generar un secret aleatorio:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Agregarlo a `.env.local` (desarrollo) o Vercel (producción)

---

## 📊 Monitoreo

### Ver Usuarios que usaron Google OAuth

```sql
SELECT 
  nombre,
  email,
  "authProvider",
  "googleId" IS NOT NULL as "tiene_googleId",
  estado,
  "createdAt"
FROM "Cliente"
WHERE "authProvider" = 'google'
ORDER BY "createdAt" DESC;
```

### Estadísticas de Autenticación

```sql
SELECT 
  "authProvider",
  estado,
  COUNT(*) as total
FROM "Cliente"
GROUP BY "authProvider", estado;
```

---

## 📚 Recursos Adicionales

- **NextAuth.js Docs**: https://next-auth.js.org/
- **Google OAuth Guide**: https://developers.google.com/identity/protocols/oauth2
- **Google Cloud Console**: https://console.cloud.google.com

---

## 🎯 Siguiente Paso

Una vez configurado Google OAuth, los clientes podrán:
1. ✅ Registrarse con 1 click usando su cuenta de Google
2. ✅ No necesitan recordar otra contraseña
3. ✅ Login más rápido y seguro
4. ✅ Menos fricción en el registro

¿Alguna duda? Consultar esta guía o la documentación de NextAuth.
