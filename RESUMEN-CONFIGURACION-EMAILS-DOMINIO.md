# 📧 Resumen: Configuración de Emails y Dominio Personalizado

## 🎯 Situación Actual

### ✅ Ya Configurado (en el código)

Tu aplicación **YA tiene el código necesario** para enviar emails:

1. **Email de recuperación de contraseña** ✅
   - Archivo: [`src/app/api/auth/forgot-password/route.ts`](fidelizacion-zona/src/app/api/auth/forgot-password/route.ts)
   - Usa Resend
   - Genera token de recuperación válido por 1 hora

2. **Email de bienvenida** ✅ (recién agregado)
   - Archivo: [`src/app/api/auth/register/route.ts`](fidelizacion-zona/src/app/api/auth/register/route.ts)
   - Incluye código de referido
   - Explica los beneficios
   - Link al pase de fidelización

3. **Configuración flexible** ✅
   - Si `RESEND_API_KEY` no está configurada, no falla
   - Logs detallados en consola para debugging
   - Se pueden usar variables de entorno personalizadas

### ❌ Falta Configurar (variables de entorno)

Para que los emails se envíen, necesitás configurar:

```env
# URL pública de tu app (con dominio personalizado)
NEXT_PUBLIC_APP_URL=https://app.coques.com.ar

# API Key de Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email desde el cual se envían los correos
RESEND_FROM_EMAIL=Coques Bakery <noreply@mail.coques.com.ar>
```

---

## 🚀 Próximos Pasos (en orden)

### 1️⃣ Configurar el Dominio Personalizado (Primero)

**Objetivo:** Cambiar de `https://tu-proyecto.vercel.app` a `https://app.coques.com.ar`

**Qué hacer:**
1. Leer la guía: [`CONFIGURACION-DOMINIO-PERSONALIZADO.md`](fidelizacion-zona/CONFIGURACION-DOMINIO-PERSONALIZADO.md)
2. Hablar con tu administrador y pasarle esta información:

```
Necesito configurar un subdominio para la app de fidelización.

SUBDOMINIO: app.coques.com.ar

Configuración DNS:
- Tipo: CNAME
- Nombre: app
- Apunta a: cname.vercel-dns.com
- TTL: 3600 (o automático)

NO necesito IP de Vercel, el CNAME es suficiente.
SSL se configura automáticamente.
```

3. Agregar el dominio en Vercel:
   - Ir a tu proyecto → Settings → Domains
   - Agregar: `app.coques.com.ar`
   - Esperar verificación (5 min - 48 hrs, usualmente < 1 hora)

4. Configurar variable de entorno en Vercel:
   ```env
   NEXT_PUBLIC_APP_URL=https://app.coques.com.ar
   ```

5. Redeploy del proyecto

**Tiempo estimado:** 1-2 horas (mayormente esperando DNS)

---

### 2️⃣ Configurar Resend (Después)

**Objetivo:** Enviar emails profesionales desde tu dominio

**Qué hacer:**
1. Leer la guía: [`CONFIGURACION-RESEND.md`](fidelizacion-zona/CONFIGURACION-RESEND.md)

2. Crear cuenta en Resend:
   - Ir a: https://resend.com
   - Registrarse (gratis: 3,000 emails/mes)

3. Obtener API Key:
   - Dashboard → API Keys → Create
   - Copiar: `re_xxxxxxxxxxxxxxxxxxxxx`

4. Configurar dominio en Resend:
   - Dashboard → Domains → Add Domain
   - Agregar: `mail.coques.com.ar` (recomendado usar subdominio)

5. Configurar DNS (pasarle a tu administrador):

```
Necesito agregar registros DNS para enviar emails:

DOMINIO: mail.coques.com.ar

Registros:

1. SPF
   Tipo: TXT
   Host: mail.coques.com.ar
   Valor: v=spf1 include:resend.com ~all

2. DKIM
   Tipo: TXT
   Host: resend._domainkey.mail.coques.com.ar
   Valor: [te lo da Resend en el dashboard]

3. DMARC (opcional)
   Tipo: TXT
   Host: _dmarc.mail.coques.com.ar
   Valor: v=DMARC1; p=none; rua=mailto:admin@coques.com.ar
```

6. Verificar el dominio en Resend (esperar propagación DNS)

7. Configurar variables de entorno en Vercel:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=Coques Bakery <noreply@mail.coques.com.ar>
   ```

8. Redeploy del proyecto

9. Probar:
   - Registrar un usuario nuevo → debería llegar email de bienvenida
   - Olvidé mi contraseña → debería llegar email de recuperación

**Tiempo estimado:** 1-2 horas (mayormente esperando DNS)

---

## 📝 Información para tu Administrador

### Resumen de lo que necesita hacer:

**1. Para el dominio de la aplicación:**
```
CNAME: app.coques.com.ar → cname.vercel-dns.com
```
- No necesita IP
- SSL se configura automáticamente
- Tiempo de propagación: 5 min - 48 hrs

**2. Para los emails:**
```
TXT: mail.coques.com.ar → v=spf1 include:resend.com ~all
TXT: resend._domainkey.mail.coques.com.ar → [valor que da Resend]
TXT: _dmarc.mail.coques.com.ar → v=DMARC1; p=none; rua=mailto:admin@coques.com.ar
```
- Estos registros autentican los emails
- Evitan que vayan a spam
- Tiempo de propagación: 10 min - 48 hrs

---

## 📋 Checklist Completa

### Configuración del Dominio Personalizado

- [ ] Hablar con el administrador
- [ ] Administrador crea el CNAME: `app → cname.vercel-dns.com`
- [ ] Agregar dominio en Vercel
- [ ] Esperar verificación de Vercel
- [ ] Configurar `NEXT_PUBLIC_APP_URL` en Vercel
- [ ] Redeploy
- [ ] Verificar que funciona: abrir `https://app.coques.com.ar`
- [ ] SSL activo (candado verde)

