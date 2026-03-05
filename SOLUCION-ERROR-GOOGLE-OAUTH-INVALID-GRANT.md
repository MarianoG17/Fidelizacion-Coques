# 🔴 Error Crítico: Google OAuth `invalid_grant`

## 🎯 Problema

El error que estás viendo en los logs:

```
[error] [next-auth][error][OAUTH_CALLBACK_ERROR] 
https://next-auth.js.org/errors#oauth_callback_error invalid_grant (Bad Request)
```

**Esto significa que Google está rechazando el código de autorización OAuth**. El cliente no puede ni siquiera completar el login con Google, por eso el flujo falla ANTES de llegar a la pantalla del teléfono.

## ⚠️ Causas Comunes

### 1. **Redirect URI Mismatch** (Causa #1 más común)

La URL de callback configurada en tu código **NO coincide** con la URL autorizada en Google Cloud Console.

**Verificar:**

1. ¿Cuál es tu dominio de producción?
   - Ejemplo: `https://app.coques.com.ar`
   - Ejemplo: `https://fidelizacion-zona.vercel.app`

2. Ir a Google Cloud Console:
   - https://console.cloud.google.com/apis/credentials
   - Click en tu OAuth Client ID
   - Ver sección **"Authorized redirect URIs"**

3. **Debe tener EXACTAMENTE:**
   ```
   https://TU-DOMINIO-EXACTO/api/auth/callback/google
   ```

**Ejemplos de URLs correctas:**
```
✅ https://app.coques.com.ar/api/auth/callback/google
✅ https://fidelizacion-zona.vercel.app/api/auth/callback/google
✅ http://localhost:3000/api/auth/callback/google (para desarrollo)
```

**Ejemplos de URLs INCORRECTAS:**
```
❌ https://app.coques.com.ar/api/auth/callback/google/  (barra extra al final)
❌ http://app.coques.com.ar/api/auth/callback/google   (http en vez de https)
❌ https://www.app.coques.com.ar/api/auth/callback/google  (www extra)
❌ https://app-coques.vercel.app/api/auth/callback/google  (guiones en vez de puntos)
```

### 2. **NEXTAUTH_URL Incorrecto** (Causa #2 más común)

La variable de entorno `NEXTAUTH_URL` en Vercel **debe coincidir exactamente** con tu dominio.

**Verificar en Vercel:**

1. Ir a tu proyecto en Vercel
2. Settings > Environment Variables
3. Buscar `NEXTAUTH_URL`

**Debe ser:**
```bash
# Para producción
NEXTAUTH_URL=https://app.coques.com.ar

# NO debe incluir www, ni barras al final
❌ NEXTAUTH_URL=https://www.app.coques.com.ar  (www extra)
❌ NEXTAUTH_URL=https://app.coques.com.ar/     (barra al final)
❌ NEXTAUTH_URL=http://app.coques.com.ar       (http en vez de https)
```

### 3. **Código de Autorización Ya Usado**

Si el usuario hace "back" en el navegador después de autorizar, o si hay un error de red, el código OAuth puede intentar usarse dos veces.

**Síntomas:**
- Funciona la primera vez
- Falla al hacer "back" y volver a intentar
- Funciona después de limpiar cookies

**Solución:**
- El usuario debe limpiar cookies y volver a intentar
- O esperar 5 minutos y volver a intentar

### 4. **Cookies Bloqueadas o Inválidas**

NextAuth usa cookies seguras con `sameSite: 'lax'` que pueden ser bloqueadas en ciertos escenarios.

**Verificar:**

1. Abrir DevTools > Application > Cookies
2. Buscar cookies que empiecen con `__Secure-next-auth`
3. Si no existen o tienen error, las cookies están bloqueadas

**Posibles causas:**
- ❌ Navegador en modo incógnito muy restrictivo
- ❌ Extensiones de privacidad (Privacy Badger, uBlock Origin)
- ❌ Configuración de privacidad del navegador muy alta
- ❌ Safari en iOS con "Prevent Cross-Site Tracking" activado

### 5. **Diferencia de Tiempo (Clock Skew)**

