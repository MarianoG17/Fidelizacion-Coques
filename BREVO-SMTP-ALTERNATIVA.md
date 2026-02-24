# Alternativa: Usar SMTP de Brevo (sin problemas de IP)

## 💡 Solución

En lugar de usar la **API REST de Brevo** (que requiere autorizar IPs), usar **SMTP de Brevo** que no tiene esas restricciones.

**Ventajas**:
- ✅ No requiere autorizar IPs
- ✅ Funciona con IPs dinámicas de Vercel
- ✅ Mantiene Brevo (no hay que migrar)
- ✅ Mismo límite (300 emails/día)

**Desventaja**:
- ⚠️ Requiere instalar librería adicional (`nodemailer`)

---

## 🚀 Implementación con SMTP (10 minutos)

### Paso 1: Obtener Credenciales SMTP de Brevo (2 min)

1. Ir a https://app.brevo.com
2. Settings > **SMTP & API**
3. En la sección **SMTP**, verás:
   ```
   Server: smtp-relay.brevo.com
   Port: 587
   Login: tu-email@dominio.com (el de tu cuenta Brevo)
   Password: [Click "Generate" si no tienes]
   ```
4. Si no hay password, click en **Generate SMTP Password**
5. **Copiar el password** (empieza con "xsmtpsib-")

### Paso 2: Instalar Nodemailer (1 min)

```bash
cd fidelizacion-zona
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### Paso 3: Actualizar Variables de Entorno (2 min)

En Vercel > Settings > Environment Variables:

**Eliminar**:
- `BREVO_API_KEY`

**Agregar**:
```
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=tu-email@coques.com.ar
BREVO_SMTP_PASS=xsmtpsib-xxxxxxxxx
BREVO_FROM_EMAIL=noreply@mail.coques.com.ar
```

### Paso 4: Modificar email.ts (5 min)

**Reemplazar todo** `src/lib/email.ts`:

```typescript
// src/lib/email.ts
import nodemailer from 'nodemailer'

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
 * Servicio de envío de emails usando Brevo SMTP
 * (No requiere autorizar IPs, funciona con Vercel)
 */
export async function sendEmail({
  to,
  subject,
  html,
  from
}: SendEmailParams): Promise<SendEmailResult> {
  // Verificar configuración
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.warn('[Email] BREVO SMTP no configurado - Email no enviado')
    return {
      success: false,
      message: 'SMTP no configurado'
    }
  }

  try {
    // Configurar transporte SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false, // true para port 465, false para otros puertos
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    })

    // Email remitente por defecto
    const defaultFrom = {
      name: 'Coques Bakery',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@mail.coques.com.ar',
    }

    const sender = from || defaultFrom

    // Enviar email
    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: to,
      subject: subject,
      html: html,
    })

    console.log('[Email] ✅ Email enviado exitosamente')
    console.log('[Email] Destinatario:', to)
    console.log('[Email] Message ID:', info.messageId)

    return {
      success: true,
      messageId: info.messageId
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

### Paso 5: Deploy

```bash
git add package.json package-lock.json src/lib/email.ts
git commit -m "feat: Usar SMTP de Brevo en lugar de API REST (sin problemas de IP)"
git push
```

Vercel desplegará automáticamente.

### Paso 6: Probar

1. Esperar 2-3 minutos que Vercel termine el deploy
2. Ir a https://coques.vercel.app/login
3. Click "¿Olvidaste tu contraseña?"
4. Ingresar tu email
5. ✅ Debería llegar sin problemas de IP

---

## 🔍 Verificar que Funciona

**En logs de Vercel**, deberías ver:
```
[Email] ✅ Email enviado exitosamente
[Email] Destinatario: mariano@coques.com.ar
[Email] Message ID: <xxxxx@smtp-relay.brevo.com>
```

**Sin errores de IP**, porque SMTP no valida IPs como la API REST.

---

## 📊 Comparación: API REST vs SMTP

| Feature | API REST | SMTP |
|---------|----------|------|
| **Problema de IP** | ❌ Sí | ✅ No |
| **Velocidad** | Muy rápida | Rápida |
| **Complejidad** | Simple (fetch) | Media (nodemailer) |
| **Límite gratuito** | 300/día | 300/día |
| **Tracking** | Mejor | Normal |

---

## ✅ Ventajas de esta Solución

1. **No migras de Brevo** (mantienes la cuenta)
2. **No hay problema de IPs** (SMTP no valida)
3. **Funciona con Vercel** (IPs dinámicas OK)
4. **Mismo límite gratuito** (300/día)
5. **10 minutos** de implementación

---

## 🎯 Comparación de Todas las Opciones

### Opción 1: SMTP de Brevo ⭐
- **Pros**: Sin problemas de IP, mantienes Brevo
- **Contras**: Requiere nodemailer
- **Tiempo**: 10 min

### Opción 2: Migrar a Resend ⭐⭐
- **Pros**: Sin problemas de IP, más límites (3000/mes), mejor DX
- **Contras**: Cambias de servicio
- **Tiempo**: 15 min

### Opción 3: Seguir con API REST de Brevo
- **Pros**: Ninguno
- **Contras**: Problema de IPs permanente
- **Tiempo**: 0 min pero frustración constante

---

## 🚀 Recomendación

**Si querés seguir con Brevo**: Usa SMTP (Opción 1)
**Si querés la mejor solución a largo plazo**: Migra a Resend (Opción 2)

Ambas opciones resuelven el problema de IP. Resend es ligeramente mejor en experiencia del desarrollador y límites, pero SMTP de Brevo funciona perfectamente.

---

## ❓ ¿Qué Opción Elegimos?

1. **SMTP de Brevo** → Te ayudo a implementarlo ahora (10 min)
2. **Migrar a Resend** → Te ayudo a migrarlo ahora (15 min)
3. **Pensarlo** → Documentación lista para cuando decidas

Ambas opciones están bien. SMTP es más rápido si querés mantener Brevo. Resend es mejor si no te importa cambiar de servicio.
