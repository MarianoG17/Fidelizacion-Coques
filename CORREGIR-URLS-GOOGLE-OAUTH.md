# 🔧 Corregir URLs en Google OAuth (2 minutos)

Si ya creaste el OAuth Client con `coques.com.ar` pero necesitas cambiarlo a `app.coques.com.ar`, NO hace falta crear un proyecto nuevo. Solo editá las URLs.

---

## 📝 Paso a Paso

### 1. Ir a Credentials

1. Abrir Google Cloud Console: https://console.cloud.google.com
2. Seleccionar tu proyecto (arriba a la izquierda)
3. Menú lateral → **APIs & Services** → **Credentials**

### 2. Editar OAuth Client

1. En la sección **"OAuth 2.0 Client IDs"**
2. Buscar tu app: `Coques Bakery - Fidelización` (o el nombre que le pusiste)
3. Click en el **lápiz** ✏️ (a la derecha)

### 3. Actualizar JavaScript Origins

En **"Authorized JavaScript origins"**, cambiar:

❌ **Antes:**
```
https://coques.com.ar
```

✅ **Después:**
```
https://app.coques.com.ar
```

**Importante:** También dejá estas:
```
https://coques.vercel.app
http://localhost:3000
```

### 4. Actualizar Redirect URIs

En **"Authorized redirect URIs"**, cambiar:

❌ **Antes:**
```
https://coques.com.ar/api/auth/callback/google
```

✅ **Después:**
```
https://app.coques.com.ar/api/auth/callback/google
```

**Importante:** También dejá estas:
```
https://coques.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

### 5. Guardar

1. Scroll hasta abajo
2. Click en **"SAVE"**
3. Listo ✅

---

## ✅ Verificación

Después de guardar, deberías ver:

**Authorized JavaScript origins:**
```
https://app.coques.com.ar
https://coques.vercel.app
http://localhost:3000
```

**Authorized redirect URIs:**
```
https://app.coques.com.ar/api/auth/callback/google
https://coques.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

---

## 🔍 ¿Por qué `app.coques.com.ar` y no `coques.com.ar`?

### Dominio Raíz (`coques.com.ar`)
- ❌ No podés usar CNAME (DNS lo impide)
- ❌ Tenés que usar A records con IPs fijas
- ❌ Vercel rota IPs, entonces se rompe

### Subdominio (`app.coques.com.ar`)
- ✅ Usa CNAME → `cname.vercel-dns.com`
- ✅ Vercel maneja las IPs automáticamente
- ✅ Nunca se rompe
- ✅ Es la configuración recomendada

---

## 💡 Tip

Si todavía no configuraste el dominio en Vercel, seguí la guía:
- [`CONFIGURAR-DOMINIO-VERCEL-PASO-A-PASO.md`](./CONFIGURAR-DOMINIO-VERCEL-PASO-A-PASO.md)

---

## ❓ Si tenés dudas

- Los Client ID y Client Secret **NO cambian** al editar URLs
- No hace falta crear credenciales nuevas
- Solo estás editando las URLs permitidas
- Los cambios son inmediatos (no hace falta esperar)

---

## 🎯 Resumen

1. Google Console → Credentials
2. Editar tu OAuth Client (✏️)
3. Cambiar `coques.com.ar` → `app.coques.com.ar`
4. Save
5. Listo ✅
