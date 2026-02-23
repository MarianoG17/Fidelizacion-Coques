# 🌐 Configuración de Dominio Personalizado

Guía para configurar un subdominio de Coques (ej: `app.coques.com.ar`) en vez del link de Vercel por defecto.

## 📋 Resumen

En vez de usar `https://tu-proyecto.vercel.app`, vas a configurar tu propia URL personalizada como `https://app.coques.com.ar`.

---

## 🎯 Paso 1: Obtener la IP/DNS de Vercel

### Opción A: DNS de Vercel (Recomendado) ⭐

Vercel usa un **sistema CNAME**, no IPs directas. Esto es mejor porque:
- Las IPs de Vercel pueden cambiar
- El CNAME se actualiza automáticamente
- Es más confiable

**Valor que necesitás configurar:**
```
cname.vercel-dns.com
```

### Opción B: Ver la configuración actual

1. Ir a tu proyecto en Vercel: https://vercel.com/dashboard
2. Ir a **Settings → Domains**
3. Ahí verás las instrucciones específicas para tu proyecto

---

## 🔧 Paso 2: Configuración en el Panel de tu Dominio

Necesitás hablar con tu administrador de sistemas/hosting y pedirle que configure:

### Para subdominio (Ejemplo: `app.coques.com.ar`)

**Tipo de registro:** `CNAME`

| Campo | Valor |
|-------|-------|
| **Tipo** | `CNAME` |
| **Nombre/Host** | `app` (o el subdominio que quieras) |
| **Valor/Apunta a** | `cname.vercel-dns.com` |
| **TTL** | `3600` (1 hora) o automático |

### Para dominio raíz (Ejemplo: `coques.com.ar`)

Si querés usar el dominio raíz (sin `app.`), algunos proveedores no permiten CNAME en la raíz. En ese caso:

**Opción 1 - Si tu proveedor soporta CNAME Flattening:**
```
CNAME @ → cname.vercel-dns.com
```

**Opción 2 - Usar registros A (menos recomendado):**

Primero obtené las IPs actuales de Vercel ejecutando:
```bash
nslookup cname.vercel-dns.com
```

Luego crear registros A:
```
A @ → 76.76.21.21
A @ → 76.76.21.142
```

⚠️ **Nota:** Las IPs de Vercel pueden cambiar. Prefiere CNAME siempre que sea posible.

---

## 📧 Paso 3: Agregar el Dominio en Vercel

1. **Ir a tu proyecto en Vercel**
   - https://vercel.com/dashboard → Tu proyecto

2. **Ir a Settings → Domains**

3. **Agregar tu dominio:**
   - Escribir: `app.coques.com.ar` (o tu subdominio)
   - Click en **Add**

4. **Vercel te va a mostrar:**
   - ✅ Si el DNS está configurado correctamente
   - ⚠️ Si falta configuración
   - ❌ Si hay errores

5. **Esperar la verificación:**
   - Puede tardar de 5 minutos a 48 horas
   - Usualmente funciona en menos de 1 hora

---

## 🔐 Paso 4: Configurar SSL (HTTPS)

**¡Buenas noticias!** Vercel configura SSL automáticamente.

