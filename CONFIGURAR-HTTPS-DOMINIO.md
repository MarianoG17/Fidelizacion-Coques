# 🔒 Configurar HTTPS para app.coques.com.ar

## ✅ Buenas Noticias

**Vercel configura HTTPS automáticamente y GRATIS** usando certificados Let's Encrypt. No necesitás hacer nada manual.

---

## 📋 Pasos para Activar HTTPS

### 1️⃣ Verificar que el DNS esté propagado

Antes de que Vercel pueda emitir el certificado SSL, el dominio debe estar apuntando correctamente.

**Verificar en línea:**
- Ir a: https://dnschecker.org/
- Escribir: `app.coques.com.ar`
- Tipo: `CNAME`
- Verificar que aparezca: `dd27e2dbb2add99f.vercel-dns-017.com`

**Debe estar verde en varios países** (especialmente Argentina).

---

### 2️⃣ Ir al Dashboard de Vercel

1. Ir a: https://vercel.com/dashboard
2. Click en tu proyecto: **fidelizacion-zona**
3. Click en la pestaña **"Settings"** (arriba)
4. En el menú lateral, click en **"Domains"**

---

### 3️⃣ Verificar el Estado del Dominio

Buscar `app.coques.com.ar` en la lista de dominios.

**Posibles estados:**

#### 🟡 Estado: "Invalid Configuration" o "Pending"
- **Qué significa:** El DNS aún no propagó completamente
- **Qué hacer:** Esperar 5-10 minutos y refrescar la página
- **Si sigue así después de 1 hora:** Revisar con tu admin que el CNAME esté bien configurado

#### 🟡 Estado: "SSL Certificate Pending"
- **Qué significa:** Vercel está generando el certificado (demora 1-5 minutos)
- **Qué hacer:** Solo esperar, se hace automáticamente

#### 🟢 Estado: "Valid Configuration" con 🔒
- **Qué significa:** ¡Todo listo! HTTPS está activo
- **Qué hacer:** Probá acceder a `https://app.coques.com.ar` en tu navegador

---

### 4️⃣ Si el dominio está "Valid" pero NO tiene el candado 🔒

**Hacer click en el dominio** y buscar el botón **"Refresh SSL Certificate"** o **"Renew Certificate"**.

Si no aparece, hacer:

1. Click en los 3 puntitos ⋮ al lado del dominio
2. Click en **"Refresh SSL Certificate"**
3. Esperar 1-2 minutos

---

### 5️⃣ Forzar HTTPS (Redirección automática)

Una vez que tengas el certificado SSL activo:

1. En **Settings → Domains**
2. Click en `app.coques.com.ar`
3. Buscar la opción: **"Redirect to HTTPS"**
4. Activarla (switch ON)

**Esto hace que:**
- Si alguien escribe `http://app.coques.com.ar` → Redirige automáticamente a `https://app.coques.com.ar`

---

## 🔧 Solución de Problemas

### ❌ Error: "Failed to verify domain"

**Causa:** El CNAME no está configurado correctamente.

**Verificar con el admin:**
```
Tipo:  CNAME
Host:  app (o app.coques.com.ar según su panel)
Valor: dd27e2dbb2add99f.vercel-dns-017.com
TTL:   300 o Auto
```

**Importante:** 
- No debe tener un registro A con la misma entrada
- No debe tener proxy/CDN activado (como Cloudflare proxy naranja)

---

### ❌ Error: "CAA Record blocks SSL"

**Causa:** Tu dominio tiene registros CAA que bloquean Let's Encrypt.

**Solución:**
Pedirle al admin que agregue estos registros CAA:

```
0 issue "letsencrypt.org"
0 issuewild "letsencrypt.org"
```

O eliminar los registros CAA existentes si no son necesarios.

---

### ❌ Tarda más de 1 hora

**Pasos:**

1. Verificar en https://dnschecker.org/ que el CNAME esté propagado globalmente
2. Eliminar el dominio de Vercel
3. Esperar 5 minutos
4. Volver a agregarlo
5. Vercel intentará emitir el certificado nuevamente

---

## ✅ Verificación Final

Una vez configurado, probá:

1. Abrir navegador en modo incógnito
2. Ir a: `https://app.coques.com.ar`
3. Debe aparecer el candado 🔒 en la barra de direcciones
4. Click en el candado → "Certificado válido"

---

## 🎯 Próximo Paso

**Una vez que HTTPS esté funcionando:**

1. Ir a Vercel → **Settings → Environment Variables**
2. Editar `NEXT_PUBLIC_APP_URL`
3. Cambiar de `https://fidelizacion-zona.vercel.app` a `https://app.coques.com.ar`
4. Click en **"Save"**
5. Ir a **"Deployments"** y hacer click en **"Redeploy"** en el último deployment

---

## 📞 Si Nada Funciona

Contactar soporte de Vercel:
- https://vercel.com/help
- Botón "Contact Support" (abajo derecha)
- Son muy rápidos respondiendo (usualmente en minutos)

---

**Nota:** Vercel provee SSL/HTTPS gratis y automático. No necesitás comprar certificados ni configurar nada técnico. Solo que el DNS esté bien y esperar que Vercel haga su magia.
