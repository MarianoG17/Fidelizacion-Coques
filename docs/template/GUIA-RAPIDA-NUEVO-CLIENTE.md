# ⚡ Guía Rápida: Configurar Nuevo Cliente (15 minutos)

## 🎯 Objetivo

Configurar el sistema para un nuevo cliente SIN multi-tenant. Proyecto separado, simple y rápido.

---

## 📋 Proceso Completo

### Paso 1: Duplicar el Código (2 minutos)

**Opción A: En tu computadora**
```bash
# Duplicar la carpeta
cd "C:\Users\Mariano\Documents\GitHub\Fidelizacion Coques-Lavadero"
Copy-Item -Path "fidelizacion-zona" -Destination "fidelizacion-cliente1" -Recurse

# Entrar a la nueva carpeta
cd fidelizacion-cliente1

# Limpiar (borrar node_modules, .next, .env)
Remove-Item -Recurse -Force node_modules, .next
Remove-Item .env
```

**Opción B: Nuevo repo en GitHub**
```bash
# En GitHub: Create New Repository
# Nombre: fidelizacion-cliente1

# Clonar tu código original
git clone https://github.com/tu-usuario/fidelizacion-zona.git fidelizacion-cliente1
cd fidelizacion-cliente1

# Cambiar remote
git remote remove origin
git remote add origin https://github.com/tu-usuario/fidelizacion-cliente1.git
```

---

### Paso 2: Personalizar Configuración (5 minutos)

Abrí `config/brand.config.ts` y cambiá:

```typescript
export const BRAND_CONFIG = {
  company: {
    name: 'CLIENTE1',                          // ← Cambiar
    fullName: 'Cliente 1 Nombre Completo',     // ← Cambiar
    tagline: 'Su tagline aquí',                // ← Cambiar
    domain: 'app.cliente1.com',                // ← Cambiar (o cliente1.app.coques.com.ar)
    website: 'https://cliente1.com',           // ← Cambiar
  },

  branding: {
    appName: 'Cliente1 Rewards',               // ← Cambiar
    staffAppName: 'Cliente1 Staff',            // ← Cambiar
    adminAppName: 'Cliente1 Admin',            // ← Cambiar
    
    colors: {
      primary: 'purple',                       // ← Cambiar color
      secondary: 'pink',
      accent: 'indigo',
    },
  },

  fidelizacion: {
    programName: 'Cliente1 Points',            // ← Cambiar
    niveles: {
      nivel1: 'Básico',                        // ← Cambiar nombres si quieren
      nivel2: 'Premium',
      nivel3: 'VIP',
    },
  },

  emails: {
    fromEmail: 'noreply@mail.cliente1.com',    // ← Cambiar
    fromName: 'Cliente1',                      // ← Cambiar
    replyTo: 'info@cliente1.com',             // ← Cambiar
  },

  social: {
    instagram: 'https://instagram.com/cliente1', // ← Cambiar o vacío
    facebook: '',                               // ← Cambiar o vacío
    whatsapp: '+5491112345678',                 // ← Cambiar
  },

  contact: {
    phone: '+54 11 1234-5678',                 // ← Cambiar
    email: 'info@cliente1.com',                // ← Cambiar
    address: 'Dirección del cliente',          // ← Cambiar
  },
}
```

**⚡ Tip:** Pedile al cliente que te mande:
- Logo (SVG o PNG con fondo transparente)
- Colores corporativos (o elegí de sus redes sociales)
- Textos (tagline, nombre del programa, etc.)
- Redes sociales

---

### Paso 3: Reemplazar Assets (3 minutos)

**Logo:**
```bash
# Recibiste el logo del cliente (logo-cliente1.svg)
# Copialo a:
public/brand/logo.svg
```

**Favicon:**
- Podés usar el mismo logo o pedirles uno cuadrado
- Copiá a: `public/favicon.ico`

**OG Image (para redes sociales):**
- Creá una imagen 1200x630px con el logo y nombre del cliente
- Copiá a: `public/og-image.jpg`

**PWA Icons:**
- Si tenés tiempo, generá: `icon-192x192.png`, `icon-512x512.png`
- O usa los por defecto temporalmente

---

### Paso 4: Configurar Base de Datos del Cliente (3 minutos)

**Crear nueva DB en Neon:**

