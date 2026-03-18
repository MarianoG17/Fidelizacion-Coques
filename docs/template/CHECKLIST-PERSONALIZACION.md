# ✅ Checklist de Personalización

Esta es la lista completa de TODO lo que necesitás personalizar para tu empresa.

---

## 📝 Parte 1: Información Básica

### config/brand.config.ts

#### 🏢 Información de la Empresa
- [ ] `company.name` - Nombre corto (ej: "Mi Empresa")
- [ ] `company.fullName` - Nombre legal completo
- [ ] `company.tagline` - Eslogan/descripción corta
- [ ] `company.description` - Descripción más larga
- [ ] `company.domain` - Dominio de tu app (ej: "app.miempresa.com")
- [ ] `company.website` - Sitio web principal

#### 🎨 Branding Visual
- [ ] `branding.appName` - Nombre de la app para clientes (ej: "Mi Empresa Rewards")
- [ ] `branding.staffAppName` - Nombre para staff (ej: "Mi Empresa Staff")
- [ ] `branding.adminAppName` - Nombre para admin (ej: "Mi Empresa Admin")
- [ ] `branding.colors.primary` - Color principal (blue, purple, green, etc.)
- [ ] `branding.colors.secondary` - Color secundario
- [ ] `branding.colors.accent` - Color de acento

#### 🎯 Programa de Fidelización
- [ ] `fidelizacion.programName` - Nombre del programa (ej: "Puntos Mi Empresa")
- [ ] `fidelizacion.niveles.nivel1` - Nombre nivel básico (ej: "Básico", "Bronce")
- [ ] `fidelizacion.niveles.nivel2` - Nombre nivel medio (ej: "Premium", "Plata")
- [ ] `fidelizacion.niveles.nivel3` - Nombre nivel premium (ej: "VIP", "Oro")
- [ ] `fidelizacion.texts.welcome` - Texto de bienvenida
- [ ] `fidelizacion.texts.welcomeSubtitle` - Subtítulo de bienvenida
- [ ] `fidelizacion.texts.howItWorks` - Explicación del programa
- [ ] `fidelizacion.texts.scanQR` - Texto para escanear QR

#### 📧 Emails
- [ ] `emails.fromEmail` - Email remitente (ej: "noreply@mail.miempresa.com")
- [ ] `emails.fromName` - Nombre que aparece como remitente
- [ ] `emails.replyTo` - Email para respuestas
- [ ] `emails.templates.welcome.subject` - Asunto email de bienvenida
- [ ] `emails.templates.passwordReset.subject` - Asunto recuperación de contraseña
- [ ] `emails.templates.beneficio.subject` - Asunto nuevo beneficio

#### 📱 Redes Sociales
- [ ] `social.instagram` - URL de Instagram (o dejar vacío)
- [ ] `social.facebook` - URL de Facebook (o dejar vacío)
- [ ] `social.whatsapp` - Número de WhatsApp con código de país

#### 📍 Contacto
- [ ] `contact.phone` - Teléfono de contacto
- [ ] `contact.email` - Email de contacto
- [ ] `contact.address` - Dirección física

---

## 📝 Parte 2: Features (config/features.config.ts)

Activá o desactivá funcionalidades:

### Core
- [ ] `niveles` - ¿Usás sistema de niveles? (Sí/No)
- [ ] `beneficios` - ¿Ofrecés beneficios? (Sí/No)
- [ ] `logros` - ¿Usás sistema de logros? (Sí/No)
- [ ] `referidos` - ¿Programa de referidos? (Sí/No)

### Local
- [ ] `mesas` - ¿Tenés mesas? (para restaurantes/cafeterías) (Sí/No)
- [ ] `presupuestos` - ¿Hacés presupuestos? (Sí/No)
- [ ] `eventosEspeciales` - ¿Hacés eventos especiales? (Sí/No)

### Integraciones
- [ ] `woocommerce` - ¿Tenés tienda online WooCommerce? (Sí/No)
- [ ] `deltawash` - ¿Tenés lavadero? (probablemente No)

