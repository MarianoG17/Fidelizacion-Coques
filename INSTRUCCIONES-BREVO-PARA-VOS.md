# 📧 Instrucciones: Qué hacer en tu cuenta de Brevo

## 🎯 Resumen

Mientras yo configuro el código, vos necesitás hacer esto en Brevo:

1. ✅ Crear cuenta
2. ✅ Obtener API Key
3. ✅ (Opcional) Verificar dominio para emails

---

## 🚀 Paso 1: Crear Cuenta en Brevo

### 1. Ir al sitio:
```
https://www.brevo.com
```

### 2. Registrarte:
- Click en **"Sign up free"** o **"Crear cuenta gratis"**
- Completar formulario:
  - Email: tu email de trabajo
  - Contraseña segura
  - Nombre de la empresa: "Coques Bakery"
  
### 3. Verificar email:
- Te llegará un email de confirmación
- Click en el link de verificación

### 4. Configuración inicial:
- Preguntas sobre tu negocio (responder lo que quieras)
- Tipo de industria: "Food & Beverage" o "Retail"
- Tamaño: elegir según tu negocio

---

## 🔑 Paso 2: Obtener API Key (IMPORTANTE)

### 1. Una vez dentro del dashboard:

Ir a: **Settings → SMTP & API → API Keys**

O directamente:
```
https://app.brevo.com/settings/keys/api
```

### 2. Crear API Key:

- Click en **"Create a new API key"**
- Nombre: `Coques Fidelizacion Production`
- Click en **"Generate"**

### 3. Copiar la API Key:

**⚠️ MUY IMPORTANTE:**
- La API Key se muestra **UNA SOLA VEZ**
- Tiene formato: `xkeysib-xxxxxxxxxxxxxxxxxxxxx`
- **Copiala inmediatamente** y guardala en lugar seguro

### 4. Guardar:

Guardar en un archivo de texto temporalmente:
```
BREVO_API_KEY=xkeysib-aca-va-tu-key-completa
```

**Me la vas a pasar después para configurar en Vercel.**

---

## 📧 Paso 3: Configurar Email Remitente

### Opción A: Usar email de prueba (Rápido - Para testing)

Brevo te da un email de prueba automáticamente.

**No necesitás hacer nada más.**

En desarrollo, podés usar:
```
noreply@mail.coques.com.ar
```

Y Brevo lo enviará desde su dominio con tu nombre.

### Opción B: Verificar tu dominio (Recomendado - Para producción)

**Solo cuando quieras ir a producción:**

1. **Ir a:** Settings → Senders & IP → Domains

2. **Add a Domain:**
   - Dominio: `mail.coques.com.ar`
   - Click en "Add"

3. **Brevo te dará registros DNS:**
   
   Similar a Vercel, te va a mostrar:
   
   ```
   TXT: mail.coques.com.ar → v=spf1 include:spf.brevo.com ~all
   TXT: mail._domainkey.mail.coques.com.ar → [valor específico]
   TXT: _dmarc.mail.coques.com.ar → v=DMARC1; p=none
   ```

4. **Pasarle esta info a tu administrador**
   (Similar a lo del CNAME de Vercel)

5. **Esperar verificación**
   (10 min - 48 hrs)

**Podés saltear esto por ahora** y usar el email de prueba.

---

## 📊 Paso 4: Familiarizarte con el Dashboard (Opcional)

### Ver estadísticas:

```
https://app.brevo.com/statistics/transactional
```

Vas a poder ver:
- 📨 Emails enviados
- 📬 Emails entregados
- 📂 Emails abiertos
- 🖱️ Clicks
- ❌ Rebotes

### Ver emails en tiempo real:

```
https://app.brevo.com/real-time
```

Cada email que se envíe aparecerá aquí en tiempo real.

---

## ✅ Checklist: ¿Qué necesito hacer YA?

### Ahora (obligatorio):

- [ ] Crear cuenta en Brevo
- [ ] Verificar email
- [ ] Obtener API Key
- [ ] Guardar API Key en archivo de texto
- [ ] Pasarme la API Key

### Después (opcional, para producción):

- [ ] Agregar dominio en Brevo
- [ ] Pasarle registros DNS a tu administrador
- [ ] Esperar verificación del dominio
- [ ] Configurar email remitente verificado

---

## 📝 Qué me tenés que pasar a mí:

Una vez que hagas los pasos de arriba, pasame:

```
BREVO_API_KEY=xkeysib-tu-key-completa-aca

(Opcional si configuraste dominio:)
BREVO_FROM_EMAIL=noreply@mail.coques.com.ar
```

Con eso yo configuro:
- ✅ Variables de entorno en Vercel
- ✅ Redeploy de la aplicación
- ✅ Todo quedará funcionando

---

## 🎯 Flujo Completo

```
VOS:                          YO:
1. Crear cuenta Brevo    →    
2. Obtener API Key       →    
3. Pasarme la API Key    →    4. Configurar en Vercel
                         →    5. Redeploy
                         →    6. Probar emails
7. Verificar que lleguen ←    
```

---

## ❓ Preguntas Frecuentes

### ¿Tengo que pagar algo?

**No.** El plan gratuito de Brevo incluye:
- 300 emails por día
- Estadísticas completas
- Todo lo que necesitamos

Es gratis para siempre (con un pequeño logo de Brevo en los emails, que es opcional ocultar pagando).

### ¿Puedo probar sin verificar el dominio?

**Sí.** Podés enviar emails inmediatamente con la API Key.

La verificación del dominio es solo para:
- Que los emails vengan de `@coques.com.ar` en vez de `@brevo.com`
- Mejor deliverability (menos probabilidad de spam)
- Imagen más profesional

**Pero podés testear sin esto.**

### ¿Cuánto tarda el proceso?

**Crear cuenta y obtener API Key:** 5-10 minutos

**Verificar dominio (opcional):** 1-2 horas (mayormente esperando DNS)

### ¿Qué hago si no me llega el email de verificación?

1. Revisar carpeta SPAM
2. Esperar unos minutos (puede tardar)
3. Click en "Reenviar email" en Brevo
4. Si nada funciona, probar con otro email

### ¿La API Key tiene fecha de vencimiento?

**No.** La API Key es permanente hasta que la elimines manualmente.

Guardala en un lugar seguro.

---

## 🆘 Si tenés problemas:

**¿No podés crear la cuenta?**
- Probar con otro navegador
- Probar con otro email
- Limpiar cookies

**¿No encontrás donde está la API Key?**
- Menú lateral → Settings (engranaje) → SMTP & API → API Keys
- O directamente: https://app.brevo.com/settings/keys/api

**¿Perdiste la API Key?**
- No se puede recuperar
- Eliminar la vieja y crear una nueva

---

## 📧 Plantilla de mensaje para mí:

Cuando tengas todo, mandame:

```
Hola, ya configuré Brevo.

API Key:
BREVO_API_KEY=xkeysib-[tu-key-completa]

Email remitente:
BREVO_FROM_EMAIL=noreply@mail.coques.com.ar

(o el que hayas configurado)

¿Ya podés configurarlo en Vercel?
```

---

**¡Empezá creando la cuenta mientras yo termino de configurar el código!** 🚀

Links útiles:
- Crear cuenta: https://www.brevo.com
- Dashboard: https://app.brevo.com
- API Keys: https://app.brevo.com/settings/keys/api