1. Andá a [https://neon.tech](https://neon.tech)
2. Create Project → `fidelizacion-cliente1`
3. Copiá el Connection String

**Crear `.env` local:**
```bash
# Copiar template
Copy-Item .env.example .env
```

**Editar `.env`:**
```env
DATABASE_URL="postgresql://user:password@cliente1-db.neon.tech/neondb?sslmode=require"

# Generar nuevas claves (ejecutá 4 veces en PowerShell):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="nueva-clave-aleatoria-1"
ADMIN_KEY="nueva-clave-aleatoria-2"
JOB_SECRET="nueva-clave-aleatoria-3"
NEXTAUTH_SECRET="nueva-clave-aleatoria-4"

COQUES_LOCAL_PASSWORD="password-staff-cliente1"

# URLs (temporales, cambiarán en Vercel)
NEXT_PUBLIC_APP_URL="https://fidelizacion-cliente1.vercel.app"
NEXTAUTH_URL="https://fidelizacion-cliente1.vercel.app"

# Brevo (puedes usar el mismo de Coques o pedirle al cliente que cree cuenta)
BREVO_API_KEY="xkeysib-tu-key"
BREVO_FROM_EMAIL="noreply@mail.cliente1.com"

# Google OAuth (opcional, puedes crear nuevo o usar el mismo)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# WooCommerce (si el cliente lo necesita)
WOOCOMMERCE_URL="https://tienda.cliente1.com"
WOOCOMMERCE_KEY="..."
WOOCOMMERCE_SECRET="..."
```

**Aplicar migraciones:**
```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

---

### Paso 5: Deploy en Vercel (2 minutos)

**Crear proyecto en Vercel:**

1. Ve a [https://vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. **Import Git Repository:**
   - Si usaste GitHub: importa el repo `fidelizacion-cliente1`
   - Si no: "Import Third-Party Git Repository" y sube el código
4. **Configure Project:**
   - Project Name: `fidelizacion-cliente1`
   - Framework Preset: Next.js
   - Root Directory: `./` (ya estás en la raíz)
5. **Environment Variables:**
   - Click "Add" y pega TODAS las variables de tu `.env` local
   - Environment: ✅ Production, ✅ Preview, ✅ Development
6. Click **"Deploy"**

Esperá 2-3 minutos...

✅ **Listo!** Tu cliente tiene su sistema en:
```
https://fidelizacion-cliente1.vercel.app
```

---

### Paso 6: Configurar Dominio (Opcional)

**Si el cliente quiere dominio personalizado:**

**Opción A: Subdominio tuyo**
```
cliente1.app.coques.com.ar
```

En Vercel:
1. Settings → Domains → Add
2. Ingresá: `cliente1.app.coques.com.ar`
3. Te da un CNAME

En tu DNS (donde tenés coques.com.ar):
```
CNAME: cliente1.app → [el-cname-de-vercel]
```

**Opción B: Dominio del cliente**
```
app.cliente1.com
```

En Vercel:
1. Settings → Domains → Add
2. Ingresá: `app.cliente1.com`

Le decís al cliente que agregue en su DNS:
```
CNAME: app → fidelizacion-cliente1.vercel.app
```

**Actualizar URLs:**
Una vez que el dominio esté activo:
1. Vercel → Settings → Environment Variables
2. Cambiar:
   ```
   NEXT_PUBLIC_APP_URL=https://cliente1.app.coques.com.ar
   NEXTAUTH_URL=https://cliente1.app.coques.com.ar
   ```
3. Redeploy

---

## 🎉 ¡Listo!

### URLs del Cliente:

- **App:** `https://cliente1.app.coques.com.ar`
- **Staff:** `https://cliente1.app.coques.com.ar/local`
- **Admin:** `https://cliente1.app.coques.com.ar/admin`

### Credenciales para darle al cliente:

**Staff (para empleados):**
```
Usuario: coques
Contraseña: [el COQUES_LOCAL_PASSWORD que configuraste]
```

**Admin (para el dueño):**
```
URL: https://cliente1.app.coques.com.ar/admin
Admin Key: [el ADMIN_KEY que generaste]
```

---

## 📧 Email Template para Enviar al Cliente

```
Hola [Nombre],

¡Tu sistema de fidelización está listo! 🎉

📱 APP PARA CLIENTES:
https://cliente1.app.coques.com.ar

Los clientes pueden:
- Registrarse desde la app
- Ver su pase de fidelización con QR
- Acumular visitas
- Canjear beneficios

👥 PANEL PARA TU STAFF:
https://cliente1.app.coques.com.ar/local

Usuario: coques
Contraseña: [PASSWORD]

Tu staff puede:
- Escanear QR de clientes
- Sumar visitas
- Gestionar mesas
- Tomar pedidos

📊 PANEL DE ADMINISTRACIÓN (PARA VOS):
https://cliente1.app.coques.com.ar/admin

Admin Key: [ADMIN_KEY]

Desde acá podés:
- Ver estadísticas
- Configurar beneficios
- Gestionar niveles
- Exportar datos

📱 INSTALAR COMO APP:
Desde el celular, entrá a la URL y agregala a la pantalla de inicio.

🆘 SOPORTE:
Si tenés alguna consulta:
WhatsApp: [tu número]
Email: [tu email]

¡Éxitos con tu programa de fidelización!

Saludos,
[Tu nombre]
```

---

## ⏱️ Resumen de Tiempos

| Paso | Tiempo | Total |
|------|--------|-------|
| 1. Duplicar código | 2 min | 2 min |
| 2. Editar brand.config.ts | 5 min | 7 min |
| 3. Reemplazar assets (logo, etc.) | 3 min | 10 min |
| 4. Configurar DB y .env | 3 min | 13 min |
| 5. Deploy en Vercel | 2 min | 15 min |
| 6. Configurar dominio (opcional) | +10 min | 25 min |

**Total: 15-25 minutos** ⚡

---

## 🔧 Tips para Optimizar

### Crear Template Base

Para ahorrar tiempo en futuros clientes:

1. **Mantené una carpeta "template-limpio"** con:
   - `brand.config.example.ts` ya copiado a `brand.config.ts`
   - `.env.example` sin variables de Coques
   - Assets genéricos (logo placeholder)
   
2. **Al configurar nuevo cliente:**
   - Copiá de "template-limpio" en vez de "fidelizacion-zona"
   - Solo editá lo específico del cliente
   - Más rápido

### Script de Setup Automatizado

Podés crear un script PowerShell:

```powershell
# setup-cliente.ps1
param($nombreCliente)

Write-Host "🚀 Configurando cliente: $nombreCliente"

# Copiar template
Copy-Item -Recurse "template-limpio" "fidelizacion-$nombreCliente"
cd "fidelizacion-$nombreCliente"

# Generar claves
$jwt = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$admin = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Write-Host "✅ Proyecto creado en: fidelizacion-$nombreCliente"
Write-Host "Admin Key: $admin"
Write-Host ""
Write-Host "Siguiente: Editar config/brand.config.ts"
```

Uso:
```powershell
.\setup-cliente.ps1 cliente1
```

---

## 📊 Gestión de Múltiples Clientes

### Tracking

Mantené un archivo `CLIENTES.md`:

```markdown
# 📋 Clientes Activos

## Cliente 1 - La Panadería
- **URL:** https://lapanaderia.app.coques.com.ar
- **Vercel:** fidelizacion-lapanaderia
- **DB:** neon.tech/lapanaderia-db
- **Admin Key:** abc123...
- **Fecha setup:** 2026-03-15
- **Estado:** ✅ Activo
- **Contacto:** Juan Pérez - juan@lapanaderia.com

## Cliente 2 - Pizzería Don Carlo
- **URL:** https://doncarlo.app.coques.com.ar
- **Vercel:** fidelizacion-doncarlo
- **DB:** neon.tech/doncarlo-db
- **Admin Key:** xyz789...
- **Fecha setup:** 2026-03-18
- **Estado:** ✅ Activo
- **Contacto:** Carlos Rossi - carlos@doncarlo.com
```

---

## 🚨 Mantenimiento y Actualizaciones

### Cuando agregás una feature nueva a Coques:

```bash
# En tu código original de Coques
git commit -m "Nueva feature: sistema de referidos"
git push

# Para actualizar a un cliente:
cd fidelizacion-cliente1
git remote add coques-origin ../fidelizacion-zona
git fetch coques-origin
git merge coques-origin/main

# Resolver conflictos si hay (normalmente solo en brand.config.ts)
# Push
git push
```

En Vercel se redeploya automáticamente.

---

## ✅ Checklist Final

Antes de entregar al cliente:

- [ ] `brand.config.ts` tiene todos los datos del cliente
- [ ] Logo reemplazado
- [ ] Colores correctos
- [ ] Base de datos creada y migrada
- [ ] Deploy en Vercel funcionando
- [ ] Dominio configurado (si corresponde)
- [ ] Emails de prueba enviados
- [ ] Credenciales generadas (staff + admin)
- [ ] Email de bienvenida enviado al cliente
- [ ] Capacitación del staff agendada

---

## 🎯 ¡Ya está!

Con este proceso podés configurar nuevos clientes en **15 minutos** sin complicaciones.

**Próximo cliente: copiar, personalizar, deploy. Listo.** 🚀