Si tu servidor tiene diferencia de más de 5 minutos con los servidores de Google, el código OAuth se marca como expirado.

**Verificar:**
```bash
# Conectar por SSH a tu servidor (o ver logs de Vercel)
date

# Comparar con hora de Google
curl -I https://www.google.com | grep Date
```

**Solución:**
- En Vercel esto no debería pasar (usa servidores sincronizados)
- Si usas servidor propio, sincronizar con NTP

### 6. **Dominio No Autorizado**

El dominio debe estar en la lista de "Authorized domains" en Google OAuth Consent Screen.

**Verificar:**

1. Google Cloud Console > OAuth consent screen
2. Ver sección "Authorized domains"
3. Debe incluir tu dominio base (sin https://)

**Ejemplo:**
```
✅ coques.com.ar
✅ vercel.app
❌ app.coques.com.ar  (debe ser solo el dominio base)
```

## 🔧 Pasos de Diagnóstico

### Paso 1: Verificar NEXTAUTH_URL en Vercel

```bash
# Ejecutar desde terminal local
vercel env pull .env.production

# Ver el archivo .env.production
cat .env.production | grep NEXTAUTH_URL
```

**Debe mostrar:**
```
NEXTAUTH_URL="https://TU-DOMINIO-EXACTO"
```

### Paso 2: Verificar Redirect URI en Google

1. Ir a: https://console.cloud.google.com/apis/credentials
2. Click en tu OAuth Client ID (el que empieza con números)
3. Ver **"Authorized redirect URIs"**
4. Copiar la primera URI

**Debe ser:**
```
https://[MISMO-DOMINIO-DE-NEXTAUTH_URL]/api/auth/callback/google
```

### Paso 3: Test con URL de Error

Cuando ocurre el error, NextAuth redirige a una URL con el error:

```
https://tu-dominio.com/login?error=OAuthCallback&code=...
```

1. Copiar la URL completa cuando falla
2. Compartirla (sin datos sensibles)
3. Verificar qué parámetros tiene

### Paso 4: Revisar Logs de Vercel

```bash
vercel logs --follow
```

Buscar líneas que contengan:
```
[next-auth]
[error]
OAUTH_CALLBACK_ERROR
invalid_grant
```

## 🛠️ Soluciones

### Solución 1: Corregir URLs en Google Cloud Console

**Si tu dominio es `https://app.coques.com.ar`:**

1. Ir a Google Cloud Console > Credentials
2. Editar tu OAuth Client ID
3. En **"Authorized redirect URIs"**, asegurar que esté:
   ```
   https://app.coques.com.ar/api/auth/callback/google
   ```
4. **NO** poner:
   - ❌ `www.`
   - ❌ Barra al final `/`
   - ❌ `http://` (debe ser `https://`)

5. Click en **"Save"**
6. **IMPORTANTE**: Esperar 5-10 minutos para que Google propague los cambios

### Solución 2: Actualizar NEXTAUTH_URL en Vercel

1. Ir a Vercel > Settings > Environment Variables
2. Editar `NEXTAUTH_URL`
3. Cambiar a:
   ```
   https://app.coques.com.ar
   ```
   (SIN barra al final, SIN www)

4. Click en "Save"
5. **IMPORTANTE**: Hacer **Redeploy** del proyecto
   - Ir a Deployments
   - Click en los 3 puntos del último deploy
   - Click en "Redeploy"

### Solución 3: Limpiar Cookies y Reintentar

**Para el usuario final:**

1. Abrir DevTools (F12)
2. Application > Storage > Clear site data
3. Cerrar sesión de Google en: https://accounts.google.com
4. Cerrar navegador
5. Reabrir y volver a intentar

### Solución 4: Verificar Configuración de Cookies

En [`src/lib/auth-options.ts`](src/lib/auth-options.ts:9-37), verificar que las cookies estén configuradas correctamente:

```typescript
export const authOptions: NextAuthOptions = {
    useSecureCookies: true, // ✅ Debe ser true en producción (https)
    cookies: {
        sessionToken: {
            name: `__Secure-next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',  // ✅ 'lax' funciona mejor que 'strict'
                path: '/',
                secure: true      // ✅ true en producción (https)
            }
        },
        // ...
    }
}
```

**Si estás en http:// (desarrollo local):**

Cambiar temporalmente:
```typescript
useSecureCookies: false, // Solo para desarrollo local
```

### Solución 5: Verificar que el Proyecto de Google esté Activo

1. Ir a Google Cloud Console
2. Seleccionar tu proyecto (arriba a la izquierda)
3. Verificar que el proyecto esté activo (no suspendido)
4. APIs & Services > OAuth consent screen
5. Verificar que el estado sea **"Published"** (no "Testing")

## 🧪 Testing

### Test 1: URL de Autorización Manual

Construir la URL de autorización manualmente:

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=TU-CLIENT-ID.apps.googleusercontent.com
  &redirect_uri=https://TU-DOMINIO/api/auth/callback/google
  &response_type=code
  &scope=openid%20email%20profile
  &state=test
```

