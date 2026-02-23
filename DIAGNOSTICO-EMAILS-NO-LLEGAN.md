# 🔍 Diagnóstico: Los Emails No Llegan

## 📋 Checklist de Verificación

Vamos paso a paso para encontrar el problema.

---

## 1️⃣ Verificar Variables de Entorno en Vercel

### Ir a:
```
Vercel Dashboard → Tu proyecto → Settings → Environment Variables
```

### Verificar que existan EXACTAMENTE estas 3 variables:

| Variable | Valor Esperado | Estado |
|----------|----------------|--------|
| `BREVO_API_KEY` | `xkeysib-xxxxx...` | ¿Existe? |
| `BREVO_FROM_EMAIL` | `noreply@coques.com.ar` | ¿Existe? |
| `NEXT_PUBLIC_APP_URL` | Tu URL de Vercel o dominio | ¿Existe? |

**⚠️ Importante:** Las variables deben estar en **Production** environment.

### ¿Cómo se ven?

Deberías ver algo así:
```
BREVO_API_KEY                Production, Preview    xkeysib-***hidden***
BREVO_FROM_EMAIL             Production, Preview    noreply@coques.com.ar
NEXT_PUBLIC_APP_URL          Production, Preview    https://...
```

**Si falta alguna o está mal escrita:** Agregarla/corregirla y redeploy.

---

## 2️⃣ Verificar los Logs de Vercel

### Ir a:
```
Vercel Dashboard → Tu proyecto → Logs (o Runtime Logs)
```

### Filtrar por tiempo:
- Seleccionar "Last 1 hour" o el momento en que hiciste el registro

### Buscar mensajes relacionados con email:

**Buscar estos textos:**

✅ **Si funciona, deberías ver:**
```
[Email] ✅ Email enviado exitosamente
[Registro] Email de bienvenida procesado
```

❌ **Si hay error, verás:**
```
[Email] ❌ Error al enviar email
[Email] BREVO_API_KEY no configurada
Error: Invalid API key
```

### ¿Qué hacer según lo que veas?

#### Caso A: "BREVO_API_KEY no configurada"
**Problema:** La variable no existe o no se cargó.
**Solución:**
1. Verificar que agregaste `BREVO_API_KEY` en Vercel
2. Redeploy del proyecto
3. Probar de nuevo

#### Caso B: "Invalid API key" o "Authentication failed"
**Problema:** La API key es incorrecta.
**Solución:**
1. Ir a Brevo → Settings → API Keys
2. Verificar que la key sea correcta
3. Si no funciona, generar una nueva
4. Actualizar en Vercel
5. Redeploy

#### Caso C: "Email enviado exitosamente" pero no llega
**Problema:** El email se envió pero fue a spam o bloqueado.
**Solución:**
1. Revisar carpeta SPAM
2. Verificar en Brevo Dashboard (siguiente paso)

#### Caso D: No hay logs de email
**Problema:** El código del email no se ejecutó.
**Solución:**
1. Verificar que el usuario se registró correctamente
2. Ver si hay errores en el registro antes del email
3. Revisar logs completos del request

---

## 3️⃣ Verificar en Brevo Dashboard

### Ir a:
```
https://app.brevo.com/real-time
```

O:
```
Dashboard de Brevo → Statistics → Transactional → Real-time
```

### ¿Qué deberías ver?

**Si el email se envió:**
- Aparecerá una fila con el email
- Estado: "Sent" o "Delivered"
- Destinatario: el email que registraste

**Si no aparece nada:**
- Brevo nunca recibió la solicitud
- El problema está en Vercel (variable, API key, o código)

### Estados posibles:

| Estado | Significado | Acción |
|--------|-------------|--------|
| **Sent** | Enviado exitosamente | Revisar carpeta SPAM |
| **Delivered** | Entregado | Debería estar en bandeja entrada |
| **Bounced** | Email inválido o bloqueado | Verificar email correcto |
| **Blocked** | Bloqueado por Brevo | Email en blacklist |
| **Deferred** | Intento posterior | Esperar unos minutos |

---

## 4️⃣ Verificar que el Registro se Completó

### Opción A: Intentar hacer login

1. Ir a `/login`
2. Intentar loguearte con el email y contraseña que acabás de crear
3. ✅ Si funciona → El usuario se creó, el problema es solo del email
4. ❌ Si no funciona → El registro falló completamente

### Opción B: Verificar en la base de datos (avanzado)

Si tenés acceso a tu base de datos:
```sql
SELECT * FROM "Cliente" WHERE email = 'tu-email@example.com';
```

Si aparece el registro → Se creó correctamente.

---

## 5️⃣ Problemas Comunes y Soluciones

### Problema 1: Variables mal escritas

**Síntoma:** Logs dicen "BREVO_API_KEY no configurada"

**Causa:** La variable tiene otro nombre o typo.

**Solución:**
- Debe ser **exactamente** `BREVO_API_KEY` (mayúsculas)
- No `BREVO_API_KEY_PRODUCTION` ni variaciones

### Problema 2: API Key incorrecta

**Síntoma:** Error "Authentication failed" o "Invalid API key"

**Causa:** 
- Copiaste la API key mal
- Copiaste espacios extra
- La API key fue eliminada en Brevo

**Solución:**
1. Ir a Brevo → API Keys
2. Verificar que la key existe y está activa
3. Si hay dudas, crear una nueva
4. Copiar sin espacios al inicio/final
5. Pegar en Vercel
6. Redeploy

### Problema 3: Email remitente no verificado

**Síntoma:** Logs dicen "Sender email not verified" o similar

