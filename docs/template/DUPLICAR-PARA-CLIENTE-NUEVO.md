# 📁 Duplicar Proyecto para Cliente Nuevo

## 🎯 Objetivo

Crear una copia completa para un nuevo cliente **SIN tocar nada de Coques**.

---

## ✅ Lo que vas a tener:

```
GitHub/Fidelizacion Coques-Lavadero/
├── fidelizacion-zona/          ← COQUES (intacto, no tocar)
├── fidelizacion-cliente1/      ← CLIENTE NUEVO (nuevo)
└── fidelizacion-cliente2/      ← OTRO CLIENTE (futuro)
```

Cada carpeta es **independiente**: su propio código, su propia DB, su propio deploy.

---

## 🚀 Paso a Paso

### 1. Abrir PowerShell en la carpeta padre

```powershell
# Ir a la carpeta que contiene fidelizacion-zona
cd "C:\Users\Mariano\Documents\GitHub\Fidelizacion Coques-Lavadero"

# Verificar que estás ahí
dir
# Deberías ver: fidelizacion-zona
```

### 2. Duplicar la carpeta completa

```powershell
# Copiar todo (tarda 1-2 minutos)
Copy-Item -Path "fidelizacion-zona" -Destination "fidelizacion-cliente1" -Recurse

# Verificar
dir
# Ahora deberías ver: fidelizacion-zona Y fidelizacion-cliente1
```

### 3. Limpiar archivos innecesarios

```powershell
cd fidelizacion-cliente1

# Borrar node_modules (se reinstala después)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Borrar build anterior
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Borrar .env (vas a crear uno nuevo)
Remove-Item .env -ErrorAction SilentlyContinue

# Borrar git (si querés hacer repo nuevo)
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
```

### 4. Personalizar configuración

Abrí VS Code en la nueva carpeta:

```powershell
code .
```

Editá `config/brand.config.ts`:

```typescript
export const BRAND_CONFIG = {
  company: {
    name: 'Cliente1',                          // ← CAMBIAR
    fullName: 'Cliente 1 Nombre Completo',
    tagline: 'Su eslogan aquí',
    domain: 'app.cliente1.com',                // ← CAMBIAR
    website: 'https://cliente1.com',
  },

  branding: {
    appName: 'Cliente1 Rewards',               // ← CAMBIAR
    staffAppName: 'Cliente1 Staff',
    adminAppName: 'Cliente1 Admin',
    
    colors: {
      primary: 'green',                        // ← CAMBIAR color
      secondary: 'yellow',
      accent: 'teal',
    },
  },

  fidelizacion: {
    programName: 'Cliente1 Points',            // ← CAMBIAR
    // ... resto igual o personalizar
  },

  emails: {
    fromEmail: 'noreply@mail.cliente1.com',    // ← CAMBIAR
    fromName: 'Cliente1',
    replyTo: 'info@cliente1.com',
  },

  // ... resto según necesites
}
```

### 5. Reemplazar logo

Copiá el logo del cliente a:
```
public/brand/logo.svg
```

(Reemplaza el que está ahí)

### 6. Crear .env nuevo

Copiá `.env.example` a `.env`:

```powershell
Copy-Item .env.example .env
```

Editá `.env` con datos del nuevo cliente:

```env
# Base de datos (vas a crear nueva en Neon)
DATABASE_URL="postgresql://..."

# Generar claves nuevas (ejecutá 4 veces):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

JWT_SECRET="nueva-clave-1"
ADMIN_KEY="nueva-clave-2"
JOB_SECRET="nueva-clave-3"
NEXTAUTH_SECRET="nueva-clave-4"

COQUES_LOCAL_PASSWORD="password-cliente1"

# URLs (cambiarán después de deploy)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# Emails (usa el de Coques o crea cuenta nueva)
BREVO_API_KEY="xkeysib-..."
BREVO_FROM_EMAIL="noreply@mail.cliente1.com"

# Google OAuth (puedes usar el mismo o crear nuevo)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### 7. Instalar dependencias

```powershell
npm install
```

(Tarda 3-5 minutos)

### 8. Crear base de datos en Neon

1. Ve a https://neon.tech
2. Create new project
3. Name: `fidelizacion-cliente1`
4. Copia el Connection String
5. Pégalo en `.env` como `DATABASE_URL`

### 9. Migrar base de datos

```powershell
npx prisma generate
npx prisma migrate deploy
```

### 10. Probar localmente

```powershell
npm run dev
```

Abrí: http://localhost:3000

Deberías ver:
- ✅ Logo del cliente (si lo cambiaste)
- ✅ Colores del cliente
- ✅ Nombre "Cliente1" (o el que pusiste)

**¡Funciona!** 🎉

---

## 🚀 Deploy en Vercel

### 1. Crear repo en GitHub (opcional)

```powershell
git init
git add .
git commit -m "Setup inicial Cliente1"

