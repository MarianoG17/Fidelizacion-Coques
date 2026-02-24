# Diagnóstico y Configuración de Brevo (Email)

## Estado Actual

El sistema de emails está configurado para usar Brevo (anteriormente Sendinblue) pero no está funcionando. Este documento te ayuda a diagnosticar y resolver el problema.

## Variables de Entorno Requeridas

```bash
# En Vercel > Settings > Environment Variables
BREVO_API_KEY="xkeysib-xxxxxxxxxxxxxxxxxxxxxx"
BREVO_FROM_EMAIL="noreply@mail.coques.com.ar"
```

## Checklist de Diagnóstico

### ✅ 1. Verificar API Key de Brevo

1. **Ingresar a Brevo**:
   - Ir a https://app.brevo.com
   - Hacer login con tu cuenta

2. **Obtener/Verificar API Key**:
   - Ir a **Settings** (⚙️ arriba a la derecha)
   - Seleccionar **SMTP & API** en el menú izquierdo
   - En la sección **API Keys**, buscar la key activa
   - Si no existe, crear una nueva con el botón **Generate a new API key**

3. **Configurar en Vercel**:
   ```bash
   # Copiar la key completa (empieza con "xkeysib-")
   BREVO_API_KEY=xkeysib-tu-key-completa-aqui
   ```

### ✅ 2. Verificar Dominio del Remitente

El email `BREVO_FROM_EMAIL` debe estar **verificado** en Brevo:

1. **En Brevo**:
   - Ir a **Settings** > **Senders & IP**
   - Verificar que el dominio `mail.coques.com.ar` esté listado y verificado
   - Si no está verificado, verás un estado "Pending" o "Not verified"

2. **Verificar Dominio** (si no está verificado):
   - Click en el dominio
   - Brevo te dará registros DNS que debes agregar
   - Los registros típicos son:
     ```
     Tipo: TXT
     Nombre: _domainkey.mail.coques.com.ar
     Valor: [valor proporcionado por Brevo]
     
     Tipo: TXT
     Nombre: mail.coques.com.ar
     Valor: [valor proporcionado por Brevo]
     ```

3. **Agregar registros en Cloudflare/NIC.ar**:
   - Si usas Cloudflare para DNS de `coques.com.ar`:
     - Ir a Cloudflare > DNS
     - Agregar los registros TXT proporcionados por Brevo
     - Esperar 10-30 minutos para propagación
   - Si usas NIC.ar directamente:
     - Contactar al proveedor de hosting o DNS
     - Solicitar agregar los registros TXT

4. **Verificar en Brevo**:
   - Una vez agregados los registros DNS
   - Volver a Brevo > Settings > Senders & IP
   - Click en "Verify Domain"
   - Debería cambiar a estado "Verified" ✅

### ✅ 3. Verificar Email Remitente Individual

Si el dominio está verificado pero el email específico no:

1. **En Brevo** > **Settings** > **Senders & IP**
2. Click en **Add a Sender**
3. Agregar: `noreply@mail.coques.com.ar`
4. Brevo enviará un email de confirmación a ese email
5. Si no tienes acceso a ese buzón:
   - Usar otro email verificado (ej: `info@coques.com.ar`)
   - O configurar el buzón `noreply@mail.coques.com.ar` en tu hosting

### ✅ 4. Verificar Límites de Cuenta Brevo

Brevo tiene límites según el plan:

- **Plan Free**: 300 emails/día
- **Plan Lite**: A partir de 5000 emails/mes
- **Plan Premium**: Emails ilimitados

Si superaste el límite diario/mensual, Brevo bloqueará el envío.

**Verificar límites**:
1. En Brevo > Dashboard
2. Ver "Email usage" o "Daily/Monthly limit"
3. Si está en 100%, esperar al próximo período o upgradedar plan

### ✅ 5. Verificar Logs en Vercel

Para ver qué está pasando cuando se intenta enviar un email:

1. **Ir a Vercel**:
   - Abrir tu proyecto
   - Ir a **Logs** (pestaña)

2. **Filtrar por errores de email**:
   - Buscar líneas que contengan `[Email]`
   - Revisar mensajes de error específicos

3. **Errores comunes**:
   ```
   [Email] BREVO_API_KEY no configurada
   → Solución: Agregar variable de entorno
   
   [Email] ❌ Error al enviar email: Invalid API key
   → Solución: Verificar que la API Key sea correcta
   
   [Email] ❌ Error: Sender not verified
   → Solución: Verificar dominio y email remitente
   
   [Email] ❌ Error: Daily limit exceeded
   → Solución: Esperar o upgradedar plan
   ```

### ✅ 6. Probar Envío Manual desde Brevo

Para verificar que Brevo funciona correctamente:

1. **En Brevo** > **Campaigns** > **Email**
2. Click en **Create an email campaign**
3. Enviar un email de prueba a tu email personal
4. Si llega correctamente:
   - ✅ Brevo funciona
   - ❌ El problema está en la integración con tu app
5. Si NO llega:
   - ❌ Problema en la configuración de Brevo
   - Revisar dominio, sender, y límites

---

## Guía Paso a Paso: Configuración Completa de Brevo

### Paso 1: Crear Cuenta en Brevo

1. Ir a https://app.brevo.com
2. Crear cuenta gratuita
3. Confirmar email

### Paso 2: Generar API Key

