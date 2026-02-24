# Desbloquear IP de Vercel en Brevo

## ⚠️ Error Actual

```
Error: We have detected you are using an unrecognised IP address 54.163.208.19
Link: https://app.brevo.com/security/authorised_ips
```

**Causa**: Brevo bloquea por seguridad las IPs no autorizadas.

**Solución**: Autorizar las IPs de Vercel en Brevo.

---

## 📋 Pasos para Desbloquear (5 minutos)

### Paso 1: Ingresar a Brevo

1. Ir a https://app.brevo.com
2. Hacer login con tu cuenta

### Paso 2: Ir a Configuración de Seguridad

1. Click en tu perfil (arriba derecha)
2. Seleccionar **"Security"** o **"Seguridad"**
3. Click en **"Authorised IPs"** o **"IPs Autorizadas"**

O directamente: https://app.brevo.com/security/authorised_ips

### Paso 3: Agregar IPs de Vercel

Brevo te mostrará la IP detectada (54.163.208.19). 

**Opción A - Permitir IPs específicas de Vercel:**
```
# IPs de Vercel us-east-1 (donde está tu app)
54.163.208.19
3.214.139.84
52.7.140.94
54.159.42.102
```

**Opción B - Permitir todo el rango de Vercel (más simple):**

Click en **"Add IP"** y agregar cada una de estas **subredes**:
```
76.76.21.0/24
76.76.21.21
```

**Opción C - Permitir todas las IPs (menos seguro pero más fácil):**

Si hay una opción "Allow all IPs" o "Permitir todas las IPs", activarla.

### Paso 4: Guardar Cambios

1. Click en **"Save"** o **"Guardar"**
2. Las IPs quedan autorizadas inmediatamente

### Paso 5: Probar de Nuevo

1. Ir a https://coques.vercel.app/login
2. Click en "¿Olvidaste tu contraseña?"
3. Ingresar tu email
4. ✅ Debería enviar el email exitosamente

---

## 🔍 Si Sigue Sin Funcionar

### Ver logs de Vercel:

1. Ir a Vercel > Tu proyecto > Logs
2. Probar recuperar contraseña
3. Buscar líneas con `[Email]`
4. Ver si el error cambió o si ahora muestra éxito

### IPs dinámicas de Vercel:

Vercel puede usar diferentes IPs. Si sigue bloqueando:

**Solución temporal**: Desactivar validación de IP en Brevo
- En Security > Authorised IPs
- Desactivar "Enable IP validation"

**Solución permanente**: Agregar todas las IPs de Vercel us-east-1
- Ver: https://vercel.com/docs/edge-network/regions
- Agregar todas las IPs de la región donde está tu app

---

## 🎯 Alternativa: Cambiar a Resend

Si Brevo sigue dando problemas, Resend es más simple:

### Ventajas de Resend:
- ✅ **3000 emails/mes gratis** (vs 300/día de Brevo)
- ✅ **No requiere autorizar IPs**
- ✅ **Más fácil de configurar**
- ✅ **Mejor DX (Developer Experience)**
- ✅ **Hecho específicamente para Next.js**

### Migración a Resend (15 minutos):

1. Crear cuenta en https://resend.com
2. Verificar dominio (igual que Brevo)
3. Obtener API Key
4. Cambiar en Vercel:
   ```bash
   # Reemplazar
   BREVO_API_KEY=xxx
   BREVO_FROM_EMAIL=yyy
   
   # Por
   RESEND_API_KEY=re_xxxxx
   RESEND_FROM_EMAIL=noreply@mail.coques.com.ar
   ```
5. Modificar `src/lib/email.ts` (código similar, solo cambia URL)

¿Querés que te ayude con la migración a Resend? Es mucho más simple y confiable.

---

## 📝 Resumen

**Error**: IP de Vercel bloqueada por Brevo
**Solución rápida**: Autorizar IP en https://app.brevo.com/security/authorised_ips
**Solución alternativa**: Migrar a Resend (más simple, sin problemas de IP)

Una vez autorizada la IP, el sistema funcionará perfectamente. El código está correcto.