- Una vez que el dominio esté verificado
- Vercel genera un certificado SSL gratis (Let's Encrypt)
- Se renueva automáticamente

No tenés que hacer nada. Solo esperar que el dominio esté activo.

---

## ⚙️ Paso 5: Actualizar Variables de Entorno

Una vez que el dominio esté funcionando:

### En Vercel Dashboard:

1. **Settings → Environment Variables**
2. **Editar o agregar:**

```env
NEXT_PUBLIC_APP_URL=https://app.coques.com.ar
```

3. **Click en Save**
4. **Redeploy** el proyecto:
   - Ir a **Deployments**
   - Click en los 3 puntos del último deployment
   - Click en **Redeploy**

### En tu archivo `.env` local:

```env
NEXT_PUBLIC_APP_URL=https://app.coques.com.ar
```

Esta variable se usa para:
- Links en emails (recuperación de contraseña)
- Links de verificación
- Email de bienvenida
- Compartir enlaces

---

## ✅ Paso 6: Verificar que Funciona

### 1. Verificar DNS

```bash
# Windows (CMD o PowerShell)
nslookup app.coques.com.ar

# Debería mostrar:
# Name: cname.vercel-dns.com
# Address: (IPs de Vercel)
```

### 2. Verificar HTTPS

Abrir en el navegador:
```
https://app.coques.com.ar
```

Debería:
- ✅ Cargar tu aplicación
- ✅ Mostrar el candado verde (SSL válido)
- ✅ No mostrar warnings de seguridad

### 3. Verificar Emails

Registrar un usuario nuevo y verificar que el email de bienvenida tenga el link correcto:
```
https://app.coques.com.ar/pass
```

---

## 🐛 Troubleshooting

### Problema: "Domain not found" en Vercel

**Causa:** DNS no propagado todavía

**Solución:**
- Esperar entre 30 min y 48 horas
- Verificar que el CNAME esté bien configurado
- Usar una herramienta online: https://dnschecker.org/

---

### Problema: "Invalid Configuration" en Vercel

**Causa:** El CNAME apunta al lugar incorrecto

**Solución:**
- Verificar que apunte a `cname.vercel-dns.com`
- No debe tener `http://` ni `https://` en el valor
- No debe tener `/` al final

**Correcto:**
```
app CNAME cname.vercel-dns.com
```

**Incorrecto:**
```
app CNAME https://cname.vercel-dns.com/
```

---

### Problema: ERR_SSL_VERSION_OR_CIPHER_MISMATCH

**Causa:** El certificado SSL no se generó todavía

**Solución:**
- Esperar 15-30 minutos después de que Vercel verifique el dominio
- El certificado se genera automáticamente
- Si después de 24 horas no funciona, contactar soporte de Vercel

---

### Problema: Mixed Content Warnings

**Causa:** Algunos recursos se cargan por HTTP en vez de HTTPS

**Solución:**
- Verificar que no haya URLs hardcodeadas con `http://`
- Usar URLs relativas cuando sea posible
- En Next.js, las URLs deberían ser automáticamente HTTPS

---

## 📝 Información para tu Administrador

Decile a tu administrador que necesita:

**Para subdominio `app.coques.com.ar`:**

1. **Crear un registro CNAME en el DNS de `coques.com.ar`:**
   ```
   Tipo: CNAME
   Nombre: app
   Apunta a: cname.vercel-dns.com
   TTL: 3600 (o automático)
   ```

2. **Tiempo de propagación:** 5 minutos a 48 horas (usualmente < 1 hora)

3. **No necesita configurar SSL:** Vercel lo hace automáticamente

4. **No necesita IPs:** El CNAME es suficiente

**Si usa Cloudflare o similar:**
- Desactivar el proxy naranja (⚠️ orange cloud) temporalmente
- Dejar el DNS en "DNS only" (gray cloud) ☁️
- Una vez que funcione, puede reactivar el proxy si quiere

---

## 🎉 ¡Listo!

Una vez configurado:

- ✅ Los usuarios van a acceder por `app.coques.com.ar`
- ✅ Los emails van a tener links con tu dominio
- ✅ SSL/HTTPS funcionando automáticamente
- ✅ El dominio anterior `.vercel.app` seguirá funcionando (opcional)

---

## 📚 Links Útiles

- **Documentación oficial de Vercel:** https://vercel.com/docs/concepts/projects/domains
- **Verificar DNS:** https://dnschecker.org/
- **Verificar SSL:** https://www.ssllabs.com/ssltest/

---

## 🆘 ¿Necesitás ayuda?

Si algo no funciona:

1. Verificá los pasos de **Troubleshooting** arriba
2. Revisá la sección **Domains** en Vercel Dashboard
3. Contactá a tu administrador con este documento
4. Contactá al soporte de Vercel (muy buenos y rápidos)