### Comunicación
- [ ] `feedback` - ¿Querés sistema de feedback? (Sí/No)
- [ ] `pushNotifications` - ¿Notificaciones push? (Sí/No)

### Autenticación
- [ ] `googleOAuth` - ¿Login con Google? (recomendado: Sí)
- [ ] `passkeys` - ¿Autenticación biométrica? (recomendado: Sí)

---

## 📝 Parte 3: Assets Visuales

### Logos
- [ ] `public/brand/logo.svg` - Logo principal (SVG recomendado, PNG también sirve)
  - Tamaño recomendado: 200x60px aprox
  - Fondo transparente
  
- [ ] `public/brand/logo-small.svg` - Logo pequeño/ícono
  - Tamaño recomendado: 64x64px
  - Para usar como ícono en navegación

### Favicon
- [ ] `public/favicon.ico` - Favicon (ícono en la pestaña del navegador)
  - Tamaño: 32x32px
  - Formato .ico

### Redes Sociales
- [ ] `public/og-image.jpg` - Imagen para compartir en redes
  - Tamaño: 1200x630px
  - Formato JPG o PNG
  - Se muestra cuando compartís links en WhatsApp, Facebook, etc.

### PWA Icons
- [ ] `public/icon-192x192.png` - Ícono PWA pequeño (192x192px)
- [ ] `public/icon-512x512.png` - Ícono PWA grande (512x512px)
- [ ] `public/apple-touch-icon.png` - Ícono para iOS (180x180px)