1. Settings > SMTP & API
2. Crear nueva API key
3. Copiar y guardar (no se mostrará de nuevo)

### Paso 3: Configurar Dominio

#### Opción A: Usar dominio personalizado (Recomendado)

1. En Brevo > Settings > Senders & IP
2. Add a sender domain: `mail.coques.com.ar`
3. Copiar registros DNS proporcionados
4. Agregar en Cloudflare:
   ```
   Tipo: TXT
   Nombre: _domainkey.mail
   Valor: [valor de Brevo]
   Proxy: Desactivado (🟡)
   
   Tipo: TXT  
   Nombre: mail
   Valor: [valor de Brevo]
   Proxy: Desactivado (🟡)
   ```
5. Esperar 10-30 minutos
6. Verificar en Brevo

#### Opción B: Usar email genérico de Brevo (Rápido pero menos profesional)

1. Usar un email ya verificado por defecto
2. Ejemplo: tu email personal que usaste para crear la cuenta
3. Cambiar en Vercel:
   ```bash
   BREVO_FROM_EMAIL="tu-email-verificado@gmail.com"
   ```
4. **Nota**: Los emails llegarán con este remitente, menos profesional

### Paso 4: Configurar Variables en Vercel

1. Vercel > Tu proyecto > Settings > Environment Variables
2. Agregar:
   ```
   BREVO_API_KEY=xkeysib-tu-key-aqui
   BREVO_FROM_EMAIL=noreply@mail.coques.com.ar
   ```
3. Aplicar a: **Production, Preview, Development**
4. Save

### Paso 5: Redeploy

1. Vercel > Deployments
2. Click en el último deployment > ⋯ > Redeploy
3. Esperar que termine

### Paso 6: Probar

1. Ir a tu app en producción
2. Probar "Recuperar contraseña" en `/login`
3. Ingresar un email de prueba
4. Verificar que llegue el email

---

## Código de Email en el Sistema

### Archivos que usan email:

1. **[`/api/auth/register`](src/app/api/auth/register/route.ts)**: Email de bienvenida
2. **[`/api/auth/forgot-password`](src/app/api/auth/forgot-password/route.ts)**: Email de recuperación

### Función de envío:

```typescript
// src/lib/email.ts
export async function sendEmail({
  to,
  subject,
  html,
  from
}: SendEmailParams): Promise<SendEmailResult>
```

### Comportamiento actual:

- Si `BREVO_API_KEY` no está configurada:
  - ✅ No falla la app
  - ⚠️ Solo registra warning en logs
  - ❌ No envía el email
  
- Si hay error al enviar:
  - ✅ No falla la app
  - ❌ Registra error en logs
  - ❌ No envía el email

**Esto significa**: El sistema funciona aunque Brevo no esté configurado, pero los clientes no recibirán emails.

---

## Alternativa Temporal: Desactivar Emails

Si necesitas que el sistema funcione mientras configuras Brevo:

### Ya está funcionando así ✅

El código ya maneja el caso donde Brevo no está configurado:
- Los clientes se pueden registrar normalmente
- No recibirán email de bienvenida
- Pueden hacer "Recuperar contraseña" pero no recibirán el email

### Para comunicar a los clientes:

Agregar mensaje en registro/login si Brevo no está configurado:
```typescript
// Sugerencia: Mostrar mensaje temporal
"⚠️ El sistema de emails está en mantenimiento. 
Por favor contactanos por WhatsApp si necesitás recuperar tu contraseña."
```

---

## FAQ

### ¿Por qué usar Brevo y no Gmail/otro?

- ✅ Gratis hasta 300 emails/día
- ✅ API profesional y confiable
- ✅ Emails transaccionales optimizados
- ✅ No requiere configurar servidor SMTP
- ✅ Buena reputación de dominio (no va a spam)

### ¿Puedo usar otro servicio?

Sí, alternativas:
- **SendGrid**: 100 emails/día gratis
- **Mailgun**: 5000 emails/mes gratis (primeros 3 meses)
- **AWS SES**: 0.10 USD por 1000 emails
- **Resend**: 3000 emails/mes gratis

Para cambiar de servicio, modificar `src/lib/email.ts`

### ¿Qué pasa si no configuro emails?

- ✅ App funciona normal
- ❌ Clientes no reciben email de bienvenida
- ❌ Clientes no pueden recuperar contraseña por email
- ⚠️ Deberás resetear passwords manualmente en la BD

---

## Siguiente Paso Recomendado

**🎯 Opción Rápida** (5 minutos):
1. Crear cuenta Brevo
2. Generar API Key
3. Usar tu email personal como remitente (ya verificado por defecto)
4. Configurar en Vercel
5. Redeploy
6. ✅ Funcionando (aunque el remitente sea tu email personal)

**🎯 Opción Profesional** (30-60 minutos):
1. Seguir todos los pasos de configuración de dominio
2. Agregar registros DNS en Cloudflare
3. Esperar verificación
4. Configurar `noreply@mail.coques.com.ar`
5. ✅ Emails profesionales con tu dominio

---

## Contacto de Soporte

Si seguís teniendo problemas:

1. **Verificar logs de Vercel** (importante)
2. **Captura de pantalla** del error en Brevo
3. **Confirmar** que las variables de entorno están configuradas en Vercel
4. **Probar** envío manual desde Brevo

Con esta información podremos diagnosticar exactamente dónde está el problema.
