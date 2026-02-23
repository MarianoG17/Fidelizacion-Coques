# 📋 Variables de Entorno - Explicación Completa

## Base de Datos

### `DATABASE_URL`
**Propósito:** URL de conexión a la base de datos principal PostgreSQL de Neon (fidelización Coques)
**Formato:** `postgresql://user:password@host.neon.tech/fidelizacion?sslmode=require`
**Uso:** Prisma la usa para conectarse a la DB principal donde se almacenan clientes, eventos, beneficios, mesas, sesiones, etc.
**Crítica:** ✅ SÍ - Sin esta variable la app no funciona

---

### `DELTAWASH_DATABASE_URL`
**Propósito:** URL de conexión a la base de datos legacy de DeltaWash
**Formato:** `postgresql://user:password@deltawash-host.neon.tech/deltawash?sslmode=require`
**Uso:** Consultar el estado actual de autos en el lavadero (EN_RECEPCION, LAVANDO, ENTREGADO, etc.)
**Crítica:** ⚠️ MEDIA - Si no está, los clientes no ven el estado de sus autos, pero el resto de la app funciona

---

## URLs Públicas

### `NEXT_PUBLIC_APP_URL`
**Propósito:** URL pública de la aplicación (dominio personalizado o Vercel)
**Ejemplos:** 
- `https://app.coques.com.ar` (producción)
- `https://fidelizacion-coques.vercel.app` (Vercel)
**Uso:** Generar links absolutos en emails (recuperación de contraseña, bienvenida, etc.)
**Crítica:** ✅ SÍ - Los links de emails no funcionarán correctamente sin esto

---

## Email (Brevo/Sendinblue)

### `BREVO_API_KEY`
**Propósito:** API Key de Brevo para enviar emails transaccionales
**Formato:** `xkeysib-xxxxxxxxxxxxxxxxxxxxxx` (64 caracteres hex)
**Dónde obtenerla:** https://app.brevo.com/settings/keys/api
**Uso:** Enviar emails de:
  - Bienvenida al registrarse
  - Recuperación de contraseña
  - Código OTP
**Crítica:** ✅ SÍ - Sin esto no se envían emails

---

### `BREVO_FROM_EMAIL`
**Propósito:** Email remitente que aparece en los emails enviados
**Formato:** `noreply@mail.coques.com.ar`
**Requisitos:** 
  - Debe estar verificado en Brevo
  - Idealmente usar un subdominio tuyo (no @gmail/@hotmail)
**Uso:** Campo "From" de todos los emails
**Crítica:** ✅ SÍ - Brevo rechaza emails sin remitente válido

---

## Autenticación Local (App del Local)

### `LOCAL_CAFETERIA_API_KEY`
**Propósito:** API Key para proteger endpoints del local (cafetería)
**Formato:** String hexadecimal de 64 caracteres
**Generar con:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
**Uso:** Header `x-local-api-key` en requests a `/api/eventos`, `/api/mesas`, `/api/sesiones`, etc.
**Crítica:** ✅ SÍ - Protege endpoints críticos que solo debe usar el staff

---

### `LOCAL_LAVADERO_API_KEY`
**Propósito:** API Key para proteger endpoints del lavadero
**Formato:** String hexadecimal de 64 caracteres
**Uso:** Similar a `LOCAL_CAFETERIA_API_KEY` pero para el contexto de lavadero
**Crítica:** ⚠️ MEDIA - Solo si usas la app del lavadero por separado

---

### `COQUES_LOCAL_PASSWORD`
**Propósito:** Contraseña para el usuario "coques" en `/local/login`
**Formato:** String seguro (mínimo 8 caracteres, letras + números)
**Uso:** Autenticación de empleados en la app del local
**Crítica:** ✅ SÍ - Sin esto nadie puede acceder a `/local`

---

### `JWT_SECRET_LOCAL`
**Propósito:** Secret key para firmar tokens JWT de sesión del local
**Formato:** String aleatorio de 64+ caracteres
**Generar con:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
**Uso:** Firmar y verificar tokens JWT cuando un empleado inicia sesión en `/local`
**Crítica:** ⚠️ MEDIA - Si no está configurada, usa un valor por defecto (menos seguro)

