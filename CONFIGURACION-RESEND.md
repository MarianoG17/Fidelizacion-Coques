# 📧 Configuración de Resend para Emails Transaccionales

Guía completa para configurar Resend en tu aplicación de fidelización para enviar emails de bienvenida y recuperación de contraseña.

---

## 📋 ¿Qué es Resend?

**Resend** es un servicio moderno de emails transaccionales:
- ✅ Fácil de configurar
- ✅ API simple y confiable
- ✅ Excelente deliverability (tus emails llegan a la bandeja de entrada)
- ✅ Plan gratuito: 3,000 emails/mes y 100 emails/día
- ✅ Soporte para dominios personalizados

**Alternativas:** SendGrid, Mailgun, AWS SES (Resend es más simple)

---

## 🎯 Paso 1: Crear Cuenta en Resend

1. **Ir a:** https://resend.com
2. **Click en "Start Building"** o "Sign Up"
3. **Registrarse con:**
   - Email
   - GitHub (recomendado si ya lo usas)
   - Google
4. **Verificar tu email** (recibirás un link de confirmación)

---

## 🔑 Paso 2: Obtener la API Key

### Una vez dentro del dashboard:

1. **Ir a:** https://resend.com/api-keys
   - O desde el menú lateral: **API Keys**

2. **Click en "Create API Key"**

3. **Configurar:**
   - **Name:** `Coques Fidelizacion Production` (o el nombre que prefieras)
   - **Permission:** `Sending access` (por defecto)
   - **Domain:** (seleccionar después de configurar el dominio)

4. **Click en "Create"**

5. **⚠️ IMPORTANTE:** Copiar la API Key inmediatamente
   - Se muestra una sola vez
   - Formato: `re_xxxxxxxxxxxxxxxxxxxxx`
   - Si la perdés, tenés que crear una nueva

### Guardar la API Key:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

---

## 🌐 Paso 3: Configurar tu Dominio (Recomendado)

### ¿Por qué configurar un dominio?

**Sin dominio verificado:**
- ✅ Podés enviar emails
- ❌ Solo desde `onboarding@resend.dev`
- ❌ Baja confianza de los usuarios
- ❌ Mayor probabilidad de ir a spam

**Con dominio verificado:**
- ✅ Emails desde `noreply@coques.com.ar`
- ✅ Mayor confianza
- ✅ Mejor deliverability
- ✅ Imagen profesional

### Configurar el dominio:

1. **Ir a:** https://resend.com/domains

2. **Click en "Add Domain"**

3. **Elegir:**
   - **Option A - Dominio raíz:** `coques.com.ar` (para `@coques.com.ar`)
   - **Option B - Subdominio:** `mail.coques.com.ar` (para `@mail.coques.com.ar`)

   ⭐ **Recomendado:** Usar un subdominio (`mail.coques.com.ar`) para no afectar tu email principal.

4. **Click en "Add"**

---

## 📝 Paso 4: Configurar Registros DNS

Resend te va a mostrar los registros DNS que necesitás agregar. Enviá esta información a tu administrador:

### Registros que te pedirá Resend:

#### 1. **SPF Record** (Sender Policy Framework)
```
Tipo: TXT
Nombre: mail.coques.com.ar (o tu subdominio)
Valor: v=spf1 include:resend.com ~all
```

#### 2. **DKIM Record** (Domain Keys Identified Mail)
```
Tipo: TXT
Nombre: resend._domainkey.mail.coques.com.ar
Valor: (Resend te da el valor específico)
```

#### 3. **DMARC Record** (opcional pero recomendado)
```
Tipo: TXT
Nombre: _dmarc.mail.coques.com.ar
Valor: v=DMARC1; p=none; pct=100; rua=mailto:tu-email@coques.com.ar
```

### Ejemplo de mensaje para tu administrador:

```
Hola, necesito configurar los siguientes registros DNS para enviar emails 
desde nuestra aplicación de fidelización:

DOMINIO: mail.coques.com.ar

Registros a agregar:

1. SPF
   Tipo: TXT
   Host: mail.coques.com.ar
   Valor: v=spf1 include:resend.com ~all

2. DKIM
   Tipo: TXT
   Host: resend._domainkey.mail.coques.com.ar
   Valor: [copiar valor que da Resend]

3. DMARC (opcional)
   Tipo: TXT
   Host: _dmarc.mail.coques.com.ar
   Valor: v=DMARC1; p=none; pct=100; rua=mailto:admin@coques.com.ar

Estos registros son para autenticar los emails y evitar que vayan a spam.
```

---

