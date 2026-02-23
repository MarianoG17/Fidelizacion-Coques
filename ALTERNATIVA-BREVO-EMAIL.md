# 📧 Alternativa: Usar Brevo (Sendinblue) en vez de Resend

## 🎯 Resumen

**Sí, podés usar Brevo** en vez de Resend. Es igual de bueno (o mejor en algunos aspectos).

---

## ⚖️ Comparación: Brevo vs Resend

| Característica | Resend | Brevo (Sendinblue) |
|----------------|--------|---------------------|
| **Plan Gratuito** | 3,000 emails/mes<br/>100 emails/día | 300 emails/día<br/>Sin límite mensual* |
| **Facilidad** | ⭐⭐⭐⭐⭐ Super simple | ⭐⭐⭐⭐ Simple |
| **Documentación** | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐⭐ Muy buena |
| **Deliverability** | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐⭐⭐ Excelente |
| **Templates** | Código HTML | Código HTML + Editor visual |
| **Dashboard** | Minimalista | Completo (estadísticas, A/B testing) |
| **Extras** | Solo emails | Emails + SMS + WhatsApp + CRM |
| **Soporte** | Email + Discord | Email + Chat + Teléfono |
| **Popularidad** | Nuevo (2023) | Establecido (años) |

\* Con logo de Brevo en los emails

### 🏆 Recomendación:

**Para emails transaccionales simples:**
- ✅ **Resend** - Más moderno, más simple, perfecto para devs

**Si querés más features:**
- ✅ **Brevo** - Dashboard completo, estadísticas, más emails gratis/día

**Ambos son excelentes. Resend es más "developer-friendly", Brevo es más completo.**

---

## 🚀 Implementación con Brevo

### Paso 1: Instalar la librería

```bash
npm install @getbrevo/brevo
```

### Paso 2: Crear servicio de email con Brevo

Crear archivo: `src/lib/email.ts`

```typescript
// src/lib/email.ts
import * as brevo from '@getbrevo/brevo'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: {
    name: string
    email: string
  }
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  // Si no hay API key, solo loguear (para desarrollo)
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Email] BREVO_API_KEY no configurada - Email no enviado')
    console.log('[Email] To:', to)
    console.log('[Email] Subject:', subject)
    return { success: false, message: 'API key no configurada' }
  }

  try {
    // Configurar API Key
    const apiInstance = new brevo.TransactionalEmailsApi()
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    )

    // Email por defecto
    const defaultFrom = {
      name: 'Coques Bakery',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@mail.coques.com.ar',
    }

    // Preparar el email
    const sendSmtpEmail = new brevo.SendSmtpEmail()
    sendSmtpEmail.sender = from || defaultFrom
    sendSmtpEmail.to = [{ email: to }]
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = html

    // Enviar
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail)
    
    console.log('[Email] Email enviado exitosamente:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error: any) {
    console.error('[Email] Error al enviar email:', error.message)
    return { success: false, error: error.message }
  }
}
```

### Paso 3: Actualizar el código de registro

Modificar: `src/app/api/auth/register/route.ts`

```typescript
// Al principio del archivo, cambiar:
// import { Resend } from 'resend'

// Por:
import { sendEmail } from '@/lib/email'

// ...

// En la sección de envío de email (línea ~130), cambiar de:

if (process.env.RESEND_API_KEY) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  // ...
  await resend.emails.send({ ... })
}

// A:

await sendEmail({
  to: validatedData.email,
  subject: '¡Bienvenido a Coques Bakery! 🎉',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- El mismo HTML que ya tenés -->
    </div>
  `,
})
```

### Paso 4: Actualizar recuperación de contraseña

Modificar: `src/app/api/auth/forgot-password/route.ts`

```typescript
// Al principio del archivo, cambiar:
// import { Resend } from 'resend'

// Por:
import { sendEmail } from '@/lib/email'

// ...

// En la sección de envío de email (línea ~90), cambiar a:

