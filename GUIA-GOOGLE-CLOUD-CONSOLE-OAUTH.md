# Guía Paso a Paso: Configurar Google Cloud Console para OAuth

## 🎯 Objetivo
Configurar Google Cloud Console para permitir que los usuarios se logueen con su cuenta de Google en tu app de fidelización.

**Tiempo estimado**: 15-20 minutos

---

## 📋 Paso 1: Acceder a Google Cloud Console (2 min)

1. Ir a https://console.cloud.google.com
2. Hacer login con tu cuenta de Google (Gmail)
3. Si es tu primera vez, aceptar los Términos de Servicio

---

## 🆕 Paso 2: Crear Nuevo Proyecto (3 min)

### 2.1 Click en el Selector de Proyecto
- En la parte superior izquierda, al lado de "Google Cloud"
- Verás un menú desplegable con tu proyecto actual (si hay alguno)

### 2.2 Crear Proyecto Nuevo
1. Click en el selector
2. En la ventana que se abre, click en **"NEW PROJECT"** (arriba derecha)
3. Completar:
   - **Project name**: `Coques Fidelización`
   - **Organization**: Dejar como está (No organization)
   - **Location**: Dejar como está
4. Click **CREATE**
5. Esperar 10-20 segundos mientras se crea

### 2.3 Seleccionar el Proyecto
1. Click en el selector de proyecto otra vez
2. Seleccionar **"Coques Fidelización"** de la lista
3. Confirmar que en la barra superior dice "Coques Fidelización"

---

## 🔐 Paso 3: Configurar OAuth Consent Screen (5 min)

### 3.1 Ir a OAuth Consent Screen
1. En el menú lateral izquierdo (☰), buscar **"APIs & Services"**
2. Click en **"APIs & Services"** > **"OAuth consent screen"**
   - O directamente: https://console.cloud.google.com/apis/credentials/consent

### 3.2 Elegir Tipo de Usuario
- Seleccionar **"External"** (permite que cualquier usuario con Google se loguee)
- Click **CREATE**

### 3.3 Completar "OAuth consent screen" - Página 1

**App information**:
- **App name**: `Coques Bakery - Fidelización`
- **User support email**: Tu email de Gmail/Google
- **App logo**: (Opcional) Podés subir el logo de Coques si tenés

**App domain** (Opcional, se puede completar después):
- **Application home page**: `https://app.coques.com.ar`
- **Application privacy policy link**: Dejar vacío por ahora
- **Application terms of service link**: Dejar vacío por ahora

**Authorized domains**:
1. Click en **"ADD DOMAIN"**
2. Agregar: `coques.com.ar`
3. Agregar: `vercel.app` (para testing)

**Developer contact information**:
- **Email addresses**: Tu email

Click **SAVE AND CONTINUE**

### 3.4 Página 2: Scopes
- No agregar nada por ahora
- Click **SAVE AND CONTINUE**

### 3.5 Página 3: Test users
- No agregar test users (no es necesario para External)
- Click **SAVE AND CONTINUE**

### 3.6 Página 4: Summary
- Revisar que todo esté OK
- Click **BACK TO DASHBOARD**

---

## 🔑 Paso 4: Crear Credenciales OAuth 2.0 (5 min)

### 4.1 Ir a Credentials
1. En el menú lateral: **"APIs & Services"** > **"Credentials"**
   - O directamente: https://console.cloud.google.com/apis/credentials

### 4.2 Crear OAuth Client ID
1. Click en **"+ CREATE CREDENTIALS"** (arriba)
2. Seleccionar **"OAuth client ID"**

### 4.3 Configurar Application Type
- **Application type**: Seleccionar **"Web application"**
- **Name**: `Coques Fidelización - Web App`

### 4.4 Authorized JavaScript origins
Click en **"+ ADD URI"** y agregar:
```
https://app.coques.com.ar
https://coques.vercel.app
http://localhost:3000
```

**Importante**: Agregar las 3 URLs (producción, Vercel, y desarrollo local)

### 4.5 Authorized redirect URIs
Click en **"+ ADD URI"** y agregar:
```
https://app.coques.com.ar/api/auth/callback/google
https://coques.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

**Nota**: Fijate que terminan con `/api/auth/callback/google` - esto es requerido por NextAuth.js

### 4.6 Crear Credenciales
1. Click **CREATE**
2. Aparecerá una ventana con tus credenciales

### 4.7 ⚠️ IMPORTANTE: Copiar y Guardar las Credenciales

Verás algo como:

```
Your Client ID
123456789-abc123def456.apps.googleusercontent.com