## ⏱️ Paso 5: Verificar el Dominio

1. **Una vez que tu admin configure el DNS:**
   - Esperar 10 minutos a 48 horas (usualmente < 1 hora)

2. **En Resend Dashboard:**
   - Ir a **Domains**
   - Click en tu dominio
   - Click en **"Verify DNS Records"**

3. **Estado:**
   - ✅ **Verified:** ¡Todo OK!
   - ⏳ **Pending:** Esperar más tiempo
   - ❌ **Failed:** Revisar los registros DNS

### Verificar manualmente (opcional):

```bash
# Windows - CMD o PowerShell
nslookup -type=txt mail.coques.com.ar

# Deberías ver el registro SPF
```

---

## ⚙️ Paso 6: Configurar Variables de Entorno

### En Vercel (Producción):

1. **Ir a tu proyecto en Vercel**
2. **Settings → Environment Variables**
3. **Agregar:**

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Coques Bakery <noreply@mail.coques.com.ar>
```

4. **Click en "Save"**
5. **Redeploy** el proyecto

### En tu archivo `.env` local (Desarrollo):

```env
# Resend - Emails transaccionales
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Coques Bakery <noreply@mail.coques.com.ar>
```

### Formato del `RESEND_FROM_EMAIL`:

```
Nombre del remitente <email@dominio.com.ar>
```

Ejemplos válidos:
- `Coques Bakery <noreply@mail.coques.com.ar>`
- `Coques Fidelización <no-reply@coques.com.ar>`
- `noreply@mail.coques.com.ar` (sin nombre)

⚠️ **Importante:** El email debe ser del dominio que verificaste en Resend.

---

## 🧪 Paso 7: Probar el Envío de Emails

### Opción A: Desde la aplicación (Recomendado)

1. **Probar recuperación de contraseña:**
   ```
   https://app.coques.com.ar/recuperar-password
   ```
   - Ingresar un email de prueba
   - Revisar la consola del servidor (Vercel Logs)
   - Verificar que llegue el email

2. **Probar registro:**
   ```
   https://app.coques.com.ar/login
   ```
   - Registrar un usuario nuevo
   - Deberías recibir email de bienvenida

### Opción B: Revisar logs en Resend

1. **Ir a:** https://resend.com/emails
2. **Ver todos los emails enviados:**
   - Estado (delivered, bounced, etc.)
   - Destinatario
   - Asunto
   - Timestamp

### Opción C: Revisar logs en Vercel

```bash
# Ver logs en tiempo real
vercel logs [nombre-del-proyecto] --follow
```

Buscar:
```
[Registro] Email de bienvenida enviado a: usuario@example.com
[Forgot Password] Email enviado exitosamente
```

---

## 📊 Monitoreo y Límites

### Plan Gratuito de Resend:

| Concepto | Límite |
|----------|--------|
| **Emails/mes** | 3,000 |
| **Emails/día** | 100 |
| **Precio** | Gratis |

**Si necesitas más:**
- Plan Pro: $20/mes → 50,000 emails/mes

### Ver uso actual:

1. **Dashboard de Resend:** https://resend.com/overview
2. **Métricas:**
   - Emails enviados hoy
   - Emails del mes
   - Tasa de entrega
   - Tasa de apertura

---

## 🎨 Personalizar los Emails

Los emails ya están configurados en tu código:

### Email de Bienvenida

**Archivo:** [`src/app/api/auth/register/route.ts`](fidelizacion-zona/src/app/api/auth/register/route.ts:130)

**Incluye:**
- ✅ Saludo personalizado con nombre del usuario
- ✅ Explicación de beneficios
- ✅ Código de referido del usuario
- ✅ Link al pase de fidelización
- ✅ Datos de la cuenta

### Email de Recuperación de Contraseña

**Archivo:** [`src/app/api/auth/forgot-password/route.ts`](fidelizacion-zona/src/app/api/auth/forgot-password/route.ts:95)

**Incluye:**
- ✅ Link seguro con token único
- ✅ Expiración de 1 hora
- ✅ Diseño profesional
- ✅ Instrucciones claras

### Para personalizar:

Editar el HTML en esos archivos. Usar estilos inline (no archivos CSS externos).

---

## 🐛 Troubleshooting

### Error: "RESEND_API_KEY no configurada"

**Causa:** La variable de entorno no está seteada

**Solución:**
```bash
# Verificar en local
echo $RESEND_API_KEY    # Linux/Mac
echo %RESEND_API_KEY%   # Windows CMD
$env:RESEND_API_KEY     # PowerShell

# Si está vacío, agregar en .env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

---