await sendEmail({
  to: email,
  subject: 'Recuperá tu contraseña - Coques Bakery',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <!-- El mismo HTML que ya tenés -->
    </div>
  `,
})
```

---

## ⚙️ Configuración en Brevo

### 1. Crear cuenta

1. Ir a: https://www.brevo.com
2. Click en "Sign up free"
3. Completar el formulario
4. Verificar email

### 2. Obtener API Key

1. Ir a: https://app.brevo.com/settings/keys/api
2. O: Menú → Settings → SMTP & API → API Keys
3. Click en "Create a new API key"
4. Nombre: `Coques Fidelizacion`
5. Copiar la API Key (empieza con `xkeysib-...`)

### 3. Configurar dominio (opcional pero recomendado)

Similar a Resend:

1. **Ir a:** Settings → Senders & IP
2. **Add a Sender** (agregar email)
3. **Verificar dominio** con registros DNS:
   - SPF
   - DKIM
   - DMARC

**Registros DNS (tu admin debe configurar):**

```
TXT: mail.coques.com.ar → v=spf1 include:spf.brevo.com ~all
TXT: mail._domainkey.mail.coques.com.ar → [valor que da Brevo]
TXT: _dmarc.mail.coques.com.ar → v=DMARC1; p=none
```

---

## 🔧 Variables de Entorno

### Actualizar `.env` local:

```env
# Brevo - Servicio de emails transaccionales
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_FROM_EMAIL=noreply@mail.coques.com.ar

# URL pública de la app
NEXT_PUBLIC_APP_URL=https://app.coques.com.ar
```

### Actualizar en Vercel:

Settings → Environment Variables:

```
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_FROM_EMAIL=noreply@mail.coques.com.ar
NEXT_PUBLIC_APP_URL=https://app.coques.com.ar
```

---

## 📊 Dashboard de Brevo

Una ventaja de Brevo es el dashboard completo:

### Estadísticas disponibles:

- 📨 Emails enviados
- 📬 Emails entregados
- 📂 Emails abiertos (open rate)
- 🖱️ Clicks en links
- ❌ Bounces (rebotes)
- 🚫 Spam complaints

### Acceder:

https://app.brevo.com/statistics/transactional

---

## 🧪 Testing

### Probar con Brevo:

1. **Registrar un usuario nuevo:**
   - Debería llegar email de bienvenida

2. **Recuperar contraseña:**
   - Debería llegar email de recuperación

3. **Verificar en Brevo Dashboard:**
   - Ir a: https://app.brevo.com/real-time
   - Ver emails en tiempo real

---

## 📝 Ejemplo Completo de Código

### src/lib/email.ts (archivo nuevo)

```typescript
// src/lib/email.ts
import * as brevo from '@getbrevo/brevo'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: {
    name: string
    email: string
  }
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Email] BREVO_API_KEY no configurada - Email no enviado')
    console.log('[Email] Detalles:', { to, subject })
    return { success: false, message: 'API key no configurada' }
  }

  try {
    const apiInstance = new brevo.TransactionalEmailsApi()
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    )

    const defaultFrom = {
      name: 'Coques Bakery',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@mail.coques.com.ar',
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail()
    sendSmtpEmail.sender = from || defaultFrom
    sendSmtpEmail.to = [{ email: to }]
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = html

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail)
    
    console.log('[Email] Email enviado exitosamente a:', to)
    console.log('[Email] Message ID:', result.messageId)
    
    return { 
      success: true, 
      messageId: result.messageId 
    }
  } catch (error: any) {
    console.error('[Email] Error al enviar email:', error)
    return { 
      success: false, 
      error: error.message || 'Error desconocido' 
    }
  }
}
```

### Uso en register/route.ts

```typescript
import { sendEmail } from '@/lib/email'

// ... código existente ...

// Enviar email de bienvenida
try {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coques.vercel.app'

  await sendEmail({
    to: validatedData.email,
    subject: '¡Bienvenido a Coques Bakery! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #9333ea;">¡Bienvenido a Coques Bakery!</h1>
        <p>Hola <strong>${validatedData.nombre}</strong>,</p>
        <p>¡Gracias por registrarte en nuestro programa de fidelización! 🎉</p>
        <!-- Resto del HTML -->
      </div>
    `,
  })

  console.log('[Registro] Email de bienvenida enviado')
} catch (emailError) {
  console.error('[Registro] Error al enviar email:', emailError)
  // No fallar el registro por error de email
}
```

---

## 🔄 Migrar de Resend a Brevo

Si ya tenés Resend implementado:

### Opción 1: Reemplazar completamente

1. Desinstalar Resend:
   ```bash
   npm uninstall resend
   ```

2. Instalar Brevo:
   ```bash
   npm install @getbrevo/brevo
   ```

3. Crear `src/lib/email.ts` con Brevo

4. Actualizar imports en:
   - `src/app/api/auth/register/route.ts`
   - `src/app/api/auth/forgot-password/route.ts`

5. Cambiar variables de entorno

### Opción 2: Usar ambos (para testing)

Podés mantener ambos y elegir según variable de entorno:

```typescript
// src/lib/email.ts
export async function sendEmail(params) {
  const provider = process.env.EMAIL_PROVIDER || 'resend'
  
  if (provider === 'brevo') {
    return sendWithBrevo(params)
  } else {
    return sendWithResend(params)
  }
}
```

```env
EMAIL_PROVIDER=brevo  # o 'resend'
```

---

## 💰 Costos

### Plan Gratuito de Brevo:

| Concepto | Límite |
|----------|--------|
| **Emails/día** | 300 |
| **Contactos** | Ilimitados |
| **Templates** | Ilimitados |
| **Precio** | Gratis (con logo Brevo) |

### Plan Lite (sin logo):

- $25/mes → 20,000 emails/mes
- Sin límite diario
- Sin logo de Brevo

### Vs Resend:

**Para tu app:**
- Resend: 100 emails/día gratis → suficiente si tenés < 100 registros/día
- Brevo: 300 emails/día gratis → más margen

**Recomendación:** Empezá con el gratuito que prefieras. Podés migrar después.

---

## 🐛 Troubleshooting

### Error: "Invalid API key"

**Causa:** API Key incorrecta o no configurada

**Solución:**
- Verificar que la API key esté bien copiada
- Debe empezar con `xkeysib-`
- Verificar que esté en las variables de entorno

### Error: "Sender email not verified"

**Causa:** Email no verificado en Brevo

**Solución:**
1. Ir a Brevo → Settings → Senders
2. Agregar y verificar el email
3. O usar un email ya verificado

### Los emails van a SPAM

**Solución:**
1. Verificar dominio en Brevo (SPF, DKIM)
2. Evitar palabras spam
3. Mantener buen engagement

---

## 📚 Recursos

### Documentación:
- **Brevo Docs:** https://developers.brevo.com/
- **API Reference:** https://developers.brevo.com/reference/
- **Node.js SDK:** https://github.com/getbrevo/brevo-node

### Dashboard:
- **Overview:** https://app.brevo.com/
- **Statistics:** https://app.brevo.com/statistics/transactional
- **Real-time:** https://app.brevo.com/real-time
- **Settings:** https://app.brevo.com/settings/keys/api

---

## ✅ Ventajas de Brevo

1. ✅ **Más emails gratis/día** (300 vs 100)
2. ✅ **Dashboard completo** con estadísticas
3. ✅ **Editor visual** de templates (opcional)
4. ✅ **Múltiples canales** (Email, SMS, WhatsApp)
5. ✅ **CRM incluido** (si lo necesitás en el futuro)
6. ✅ **Más establecido** (años en el mercado)
7. ✅ **Soporte más completo** (chat, teléfono)

---

## ❌ Desventajas de Brevo (vs Resend)

1. ❌ **API un poco más compleja** (no es dramático)
2. ❌ **Logo de Brevo** en plan gratuito (opcional ocultar pagando)
3. ❌ **Menos "developer-friendly"** (más orientado a marketing)

---

## 🎯 Decisión Final

**¿Cuál elegir?**

**Elegí Resend si:**
- Querés lo más simple posible
- No te importa el límite de 100 emails/día
- Te gusta lo nuevo y minimalista
- Solo necesitás emails transaccionales

**Elegí Brevo si:**
- Necesitás más de 100 emails/día
- Querés dashboard con estadísticas
- Podrías necesitar SMS/WhatsApp en el futuro
- Querés una empresa más establecida

**Ambos son excelentes. No hay decisión incorrecta.** 🚀