Your Client Secret
GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

**🔴 COPIAR AHORA**:
1. **Client ID**: Seleccionar todo y copiar en un archivo de texto
2. **Client Secret**: Click en el icono de copiar

**⚠️ Importante**: El Client Secret solo se muestra una vez. Si lo perdés, tendrás que generar uno nuevo.

3. Click **OK** para cerrar la ventana

---

## ✅ Paso 5: Verificar Credenciales (1 min)

En la página de Credentials, deberías ver:

1. Sección **"OAuth 2.0 Client IDs"**
2. Tu app: `Coques Fidelización - Web App`
3. Type: `Web application`
4. Creation date: Hoy

---

## 📝 Paso 6: Guardar las Credenciales (Importante)

Crear un archivo de texto temporal con:

```
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

(Reemplazar con tus valores reales)

**Guardar este archivo de forma segura** - lo vas a necesitar para configurar Vercel.

---

## 🎨 Paso 7: Personalizar (Opcional)

### Agregar Logo de la App

1. Volver a **"OAuth consent screen"**
2. Click **EDIT APP**
3. En "App information" > "App logo"
4. Subir logo de Coques (PNG, máx 1MB)
5. **SAVE AND CONTINUE** hasta el final

---

## 🔍 Solución de Problemas

### Error: "Access blocked: This app's request is invalid"

**Causa**: Las redirect URIs no coinciden

**Solución**:
1. Ir a Credentials
2. Click en tu OAuth client
3. Verificar que las "Authorized redirect URIs" sean exactamente:
   - `https://app.coques.com.ar/api/auth/callback/google`
   - No tiene `/` al final
   - Empieza con `https://`

### Error: "The OAuth client was not found"

**Causa**: El Client ID está mal copiado

**Solución**:
1. Volver a Credentials
2. Click en tu OAuth client
3. Copiar el Client ID nuevamente (sin espacios)

---

## 📊 Resumen de Configuración

Una vez completado, tendrás:

✅ Proyecto en Google Cloud Console: "Coques Fidelización"
✅ OAuth consent screen configurado (External)
✅ OAuth 2.0 Client ID creado
✅ Redirect URIs configuradas para producción y desarrollo
✅ Client ID y Client Secret guardados

---

## 🚀 Próximo Paso

Una vez que tengas el Client ID y Client Secret, avisame para:

1. Instalar NextAuth.js en tu proyecto
2. Configurar las variables de entorno en Vercel
3. Implementar el código de login con Google
4. Agregar el botón "Continuar con Google" en /login
5. Testing y deployment

**Tiempo estimado para la implementación**: 1-1.5 horas

---

## 📸 Capturas de Referencia

### OAuth Consent Screen - Configurado
```
Publishing status: In production
User type: External
```

### Credentials - OAuth 2.0 Client IDs
```
Name: Coques Fidelización - Web App
Type: Web application
Creation date: [tu fecha]
```

---

## ❓ Preguntas Frecuentes

### ¿Cuánto cuesta Google OAuth?
**Gratis** - No hay límite de usuarios para OAuth

### ¿Necesito verificar mi app?
No inmediatamente. Para menos de 100 usuarios, podés usar modo "Testing".
Para producción con muchos usuarios, eventualmente necesitás verificación (proceso manual de Google).

### ¿Puedo usar la misma configuración para desarrollo y producción?
Sí, por eso agregamos múltiples redirect URIs (localhost, vercel, dominio personalizado).

### ¿Qué pasa si pierdo el Client Secret?
Podés generar uno nuevo:
1. Ir a Credentials
2. Click en tu OAuth client
3. En "Client secrets", click "ADD SECRET"
4. Copiar el nuevo secret
5. Actualizar en Vercel

---

## ✅ Checklist Final

Antes de continuar con la implementación, verificá que tengas:

- [ ] Proyecto creado en Google Cloud Console
- [ ] OAuth consent screen configurado
- [ ] OAuth 2.0 Client ID creado
- [ ] Client ID copiado y guardado
- [ ] Client Secret copiado y guardado
- [ ] Redirect URIs incluyen `/api/auth/callback/google`

Si tenés todo eso, ¡estás listo para implementar login con Google! 🎉