### Error: "Domain not verified"

**Causa:** Estás usando un email de un dominio no verificado

**Solución:**
1. Verificar que el dominio esté activo en Resend
2. Usar el email correcto en `RESEND_FROM_EMAIL`
3. Mientras tanto, usar `onboarding@resend.dev` para testing

---

### Los emails van a SPAM

**Causa:** Dominio no verificado o registros DNS mal configurados

**Solución:**
1. ✅ Verificar que SPF, DKIM y DMARC estén configurados
2. ✅ Verificar el dominio en Resend
3. ✅ Evitar palabras spam en el asunto ("GRATIS", "URGENTE", etc.)
4. ✅ Incluir un link de unsuscribe (no aplicable para transaccionales)
5. ✅ Mantener un buen ratio de entrega

---

### Los emails no llegan

**Pasos de diagnóstico:**

1. **Revisar logs de Resend:**
   - https://resend.com/emails
   - Ver el estado del email

2. **Revisar logs de Vercel:**
   ```bash
   vercel logs --follow
   ```

3. **Verificar la API Key:**
   - ¿Está correcta?
   - ¿Tiene permisos de "Sending access"?

4. **Verificar el código:**
   - ¿Se ejecuta el bloque de Resend?
   - ¿Hay errores en el catch?

5. **Revisar la carpeta SPAM del destinatario**

---

## 📈 Mejores Prácticas

### ✅ DO - Hacer:

- ✅ Usar dominio verificado
- ✅ Configurar SPF, DKIM y DMARC
- ✅ Enviar solo emails importantes (transaccionales)
- ✅ Personalizar con el nombre del usuario
- ✅ Incluir links claros y relevantes
- ✅ Usar diseño responsive (mobile-friendly)
- ✅ Monitorear las métricas en Resend

### ❌ DON'T - Evitar:

- ❌ No enviar spam o marketing masivo (usa otra herramienta)
- ❌ No hardcodear la API Key en el código
- ❌ No usar `onboarding@resend.dev` en producción
- ❌ No exceder los límites del plan gratuito
- ❌ No enviar sin verificar el dominio
- ❌ No incluir attachments pesados (max 40MB)

---

## 🎉 Checklist Final

Antes de ir a producción:

- [ ] Cuenta de Resend creada
- [ ] API Key generada y guardada en variables de entorno
- [ ] Dominio agregado en Resend
- [ ] Registros DNS configurados (SPF, DKIM, DMARC)
- [ ] Dominio verificado en Resend (status: ✅ Verified)
- [ ] `RESEND_API_KEY` configurada en Vercel
- [ ] `RESEND_FROM_EMAIL` configurada con tu dominio
- [ ] `NEXT_PUBLIC_APP_URL` configurada con tu dominio personalizado
- [ ] Emails de prueba enviados y recibidos
- [ ] Emails no van a SPAM
- [ ] Los links en los emails funcionan correctamente
- [ ] Logs revisados en Resend y Vercel

---

## 📚 Recursos Adicionales

### Documentación:
- **Resend Docs:** https://resend.com/docs
- **Resend API:** https://resend.com/docs/api-reference
- **SPF/DKIM/DMARC:** https://resend.com/docs/knowledge-base/domain-authentication

### Dashboard de Resend:
- **Overview:** https://resend.com/overview
- **Emails enviados:** https://resend.com/emails
- **Dominios:** https://resend.com/domains
- **API Keys:** https://resend.com/api-keys

### Testing:
- **Mail Tester:** https://www.mail-tester.com/ (verifica spam score)
- **MXToolbox:** https://mxtoolbox.com/ (verifica DNS)

---

## 🆘 Soporte

**¿Problemas con Resend?**
- 📧 Email: support@resend.com
- 💬 Discord: https://resend.com/discord
- 📖 Knowledge Base: https://resend.com/docs/knowledge-base

**¿Problemas con la integración?**
- Revisar los logs en Vercel
- Revisar el código en los archivos mencionados
- Verificar las variables de entorno

---

## 🔐 Seguridad

**Proteger tu API Key:**

✅ **Hacer:**
- Usar variables de entorno
- No commitear en Git
- Regenerar si se filtra
- Usar diferentes keys para dev/prod

❌ **NO hacer:**
- Hardcodear en el código
- Compartir públicamente
- Subir a GitHub
- Incluir en screenshots

**Archivo `.gitignore` debe incluir:**
```gitignore
.env
.env.local
.env.production
```

---

¡Listo! Con esta configuración vas a poder enviar emails profesionales de bienvenida y recuperación de contraseña desde tu propio dominio. 🚀