---

## WooCommerce (Tortas)

### `WOOCOMMERCE_URL`
**Propósito:** URL base de tu tienda WooCommerce
**Formato:** `https://tutienda.com` (sin `/` al final)
**Uso:** Conectar con WooCommerce para:
  - Listar productos de tortas
  - Ver precios
  - Crear pedidos (futuro)
**Crítica:** ⚠️ MEDIA - Solo afecta la sección `/tortas`

---

### `WOOCOMMERCE_KEY`
**Propósito:** Consumer Key de la API REST de WooCommerce
**Formato:** `ck_xxxxxxxxxxxxxxxxxxxxxx`
**Dónde obtenerlo:** WooCommerce > Settings > Advanced > REST API > Add Key
**Permisos necesarios:** Read/Write
**Uso:** Autenticación en la API de WooCommerce
**Crítica:** ⚠️ MEDIA - Solo afecta la sección `/tortas`

---

### `WOOCOMMERCE_SECRET`
**Propósito:** Consumer Secret de la API REST de WooCommerce
**Formato:** `cs_xxxxxxxxxxxxxxxxxxxxxx`
**Dónde obtenerlo:** Se genera junto con `WOOCOMMERCE_KEY`
**Uso:** Autenticación en la API de WooCommerce (segunda parte)
**Crítica:** ⚠️ MEDIA - Solo afecta la sección `/tortas`

---

## Variables Opcionales (Auto-generadas)

### `VERCEL_URL`
**Propósito:** URL temporal de preview de Vercel
**Formato:** Auto-generada por Vercel
**Uso:** Vercel la genera automáticamente en cada deploy
**Crítica:** ❌ NO - Vercel la maneja automáticamente

---

## 🚀 Configuración Recomendada

### Desarrollo Local
```env
DATABASE_URL="postgresql://..."
DELTAWASH_DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BREVO_API_KEY="xkeysib-..."
BREVO_FROM_EMAIL="noreply@mail.coques.com.ar"
LOCAL_CAFETERIA_API_KEY="tu_key_generada_64_chars"
COQUES_LOCAL_PASSWORD="tu_password_segura"
WOOCOMMERCE_URL="https://tutienda.com"
WOOCOMMERCE_KEY="ck_..."
WOOCOMMERCE_SECRET="cs_..."
```

### Producción (Vercel)
```env
DATABASE_URL="postgresql://..." (producción)
DELTAWASH_DATABASE_URL="postgresql://..." (producción)
NEXT_PUBLIC_APP_URL="https://app.coques.com.ar"
BREVO_API_KEY="xkeysib-..." (misma que dev o diferente)
BREVO_FROM_EMAIL="noreply@mail.coques.com.ar"
LOCAL_CAFETERIA_API_KEY="key_diferente_a_dev"
COQUES_LOCAL_PASSWORD="password_diferente_a_dev"
WOOCOMMERCE_URL="https://tutienda.com"
WOOCOMMERCE_KEY="ck_..."
WOOCOMMERCE_SECRET="cs_..."
```

---

## 📝 Notas Importantes

1. **NUNCA subas el archivo `.env` a Git** - Está en `.gitignore` por seguridad
2. **Variables con `NEXT_PUBLIC_`** se exponen al navegador - no pongas secretos ahí
3. **Local API Keys** deben ser diferentes en dev y producción
4. **Brevo** tiene límite de 300 emails/día en plan gratuito
5. **WooCommerce** requiere HTTPS habilitado en la tienda

---

## 🔍 Checklist Pre-Deploy

- [ ] Todas las variables críticas están configuradas en Vercel
- [ ] `NEXT_PUBLIC_APP_URL` apunta al dominio correcto
- [ ] `BREVO_FROM_EMAIL` está verificado en Brevo
- [ ] `LOCAL_CAFETERIA_API_KEY` es diferente a desarrollo
- [ ] `COQUES_LOCAL_PASSWORD` es una contraseña fuerte y diferente a dev
- [ ] URLs de base de datos apuntan a las instancias de producción
- [ ] WooCommerce permite conexiones desde tu dominio (CORS)
