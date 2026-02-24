# Migración de Brevo a Resend

## ⚠️ Problema con Brevo

**IP de Vercel cambia constantemente** → Brevo bloquea cada nueva IP → Emails no se envían → Necesitas autorizar manualmente cada IP nueva.

**Solución**: Migrar a **Resend**, que:
- ✅ No requiere autorizar IPs
- ✅ Funciona perfecto con Vercel
- ✅ 3000 emails/mes gratis (vs 300/día de Brevo)
- ✅ Mejor integración con Next.js
- ✅ Configuración más simple

---

## 🚀 Migración a Resend (15 minutos)

### Paso 1: Crear Cuenta en Resend (3 min)

1. Ir a https://resend.com/signup
2. Registrarse (gratis, no pide tarjeta)
3. Confirmar email

### Paso 2: Obtener API Key (2 min)

1. Una vez logueado, ir a **API Keys**
2. Click en **Create API Key**
3. Nombre: "Coques Production"
4. Copiar la key (empieza con `re_`)

### Paso 3: Verificar Dominio (5 min)

1. En Resend, ir a **Domains**
2. Click **Add Domain**
3. Ingresar: `mail.coques.com.ar`
4. Resend te dará registros DNS para agregar

**Agregar en Cloudflare**:
```
Tipo: TXT
Nombre: mail
Valor: [valor que te da Resend]

Tipo: TXT
Nombre: resend._domainkey.mail
Valor: [valor que te da Resend]

Tipo: MX
Nombre: mail
Valor: feedback-smtp.us-east-1.amazonses.com
Prioridad: 10
```

5. Esperar 5-10 minutos
6. En Resend, click **Verify** en el dominio
7. Debería cambiar a estado **Verified** ✅

### Paso 4: Actualizar Variables de Entorno en Vercel (2 min)

1. Ir a Vercel > Tu proyecto > Settings > Environment Variables
2. **Eliminar**:
   - `BREVO_API_KEY`
   - `BREVO_FROM_EMAIL`
3. **Agregar**:
   ```
   RESEND_API_KEY=re_tu_key_aqui
   ```
4. Save

### Paso 5: Actualizar Código (3 min)

**Modificar**: `src/lib/email.ts`

```typescript
// REEMPLAZAR TODO EL ARCHIVO POR:

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: {
    name: string
    email: string
  }
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  message?: string
}

/**
 * Servicio de envío de emails usando Resend
 */
export async function sendEmail({
  to,
  subject,
  html,
  from
}: SendEmailParams): Promise<SendEmailResult> {
  // Verificar si está configurada la API Key
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY no configurada - Email no enviado')
    return {
      success: false,
      message: 'API key no configurada'
    }
  }

  try {
    // Email remitente por defecto
    const defaultFrom = {
      name: 'Coques Bakery',
      email: 'noreply@mail.coques.com.ar',
    }

    const sender = from || defaultFrom

    // Preparar payload para Resend
    const payload = {
      from: `${sender.name} <${sender.email}>`,
      to: [to],
      subject: subject,
      html: html
    }

    // Enviar email con Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    const result = await response.json()
    
    console.log('[Email] ✅ Email enviado exitosamente')
    console.log('[Email] Destinatario:', to)
    console.log('[Email] ID:', result.id)
    
    return {
      success: true,
      messageId: result.id
    }
  } catch (error: any) {
    console.error('[Email] ❌ Error al enviar email')
    console.error('[Email] Destinatario:', to)
    console.error('[Email] Error:', error.message)
    
    return {
      success: false,
      error: error.message || 'Error desconocido'
    }
  }
}
```

### Paso 6: Deploy (automático)

```bash
cd fidelizacion-zona
git add src/lib/email.ts
git commit -m "feat: Migrar de Brevo a Resend para evitar problemas de IP"
git push
```

Vercel desplegará automáticamente.

### Paso 7: Probar (1 min)

1. Ir a https://coques.vercel.app/login
2. Click "¿Olvidaste tu contraseña?"
3. Ingresar tu email
4. ✅ Debería llegar el email (sin problemas de IP)

---

## 📊 Comparación Brevo vs Resend

| Feature | Brevo | Resend |
|---------|-------|--------|
| **Límite gratuito** | 300 emails/día | 3000 emails/mes |
| **Problema de IP** | ❌ Sí, requiere autorizar | ✅ No hay problema |
| **Configuración** | Media | Muy simple |
| **Integración Next.js** | Manual | Nativa |
| **Velocidad de envío** | Normal | Muy rápida |
| **Dashboard** | Completo | Simple y claro |
| **Soporte** | Email | Email + Docs excelentes |

---

## 🎯 Recomendación

**Migrar a Resend ahora** porque:
- ✅ Soluciona definitivamente el problema de IPs
- ✅ Más simple de mantener
- ✅ Mejor para el stack de Next.js/Vercel
- ✅ Plan gratuito más generoso
- ✅ No más emails de bloqueo de IP

El proceso toma **15 minutos** y quedás con un sistema más robusto.

---

## 🔄 Alternativa: Desactivar Validación de IP en Brevo

Si querés seguir con Brevo temporalmente:

1. Ir a https://app.brevo.com/security/authorised_ips
2. Buscar opción "Disable IP validation" o similar
3. Desactivar la validación de IPs

**Nota**: Esto es menos seguro y Brevo puede no tener esta opción en el plan gratuito.

---

## ❓ ¿Quieres que Migremos Ahora?

Si querés, puedo ayudarte a migrar a Resend ahora mismo. Solo necesito que:
1. Te registres en https://resend.com
2. Me avises cuando tengas la API Key
3. Modfico el código y deployamos

Total: **15 minutos** y problema resuelto definitivamente.