1. Reemplazar `TU-CLIENT-ID` y `TU-DOMINIO`
2. Pegar en el navegador
3. Si Google muestra error inmediatamente:
   - ❌ Hay error de configuración en Google Console
4. Si Google muestra pantalla de login:
   - ✅ La configuración de Google está OK
   - El problema está en NextAuth o cookies

### Test 2: Logs Detallados

Agregar logs temporales en [`src/lib/auth-options.ts`](src/lib/auth-options.ts):

```typescript
async signIn({ user, account, profile }) {
    console.log('=== SIGNIN DEBUG ===')
    console.log('Provider:', account?.provider)
    console.log('Account:', JSON.stringify(account, null, 2))
    console.log('User:', JSON.stringify(user, null, 2))
    console.log('Profile:', JSON.stringify(profile, null, 2))
    console.log('==================')
    
    // ... resto del código
}
```

Hacer deploy y revisar logs en Vercel.

## 📋 Checklist de Verificación

- [ ] **Dominio correcto en NEXTAUTH_URL** (sin www, sin barra al final)
- [ ] **Redirect URI exacto en Google Console** (`/api/auth/callback/google`)
- [ ] **Dominio autorizado en OAuth Consent Screen** (dominio base)
- [ ] **GOOGLE_CLIENT_ID correcto** (termina en `.apps.googleusercontent.com`)
- [ ] **GOOGLE_CLIENT_SECRET correcto** (empieza con `GOCSPX-`)
- [ ] **NEXTAUTH_SECRET configurado** (string aleatorio de 64+ caracteres)
- [ ] **useSecureCookies: true** en producción (https)
- [ ] **App publicada** en Google (no en modo Testing)
- [ ] **Esperado 5-10 min** después de cambios en Google Console
- [ ] **Redeploy** hecho en Vercel después de cambiar variables

## 🚀 Solución Rápida (Caso Más Común)

**Si el dominio es `https://app.coques.com.ar`:**

### En Google Cloud Console:
```
Authorized redirect URIs:
https://app.coques.com.ar/api/auth/callback/google

Authorized JavaScript origins:
https://app.coques.com.ar

Authorized domains (OAuth Consent Screen):
coques.com.ar
```

### En Vercel Environment Variables:
```bash
NEXTAUTH_URL=https://app.coques.com.ar
GOOGLE_CLIENT_ID=123456789-abcd.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
NEXTAUTH_SECRET=tu-secret-aleatorio-64-chars
```

### Después de los cambios:
1. ✅ Guardar en Google Console
2. ✅ Esperar 5 minutos
3. ✅ Redeploy en Vercel
4. ✅ Limpiar cookies del navegador
5. ✅ Volver a probar

## 📞 Si Nada Funciona

Compartir la siguiente información:

1. **Dominio exacto de producción:** `https://___________`
2. **NEXTAUTH_URL configurado:** (copiar de Vercel)
3. **Redirect URI configurado en Google:** (copiar de Google Console)
4. **Screenshot** del error en el navegador
5. **Logs de Vercel** con el error `invalid_grant`

Con esta info puedo identificar exactamente dónde está la diferencia.

---

**Última actualización:** 2026-03-05  
**Estado:** ⚠️ Crítico - Bloquea el login con Google