### Configuración de Resend

- [ ] Crear cuenta en Resend
- [ ] Obtener API Key
- [ ] Agregar dominio `mail.coques.com.ar` en Resend
- [ ] Administrador configura registros DNS (SPF, DKIM, DMARC)
- [ ] Verificar dominio en Resend (status: ✅ Verified)
- [ ] Configurar `RESEND_API_KEY` en Vercel
- [ ] Configurar `RESEND_FROM_EMAIL` en Vercel
- [ ] Redeploy
- [ ] Probar email de bienvenida (registrar usuario nuevo)
- [ ] Probar email de recuperación (olvidé mi contraseña)
- [ ] Verificar que los emails no van a spam

---

## 🎯 Estado de los Archivos Modificados

### Archivos Nuevos/Modificados:

1. **[`.env.example`](fidelizacion-zona/.env.example)** ✅
   - Agregadas variables de Resend y dominio
   - Documentación de cada variable
   
2. **[`src/app/api/auth/register/route.ts`](fidelizacion-zona/src/app/api/auth/register/route.ts)** ✅
   - Agregado email de bienvenida
   - Incluye código de referido
   - Diseño profesional con HTML

3. **[`src/app/api/auth/forgot-password/route.ts`](fidelizacion-zona/src/app/api/auth/forgot-password/route.ts)** ✅
   - Actualizado para usar `RESEND_FROM_EMAIL`
   - Ya tenía la funcionalidad de recuperación

### Documentación Nueva:

1. **[`CONFIGURACION-DOMINIO-PERSONALIZADO.md`](fidelizacion-zona/CONFIGURACION-DOMINIO-PERSONALIZADO.md)** 📚
   - Guía completa para configurar `app.coques.com.ar`
   - Información para el administrador
   - Troubleshooting

2. **[`CONFIGURACION-RESEND.md`](fidelizacion-zona/CONFIGURACION-RESEND.md)** 📚
   - Guía completa de configuración de Resend
   - Paso a paso con screenshots virtuales
   - Mejores prácticas

3. **[`RESUMEN-CONFIGURACION-EMAILS-DOMINIO.md`](fidelizacion-zona/RESUMEN-CONFIGURACION-EMAILS-DOMINIO.md)** 📚
   - Este archivo (resumen ejecutivo)
   - Checklist completo
   - Próximos pasos ordenados

---

## ⚡ Opción Rápida (Testing sin dominio)

Si querés probar los emails **AHORA** sin configurar el dominio:

### Configuración mínima:

```env
# En Vercel → Environment Variables

# Usar el dominio de Vercel actual
NEXT_PUBLIC_APP_URL=https://tu-proyecto.vercel.app

# API Key de Resend (después de crear cuenta)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Usar email por defecto de Resend (sin dominio verificado)
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Limitaciones:**
- ⚠️ Los emails vienen de `onboarding@resend.dev`
- ⚠️ Mayor probabilidad de ir a spam
- ⚠️ No es profesional para producción
- ✅ Pero funciona para testing

**Después** configurás el dominio personalizado y lo cambias.

---

## 🆘 ¿Preguntas Frecuentes?

### ¿Tengo que configurar ambas cosas?

**Dominio personalizado:** No es obligatorio, pero muy recomendado
- Sin esto: usás `tu-proyecto.vercel.app`
- Con esto: usás `app.coques.com.ar`

**Resend:** Obligatorio para enviar emails
- Sin esto: NO se envían emails (solo logs en consola)
- Con esto: los usuarios reciben emails de bienvenida y recuperación

### ¿En qué orden hago las cosas?

1. **Primero:** Dominio personalizado (más fácil)
2. **Después:** Resend (requiere más configuración DNS)

O podés hacer ambos en paralelo si tu admin está disponible.

### ¿Cuánto cuesta?

- **Dominio personalizado:** Gratis (ya tenés el dominio `coques.com.ar`)
- **Resend:** Gratis hasta 3,000 emails/mes
- **SSL:** Gratis (Vercel lo da automáticamente)

### ¿Cuánto tarda?

- **Dominio personalizado:** 1-2 horas (mayormente esperando DNS)
- **Resend:** 1-2 horas (mayormente esperando DNS)
- **Total:** 2-4 horas (o menos si se hace en paralelo)

---

## 📚 Documentos de Referencia

1. **Dominio personalizado:** [`CONFIGURACION-DOMINIO-PERSONALIZADO.md`](fidelizacion-zona/CONFIGURACION-DOMINIO-PERSONALIZADO.md)
2. **Resend:** [`CONFIGURACION-RESEND.md`](fidelizacion-zona/CONFIGURACION-RESEND.md)
3. **Variables de entorno:** [`.env.example`](fidelizacion-zona/.env.example)

---

¡Todo el código está listo! Solo falta la configuración de infraestructura (DNS y API keys). 🚀