**💡 Tip:** Podés usar herramientas online como [RealFaviconGenerator](https://realfavicongenerator.net/) para generar todos estos íconos automáticamente desde un logo.

---

## 📝 Parte 4: Variables de Entorno (.env)

### Base de Datos
- [ ] `DATABASE_URL` - Connection string de Neon (PostgreSQL)

### URLs
- [ ] `NEXT_PUBLIC_APP_URL` - URL de tu app (ej: https://app.tuempresa.com)
- [ ] `NEXTAUTH_URL` - Misma que la anterior

### Emails
- [ ] `BREVO_API_KEY` - API Key de Brevo (para enviar emails)
- [ ] `BREVO_FROM_EMAIL` - Email remitente (debe estar verificado en Brevo)

### Google OAuth (opcional)
- [ ] `GOOGLE_CLIENT_ID` - Client ID de Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - Client Secret de Google Cloud Console

### Seguridad (generar claves aleatorias)
- [ ] `JWT_SECRET` - Para tokens de sesión (64 caracteres hex)
- [ ] `ADMIN_KEY` - Para acceso al panel admin (64 caracteres hex)
- [ ] `JOB_SECRET` - Para jobs/cron (64 caracteres hex)
- [ ] `NEXTAUTH_SECRET` - Para NextAuth (base64, 32 caracteres)

### Local (Staff)
- [ ] `COQUES_LOCAL_PASSWORD` - Contraseña para el staff (ej: "mipassword123")
- [ ] `LOCAL_CAFETERIA_API_KEY` - API Key para local (64 caracteres hex)

### WooCommerce (si usás tienda online)
- [ ] `WOOCOMMERCE_URL` - URL de tu tienda (ej: https://tienda.miempresa.com)
- [ ] `WOOCOMMERCE_KEY` - Consumer Key (desde WooCommerce → Settings → Advanced → REST API)
- [ ] `WOOCOMMERCE_SECRET` - Consumer Secret

**💡 Cómo generar claves aleatorias:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📝 Parte 5: Base de Datos

### Niveles (tabla Nivel)
- [ ] Crear o actualizar niveles con tus nombres personalizados
  ```sql
  -- Ejemplo:
  UPDATE "Nivel" SET nombre = 'Básico' WHERE nombre = 'Bronce';
  UPDATE "Nivel" SET nombre = 'Premium' WHERE nombre = 'Plata';
  UPDATE "Nivel" SET nombre = 'VIP' WHERE nombre = 'Oro';
  ```

### Beneficios (tabla Beneficio)
- [ ] Crear beneficios específicos de tu negocio
- [ ] Definir qué niveles tienen acceso a cada beneficio
- [ ] Configurar restricciones (usos máximos, vencimiento, etc.)

### Locales (tabla Local)
- [ ] Crear registro(s) para tu(s) local(es)
  ```sql
  -- Ejemplo:
  INSERT INTO "Local" (nombre, tipo, direccion) 
  VALUES ('Local Centro', 'CAFETERIA', 'Av. Principal 123');
  ```

---

## 📝 Parte 6: Textos y Contenido

### Manifest PWA (public/manifest.json)
- [ ] `name` - Nombre completo de la app
- [ ] `short_name` - Nombre corto (12 caracteres max)
- [ ] `description` - Descripción de la app

### Manifest Staff (public/manifest-staff.json)
- [ ] `name` - Nombre de la app del staff
- [ ] `short_name` - Nombre corto
- [ ] `description` - Descripción

### Emails Transaccionales
Los templates están en `src/lib/` pero podés personalizarlos:
- [ ] Email de bienvenida
- [ ] Email de recuperación de contraseña
- [ ] Email de nuevo beneficio
- [ ] Email de nivel alcanzado

---

## 📝 Parte 7: Configuración de Dominio

### DNS
- [ ] Configurar registro CNAME en tu proveedor de dominio
  - Name: `app`
  - Value: CNAME de Vercel (ej: `cname.vercel-dns.com`)
  - TTL: 3600

### SSL
- [ ] Verificar que el certificado SSL se generó automáticamente en Vercel
- [ ] Forzar HTTPS (normalmente automático)

---

## 📝 Parte 8: Testing Final

Antes de lanzar, probá:

### Como Cliente
- [ ] Registrarse con email
- [ ] Registrarse con Google (si está activado)
- [ ] Ver perfil
- [ ] Ver QR de fidelización
- [ ] Ver beneficios disponibles
- [ ] Ver historial

### Como Staff
- [ ] Login en `/local`
- [ ] Escanear QR de cliente (usar cámara)
- [ ] Ver dashboard de mesas (si aplica)
- [ ] Gestionar presupuestos (si aplica)

### Como Admin
- [ ] Login en `/admin` con ADMIN_KEY
- [ ] Ver métricas
- [ ] Crear/editar beneficios
- [ ] Configurar niveles
- [ ] Exportar datos a Excel

### PWA
- [ ] Instalar app en celular Android
- [ ] Instalar app en celular iOS
- [ ] Verificar que funcione offline
- [ ] Verificar notificaciones push

### Emails
- [ ] Registro → Recibir email de bienvenida
- [ ] Recuperar contraseña → Recibir email con link
- [ ] Alcanzar nivel → Recibir notificación

---

## 🎯 Checklist de Lanzamiento

Antes de compartir la app con clientes:

- [ ] Todos los puntos anteriores están completos
- [ ] Logo y colores son correctos
- [ ] App funciona en producción (Vercel)
- [ ] Base de datos tiene datos iniciales
- [ ] Emails se envían correctamente
- [ ] Staff puede loguearse y usar el sistema
- [ ] Admin puede acceder al panel
- [ ] Dominio personalizado funciona
- [ ] PWA se puede instalar en celulares
- [ ] SSL/HTTPS está activo

---

## 💡 Tips Finales

### Testing con Usuarios Reales
1. Creá 3-5 cuentas de prueba
2. Hacé que visiten el local varias veces
3. Probá el flujo completo: registro → visitas → beneficios → canje

### Capacitación del Staff
1. Mostrales cómo usar `/local`
2. Explicales cómo escanear QR
3. Enseñales a resolver problemas comunes

### Comunicación a Clientes
1. Poné carteles en el local con el QR/URL de la app
2. Mencionalo en redes sociales
3. Ofrecé un beneficio por registrarse

---

## ✅ ¡Todo Listo!

Cuando hayas completado todos los items de este checklist, tu sistema de fidelización estará 100% personalizado y listo para usar.

**¿Tenés dudas?** Consultá el [`README-PARA-NUEVO-CLIENTE.md`](./README-PARA-NUEVO-CLIENTE.md)