**Causa:** El email `noreply@coques.com.ar` no está verificado en Brevo

**Solución RÁPIDA (para testing):**
- Cambiar `BREVO_FROM_EMAIL` a un email personal tuyo que esté verificado
- O usar uno genérico como `test@test.com` temporalmente

**Solución CORRECTA (para producción):**
- Verificar el dominio en Brevo
- Seguir la guía de verificación de dominio

### Problema 4: Redeploy no se hizo

**Síntoma:** Agregaste variables pero sigue sin funcionar

**Causa:** Las variables solo se aplican después de redeploy

**Solución:**
1. Vercel → Deployments
2. Click en el último deployment → 3 puntos → Redeploy
3. Esperar que termine
4. Probar de nuevo

### Problema 5: Email va a SPAM

**Síntoma:** El email se envió (según logs y Brevo) pero no lo ves

**Causa:** Está en SPAM

**Solución:**
1. Revisar carpeta SPAM/Promociones/Social
2. Marcar como "No es spam"
3. Para el futuro: verificar dominio en Brevo

---

## 6️⃣ Pasos de Diagnóstico Completo

### Ejecutá estos pasos EN ORDEN:

#### ✅ Paso 1: Verificar variables en Vercel
- [ ] `BREVO_API_KEY` existe y está en Production
- [ ] `BREVO_FROM_EMAIL` existe
- [ ] `NEXT_PUBLIC_APP_URL` existe
- [ ] Si faltaba algo: agregar y redeploy

#### ✅ Paso 2: Verificar último deployment
- [ ] Ir a Deployments
- [ ] El último deployment fue DESPUÉS de agregar las variables
- [ ] Status es "Ready" (no "Building" ni "Error")
- [ ] Si no: hacer redeploy

#### ✅ Paso 3: Registrar usuario nuevo
- [ ] Usar un email QUE NUNCA USASTE antes
- [ ] Completar formulario
- [ ] Ver que el registro sea exitoso (te loguea o da confirmación)

#### ✅ Paso 4: Ver logs de Vercel
- [ ] Ir a Logs
- [ ] Buscar timestamp del registro
- [ ] Ver si hay mensaje "[Email] ✅ Email enviado"
- [ ] Ver si hay errores

#### ✅ Paso 5: Ver dashboard de Brevo
- [ ] Ir a Real-time
- [ ] Ver si aparece el email
- [ ] Ver su estado (Sent/Delivered/Bounced)

#### ✅ Paso 6: Revisar bandeja de entrada
- [ ] Revisar Inbox
- [ ] Revisar SPAM
- [ ] Revisar Promociones (Gmail)
- [ ] Esperar 5-10 minutos por las dudas

---

## 🎯 Diagnóstico según resultados:

### Escenario A: Variables OK + Logs OK + Brevo OK + No llega
**Problema:** Email en SPAM o filtrado
**Solución:** Revisar SPAM, esperar, verificar dominio

### Escenario B: Variables OK + Logs OK + Brevo NO muestra nada
**Problema:** Brevo no recibe la solicitud (API key incorrecta?)
**Solución:** Verificar API key en Brevo, generar nueva

### Escenario C: Variables OK + Logs con error
**Problema:** Error específico en el código o config
**Solución:** Leer el error específico y seguir indicaciones

### Escenario D: Variables NO OK
**Problema:** Variables faltantes o mal configuradas
**Solución:** Agregar variables correctas y redeploy

### Escenario E: No hiciste redeploy
**Problema:** Las variables no se aplicaron
**Solución:** Redeploy y probar de nuevo

---

## 📸 Capturas que necesito para ayudarte:

Si seguís sin poder resolver, pasame capturas de:

1. **Variables de Vercel:**
   - Settings → Environment Variables (ver las 3 variables)

2. **Logs de Vercel:**
   - Logs del momento del registro (aunque sea una parte)

3. **Dashboard de Brevo:**
   - Real-time (ver si aparece algo o está vacío)

4. **Error (si hay):**
   - Cualquier mensaje de error que veas

---

## 🆘 Solución Rápida para Probar

Si querés probar rápido sin verificar todo:

### Opción 1: Usar tu email personal en Brevo

Cambiar `BREVO_FROM_EMAIL` temporalmente:
```
BREVO_FROM_EMAIL=tu-email-personal@gmail.com
```

(Debe ser un email que tengas acceso y que puedas verificar en Brevo)

### Opción 2: Verificar que Brevo funciona

Ir al dashboard de Brevo y enviar un email de prueba desde allí:
- Campaigns → Email → Test email
- Si ese funciona pero el de la app no → problema en config de la app
- Si ese tampoco funciona → problema con Brevo (cuenta, IP, etc.)

---

## 📧 Plantilla de mensaje para pedirme ayuda:

```
Hola, los emails no llegan. Esto es lo que verifiqué:

Variables en Vercel:
- BREVO_API_KEY: [✅ Existe / ❌ Falta]
- BREVO_FROM_EMAIL: [✅ Existe / ❌ Falta]
- NEXT_PUBLIC_APP_URL: [✅ Existe / ❌ Falta]

Último deployment:
- Fecha/hora: [...]
- Fue después de agregar variables: [Sí / No]

Logs de Vercel:
- [Copiar lo que dice sobre el email]
- [O decir "No hay logs de email"]

Brevo dashboard:
- [Email aparece / No aparece nada]

SPAM:
- [Revisé y no está / No revisé]

¿Qué más debo verificar?
```

---

¡Seguí estos pasos y avisame qué encontrás! 🚀