# Crear repo en GitHub: fidelizacion-cliente1
# Luego:
git remote add origin https://github.com/tu-usuario/fidelizacion-cliente1.git
git branch -M main
git push -u origin main
```

### 2. Deploy en Vercel

1. Ve a https://vercel.com
2. New Project
3. Import de GitHub: `fidelizacion-cliente1`
4. Configure:
   - Framework: Next.js
   - Root Directory: `./`
5. Environment Variables:
   - Copia TODAS las variables de tu `.env`
   - ✅ Production, ✅ Preview, ✅ Development
6. Deploy

### 3. Configurar dominio

**Opción A: Subdominio tuyo**
```
cliente1.app.coques.com.ar
```

En Vercel:
- Settings → Domains → Add
- `cliente1.app.coques.com.ar`

En tu DNS (coques.com.ar):
```
CNAME: cliente1.app → [cname-de-vercel]
```

**Opción B: Dominio del cliente**
```
app.cliente1.com
```

Le decís que agregue en su DNS:
```
CNAME: app → fidelizacion-cliente1.vercel.app
```

### 4. Actualizar URLs

Una vez activo el dominio:

Vercel → Settings → Environment Variables → Editar:
```
NEXT_PUBLIC_APP_URL=https://cliente1.app.coques.com.ar
NEXTAUTH_URL=https://cliente1.app.coques.com.ar
```

Redeploy.

---

## ✅ Verificación Final

Checkea que TODO funcione:

### Frontend:
- [ ] Logo correcto
- [ ] Colores correctos
- [ ] Nombre de la empresa correcto
- [ ] URL correcta

### Funcionalidad:
- [ ] Registro de usuario funciona
- [ ] Login funciona
- [ ] QR se genera
- [ ] Panel staff funciona (`/local`)
- [ ] Panel admin funciona (`/admin`)

### Emails:
- [ ] Email de bienvenida llega
- [ ] Email de recuperación funciona

---

## 📧 Entregar al Cliente

```
Hola [Nombre Cliente],

¡Tu sistema de fidelización está listo! 🎉

📱 APP PARA CLIENTES:
https://cliente1.app.coques.com.ar

Tus clientes pueden:
- Registrarse
- Ver su pase con QR
- Acumular visitas
- Canjear beneficios

👥 PANEL PARA TU STAFF:
https://cliente1.app.coques.com.ar/local

Usuario: coques
Contraseña: [TU_PASSWORD]

Tu staff puede:
- Escanear QR de clientes
- Sumar visitas

📊 PANEL ADMIN (PARA VOS):
https://cliente1.app.coques.com.ar/admin

Admin Key: [TU_ADMIN_KEY]

Desde acá podés:
- Ver estadísticas
- Configurar beneficios
- Gestionar niveles

🆘 SOPORTE:
WhatsApp: [tu número]
Email: [tu email]

¡Éxitos!
```

---

## 🔄 Para el Próximo Cliente

Repetir el proceso:

```powershell
cd "C:\Users\Mariano\Documents\GitHub\Fidelizacion Coques-Lavadero"
Copy-Item "fidelizacion-zona" "fidelizacion-cliente2" -Recurse
cd fidelizacion-cliente2
# ... mismo proceso
```

---

## 📊 Gestión de Clientes

Mantené un registro simple:

**CLIENTES.txt**
```
=== CLIENTE 1 ===
Nombre: La Panadería
Carpeta: fidelizacion-cliente1
URL: https://lapanaderia.app.coques.com.ar
Vercel: fidelizacion-lapanaderia
Admin Key: abc123...
Fecha: 2026-03-18
Estado: ✅ Activo

=== CLIENTE 2 ===
Nombre: Pizzería Don Carlo
Carpeta: fidelizacion-cliente2
URL: https://doncarlo.app.coques.com.ar
Vercel: fidelizacion-doncarlo
Admin Key: xyz789...
Fecha: 2026-03-20
Estado: ✅ Activo
```

---

## 💡 Tips

### Para trabajar en Coques:
```powershell
cd "C:\Users\Mariano\Documents\GitHub\Fidelizacion Coques-Lavadero\fidelizacion-zona"
code .
```

### Para trabajar en Cliente1:
```powershell
cd "C:\Users\Mariano\Documents\GitHub\Fidelizacion Coques-Lavadero\fidelizacion-cliente1"
code .
```

### Para actualizar Cliente1 con mejoras de Coques:
```powershell
# Si agregaste feature nueva a Coques y querés pasarla a Cliente1
# Copiá los archivos manualmente o usa git

cd fidelizacion-cliente1
# Copiar archivo específico desde Coques
Copy-Item ..\fidelizacion-zona\src\app\nueva-feature .\ -Recurse
```

---

## 🎉 ¡Listo!

Ahora tenés:
- ✅ Coques funcionando (sin tocar)
- ✅ Cliente1 funcionando (independiente)
- ✅ Proceso claro para agregar más clientes

Cada uno con:
- Su propia carpeta
- Su propia base de datos
- Su propio deploy
- Su propia configuración

**Totalmente independientes. Totalmente funcionales.** 🚀
