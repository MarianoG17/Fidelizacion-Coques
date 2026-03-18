# 🔐 Solución: Error 401 en Panel Admin

## 🔍 Problema

Al entrar a `https://app.coques.com.ar/admin` aparece "Error al cargar métricas" y un error 401 en la consola.

## ✅ Solución

El panel admin requiere autenticación mediante una **Admin Key**. Seguí estos pasos:

---

## 📝 Paso 1: Verificar/Crear ADMIN_KEY en Vercel

### Opción A: Ya tenés la ADMIN_KEY configurada

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Buscá `ADMIN_KEY`
4. Si existe, copiá su valor (vas a necesitarlo)

### Opción B: No tenés ADMIN_KEY configurada

1. Generá una key aleatoria segura:

**En tu terminal (PowerShell):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Copiá el resultado (ejemplo: `a1b2c3d4e5f6...`)

3. Agregá la variable en Vercel:
   - Settings → Environment Variables
   - Name: `ADMIN_KEY`
   - Value: (pegá la key generada)
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Click **"Save"**

4. **IMPORTANTE:** Redeploy el proyecto para que la variable tome efecto
   - Deployments → Click en los "..." del último deploy → "Redeploy"

---

## 📝 Paso 2: Ingresar al Panel Admin

1. Ve a: `https://app.coques.com.ar/admin`

2. Te va a aparecer una pantalla de login:
   ```
   Panel Admin
   ┌──────────────────────┐
   │ Admin Key            │
   │ [ingresá tu key]     │
   └──────────────────────┘
        [ Acceder ]
   ```

3. Ingresá la **ADMIN_KEY** que configuraste en Vercel

4. Click en **"Acceder"**

5. ✅ Listo! Ya deberías ver las métricas

---

## 🔒 Cómo Funciona

### Frontend ([`src/app/admin/page.tsx`](src/app/admin/page.tsx:14))

```typescript
// 1. Al cargar, busca si ya tenés una key guardada
useEffect(() => {
    const key = localStorage.getItem('admin_key')
    if (key) {
        setAdminKey(key)
        setAutenticado(true)
    }
}, [])

// 2. Cuando hacés login, guarda la key
function login() {
    localStorage.setItem('admin_key', adminKey)
    setAutenticado(true)
}
```

### Backend ([`src/app/api/admin/metricas/route.ts`](src/app/api/admin/metricas/route.ts:9))

```typescript
// Verifica que la key del usuario coincida con la de Vercel
const adminKey = req.headers.get('x-admin-key')
if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}
```

### Flujo completo:

```
Usuario ingresa admin key → Se guarda en localStorage
     ↓
Usuario navega por admin panel
     ↓
Cada petición envía header: x-admin-key
     ↓
Backend verifica: adminKey === process.env.ADMIN_KEY
     ↓
✅ Autorizado → Devuelve datos
❌ No autorizado → Error 401
```

---

## 🎯 Resumen

**Para que funcione:**

1. ✅ Variable `ADMIN_KEY` configurada en Vercel
2. ✅ Proyecto redeployado (para que tome la variable)
3. ✅ Ingresar la misma key en el formulario de login de `/admin`

---

## 🔐 Seguridad

- La `ADMIN_KEY` se guarda en `localStorage` del navegador
- Solo vos conocés esta key (no se comparte públicamente)
- Es diferente de la contraseña del staff (`COQUES_LOCAL_PASSWORD`)
- Si alguien intenta acceder sin la key correcta → Error 401

---

## 🚪 Cerrar Sesión

Para salir del panel admin:

1. Click en **"Cerrar sesión"** (arriba a la derecha)
2. Esto borra la key de `localStorage`
3. Te vuelve a pedir la key en el próximo acceso

---

## ❓ FAQ

### ¿Cada cuánto tengo que ingresar la key?

- **Una sola vez por navegador**
- Se guarda en localStorage
- A menos que borres las cookies/datos del navegador
- O que hagas "Cerrar sesión"

### ¿Puedo usar diferentes keys en dev y prod?

- Sí, podés configurar diferentes `ADMIN_KEY` en cada environment de Vercel
- Production: una key
- Preview: otra key
- Development: otra key

### ¿Qué pasa si pierdo la ADMIN_KEY?

- Si la perdés, podés generar una nueva
- Cambiala en Vercel Environment Variables
- Redeploy
- Ingresá con la nueva key

### ¿Es seguro guardar la key en localStorage?

- Para un panel admin interno, es aceptable
- Solo vos accedés a esta URL
- Si necesitás más seguridad:
  - Implementar login con usuario/contraseña + base de datos
  - Agregar 2FA
  - Restringir por IP
  - Usar VPN

---

## 🎉 ¡Listo!

Una vez que ingreses la key correcta, vas a poder:

- ✅ Ver métricas del sistema
- ✅ Gestionar eventos especiales
- ✅ Ver clientes
- ✅ Configurar niveles y beneficios
- ✅ Exportar visitas a Excel
- ✅ Ver feedbacks
- ✅ Configurar notificaciones push
