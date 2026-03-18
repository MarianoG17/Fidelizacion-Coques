# 🚀 Guía de Instalación - Sistema de Fidelización

## 👋 Bienvenido

Este es un sistema completo de fidelización de clientes que incluye:

- ✅ App móvil (PWA) para clientes
- ✅ Panel para staff del local
- ✅ Panel de administración
- ✅ Sistema de niveles y beneficios
- ✅ QR de fidelización
- ✅ Notificaciones push
- ✅ Y mucho más...

---

## 📋 Requisitos Previos

Antes de empezar, necesitás:

### 1. Cuentas y Servicios

- ☐ Cuenta en [Vercel](https://vercel.com) (hosting - GRATIS)
- ☐ Cuenta en [Neon](https://neon.tech) (base de datos PostgreSQL - GRATIS)
- ☐ Cuenta en [Brevo](https://brevo.com) o [Resend](https://resend.com) (emails - GRATIS hasta 300/día)
- ☐ Dominio propio (opcional pero recomendado - ej: `app.tuempresa.com`)

### 2. Herramientas en tu Computadora

- ☐ [Node.js 18+](https://nodejs.org/) instalado
- ☐ [Git](https://git-scm.com/) instalado
- ☐ Editor de código ([VS Code](https://code.visualstudio.com/) recomendado)

### 3. Conocimientos Básicos

- No necesitás ser programador, pero ayuda saber:
  - Editar archivos de texto
  - Seguir instrucciones paso a paso
  - Usar la terminal/consola (te vamos guiando)

---

## 🎯 Pasos de Instalación

### Fase 1: Preparar el Código (30 minutos)

#### 1.1. Descargar el Proyecto

**Opción A: Si recibiste un ZIP**
```bash
# 1. Extraé el archivo ZIP en una carpeta
# 2. Abrí la carpeta en VS Code
# 3. Abrí la terminal (Ctrl + ñ en VS Code)
```

**Opción B: Si tenés acceso al repositorio Git**
```bash
git clone [URL_DEL_REPOSITORIO] mi-empresa-fidelizacion
cd mi-empresa-fidelizacion/fidelizacion-zona
```

#### 1.2. Instalar Dependencias

```bash
# En la terminal, dentro de la carpeta fidelizacion-zona
npm install
```

Esto puede tardar 5-10 minutos. Esperá a que termine.

#### 1.3. Personalizar Configuración

**a) Copiar el template de configuración:**
```bash
# Windows (PowerShell)
Copy-Item config/brand.config.example.ts config/brand.config.ts

# Mac/Linux
cp config/brand.config.example.ts config/brand.config.ts
```

**b) Editar `config/brand.config.ts`:**

Abrí el archivo `config/brand.config.ts` y reemplazá:

```typescript
company: {
  name: 'TU_EMPRESA',                    // ← Tu nombre aquí
  fullName: 'TU_EMPRESA_COMPLETO',       
  domain: 'app.tuempresa.com',           // ← Tu dominio
  // ... etc
}
```

📝 **Ver el archivo [`CHECKLIST-PERSONALIZACION.md`](./CHECKLIST-PERSONALIZACION.md) para lista completa**

#### 1.4. Reemplazar Assets

**Logo:**
- Colocá tu logo en: `public/brand/logo.svg` (formato SVG recomendado)
- Logo pequeño: `public/brand/logo-small.svg`

**Favicon:**
- Colocá tu favicon en: `public/favicon.ico`

**Imagen para redes sociales:**
- Colocá imagen 1200x630px en: `public/og-image.jpg`

---

### Fase 2: Configurar Base de Datos (20 minutos)

#### 2.1. Crear Base de Datos en Neon

1. Andá a [https://neon.tech](https://neon.tech)
2. Creá una cuenta (gratis)
3. Click en **"Create Project"**
4. Nombre: `tu-empresa-fidelizacion`
5. Región: Elegí la más cercana (ej: `South America (São Paulo)`)
6. Click **"Create Project"**

#### 2.2. Obtener Connection String

1. En el dashboard de Neon, buscá **"Connection String"**
2. Copiá la URL que dice **"Connection string"**
3. Se ve así:
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

#### 2.3. Crear archivo `.env`

En la raíz del proyecto (`fidelizacion-zona/`), creá un archivo llamado `.env`:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Mac/Linux
cp .env.example .env
```

Abrí `.env` y pegá tu connection string:

```env
DATABASE_URL="postgresql://user:password@tu-neon-host.neon.tech/neondb?sslmode=require"
```

#### 2.4. Crear Tablas en la Base de Datos

```bash
# Generar el cliente de Prisma
npx prisma generate

# Aplicar migraciones (crear tablas)
npx prisma migrate deploy

# Seed inicial (datos de ejemplo)
npx prisma db seed
```

---

### Fase 3: Configurar Servicios Externos (30 minutos)

#### 3.1. Google OAuth (Login con Google)

**Opcional pero recomendado**

1. Andá a [Google Cloud Console](https://console.cloud.google.com)
2. Creá un proyecto nuevo
3. Activá "Google+ API"
4. Credentials → Create Credentials → OAuth 2.0 Client ID
5. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://tu-dominio.com/api/auth/callback/google
   ```
6. Copiá Client ID y Client Secret

Agregá a `.env`:
```env
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-secret"
```

#### 3.2. Brevo (Emails)

**Necesario para recuperación de contraseña, bienvenida, etc.**

1. Creá cuenta en [https://brevo.com](https://brevo.com)
2. Ve a Settings → SMTP & API → API Keys
3. Creá una nueva API Key
4. Copiá la key (empieza con `xkeysib-...`)

Agregá a `.env`:
```env
BREVO_API_KEY="xkeysib-tu-api-key-aqui"
BREVO_FROM_EMAIL="noreply@mail.tuempresa.com"
```

#### 3.3. Variables de Seguridad

**Generá claves aleatorias seguras:**

```bash
# En la terminal, ejecutá 4 veces:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Agregá a `.env`:
```env
JWT_SECRET="clave-aleatoria-1"
ADMIN_KEY="clave-aleatoria-2"
JOB_SECRET="clave-aleatoria-3"
NEXTAUTH_SECRET="clave-aleatoria-4"

# Contraseña para el staff del local
COQUES_LOCAL_PASSWORD="tu_password_seguro_aqui"
```

#### 3.4. URLs de la Aplicación

```env
NEXT_PUBLIC_APP_URL="https://app.tuempresa.com"
NEXTAUTH_URL="https://app.tuempresa.com"
```

---

### Fase 4: Probar Localmente (10 minutos)

```bash
# Levantar el servidor de desarrollo
npm run dev
```

Abrí el navegador en: [http://localhost:3000](http://localhost:3000)

**Deberías ver:**
- ✅ Tu logo y nombre de empresa
- ✅ Página de inicio personalizada
- ✅ Poder registrarte como usuario

**Problemas comunes:**
- ❌ "Error connecting to database" → Verificá `DATABASE_URL` en `.env`
- ❌ "Module not found" → Ejecutá `npm install` nuevamente
- ❌ Puerto 3000 en uso → Usá `npm run dev -- -p 3001`

---

### Fase 5: Deploy en Vercel (30 minutos)

#### 5.1. Subir Código a GitHub (si no lo hiciste)

```bash
# Inicializar Git (si es necesario)
git init

# Agregar archivos
git add .
git commit -m "Configuración inicial de [TU EMPRESA]"

# Crear repositorio en GitHub y pushearlo
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

#### 5.2. Deploy en Vercel

1. Andá a [https://vercel.com](https://vercel.com)
2. Click **"Import Project"**
3. Seleccioná tu repositorio de GitHub
4. Root Directory: `fidelizacion-zona`
5. Click **"Deploy"**

#### 5.3. Configurar Variables de Entorno en Vercel

1. En Vercel, andá a tu proyecto → Settings → Environment Variables
2. Agregá TODAS las variables de tu `.env` local:
   - `DATABASE_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `BREVO_API_KEY`
   - `BREVO_FROM_EMAIL`
   - `JWT_SECRET`
   - `ADMIN_KEY`
   - `JOB_SECRET`
   - `NEXTAUTH_SECRET`
   - `COQUES_LOCAL_PASSWORD`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXTAUTH_URL`

3. Environment: Seleccioná **Production**, **Preview**, y **Development**
4. Click **"Save"**

#### 5.4. Redeploy

1. Deployments → Click en los "..." del último deploy
2. Click **"Redeploy"**

---

### Fase 6: Configurar Dominio Personalizado (Opcional - 20 minutos)

#### 6.1. En Vercel

1. Tu proyecto → Settings → Domains
2. Click **"Add Domain"**
3. Ingresá: `app.tuempresa.com`
4. Vercel te va a dar un CNAME (ej: `cname.vercel-dns.com`)

#### 6.2. En tu Proveedor de Dominio

1. Andá al panel de tu dominio (GoDaddy, Namecheap, etc.)
2. DNS Management
3. Agregar registro CNAME:
   - Name/Host: `app`
   - Value: `cname.vercel-dns.com` (o el que te dio Vercel)
   - TTL: 3600

4. Guardar y esperar propagación (5 min - 24 hrs)

#### 6.3. Actualizar URLs

Una vez que el dominio esté activo:

1. Vercel → Settings → Environment Variables
2. Actualizá:
   ```
   NEXT_PUBLIC_APP_URL=https://app.tuempresa.com
   NEXTAUTH_URL=https://app.tuempresa.com
   ```
3. Redeploy

---

## 🎉 ¡Listo! Tu Sistema Está Online

### URLs de tu aplicación:

- **App de clientes:** `https://app.tuempresa.com`
- **Panel de staff:** `https://app.tuempresa.com/local`
- **Panel admin:** `https://app.tuempresa.com/admin`

---

## 📱 Instalar como App (PWA)

### En celular Android:
1. Abrí la app en Chrome
2. Menú → "Agregar a pantalla de inicio"

### En celular iPhone:
1. Abrí la app en Safari
2. Compartir → "Agregar a pantalla de inicio"

### En computadora:
1. Chrome → Icono de instalación en la barra de direcciones

---

## 🔧 Configuración Inicial

### 1. Crear tu Usuario Admin

1. Andá a `https://app.tuempresa.com`
2. Registrate normalmente
3. En la base de datos (Neon), ejecutá:
   ```sql
   UPDATE "Cliente" SET rol = 'ADMIN' WHERE email = 'tu-email@ejemplo.com';
   ```

### 2. Configurar Niveles

1. Ingresá al admin: `https://app.tuempresa.com/admin`
2. Usá tu `ADMIN_KEY` para autenticarte
3. Ve a "Niveles" y configurá criterios de visitas

### 3. Crear Beneficios

1. En admin → "Beneficios"
2. Creá beneficios para cada nivel

### 4. Configurar Local(es)

1. En la base de datos, verificá que exista un local
2. O creá uno nuevo:
   ```sql
   INSERT INTO "Local" (nombre, tipo) VALUES ('Local Centro', 'CAFETERIA');
   ```

---

## 📚 Documentación Adicional

- [`CHECKLIST-PERSONALIZACION.md`](./CHECKLIST-PERSONALIZACION.md) - Lista completa de qué personalizar
- [`../MAPA-URLS-APLICACION.md`](../MAPA-URLS-APLICACION.md) - Todas las URLs de la app
- [`../SETUP-GUIDE.md`](../SETUP-GUIDE.md) - Guía técnica detallada

---

## ❓ Problemas Comunes

### "Error al cargar métricas" en Admin

- Verificá que `ADMIN_KEY` esté configurada en Vercel
- Redeployá después de agregar la variable

### Emails no se envían

- Verificá `BREVO_API_KEY` en Vercel
- Verificá que el email remitente esté verificado en Brevo
- Revisá logs en Brevo dashboard

### Login con Google no funciona

- Verificá que las Redirect URIs en Google Console incluyan tu dominio
- Verificá `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en Vercel

### Base de datos no conecta

- Verificá que `DATABASE_URL` esté correcta
- Verificá que termina en `?sslmode=require`
- Verificá que tu IP no esté bloqueada en Neon

---

## 🆘 Soporte

Si tenés problemas:

1. Revisá esta guía paso a paso
2. Revisá los logs en Vercel (Runtime Logs)
3. Revisá la consola del navegador (F12)
4. Contactá a quien te compartió el proyecto

---

## 🎯 Próximos Pasos

Una vez que todo funcione:

1. ✅ Invitá a tu staff a probar el panel `/local`
2. ✅ Registrá algunos clientes de prueba
3. ✅ Probá el flujo completo (registro → visita → beneficio)
4. ✅ Personalizá los beneficios según tu negocio
5. ✅ Configurá los textos de emails
6. ✅ ¡Empezá a usar el sistema!

---

## 🚀 ¡Éxitos con tu Programa de Fidelización!
