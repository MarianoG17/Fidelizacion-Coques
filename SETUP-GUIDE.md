# 🚀 Guía de Setup - Coques Points

## Opción recomendada: Flujo Vercel → Neon (la que ya conocés)

Según tus proyectos anteriores y el archivo APRENDIZAJES.md, esta es la secuencia que funciona mejor:

### 1. Setup Git + GitHub (local)

```bash
cd fidelizacion-zona
git init
git add .
git commit -m "feat: scaffold inicial coques-points"
git remote add origin https://github.com/TU_USUARIO/fidelizacion-coques-lavadero.git
git branch -M main
git push -u origin main
```

### 2. Importar en Vercel

1. Ir a vercel.com/new
2. Importar el repo recién creado
3. **NO agregar variables de entorno todavía**
4. Click Deploy → **Va a fallar (es normal, falta la BD)**

### 3. Crear Neon PostgreSQL desde Vercel

1. En el proyecto de Vercel → pestaña **Storage**
2. Click **Create Database** → **Postgres (Neon)**
3. Nombre: `coques-points-db` (o el que prefieras)
4. Vercel agrega `DATABASE_URL` automáticamente a las env vars del proyecto

### 4. Copiar DATABASE_URL para desarrollo local

1. En Vercel → Settings → Environment Variables
2. Copiar el valor de `DATABASE_URL`
3. **IMPORTANTE:** Ir a Neon Console y obtener el **Direct URL** (no pooled)
   - Direct URL: `ep-xxx.neon.tech` (usar esta)
   - Pooled URL: `pooler.neon.tech` (NO usar)
4. Pegar en tu `.env.local` local

### 5. Agregar variables restantes en Vercel

En Vercel → Settings → Environment Variables, agregar:

```env
JWT_SECRET=<generar con crypto>
ADMIN_KEY=<generar con crypto>
JOB_SECRET=<generar con crypto>
NEXT_PUBLIC_LOCAL_API_KEY=coques-api-key-dev-change-in-prod
NEXT_PUBLIC_APP_URL=https://tu-proyecto.vercel.app
NEXT_PUBLIC_APP_NAME=Coques Points
TZ=America/Argentina/Buenos_Aires
NEXT_PUBLIC_TZ=America/Argentina/Buenos_Aires
```

Para generar los secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Completar `.env.local` local

Editar `fidelizacion-zona/.env.local` con:
- `DATABASE_URL` de Neon (Direct URL)
- Los mismos `JWT_SECRET`, `ADMIN_KEY`, `JOB_SECRET` que pusiste en Vercel

### 7. Instalar dependencias e inicializar BD

```bash
npm install
npm run db:push      # Crea las tablas en Neon
npm run db:seed      # Carga datos iniciales (niveles, locales, cliente test)
```

### 8. Correr en desarrollo local

```bash
npm run dev
```

Rutas para probar:
- http://localhost:3000/pass (necesita token, primero hay que activar)
- http://localhost:3000/activar
- http://localhost:3000/local

### 9. Redeploy en Vercel

```bash
git add .
git commit -m "chore: configurar variables de entorno"
git push
```

Vercel va a redesplegar automáticamente, ahora con las env vars correctas.

### 10. Seed en producción (opcional)

Podes correr el seed contra la BD de producción:

```bash
# En Neon Console > SQL Editor, ejecutar manualmente las tablas
# O bien usar Prisma Studio contra producción (no recomendado)
```

---

## Opción alternativa: Neon directo (para testing local rápido)

Si solo querés probar localmente sin desplegar aún:

1. Ir a console.neon.tech
2. Create Project → nombre: `coques-points-dev`
3. Copiar el **Connection string** (Direct, no pooled)
4. Pegar en `.env.local`
5. Continuar desde el paso 7 de arriba

**Cuando estés listo para producción**, seguir el flujo Vercel desde el paso 1.

---

## 🔒 Checklist de seguridad (antes de cada push)

- [ ] `.env.local` está en `.gitignore` ✅ (ya está)
- [ ] No hay DATABASE_URL hardcodeada en el código
- [ ] No hay secrets en archivos `.md` o comentarios
- [ ] Verificar con: `git diff --staged | grep -i "secret\|password\|napi_"`

---

## 📝 Cliente de prueba del seed

Después del seed tenés este cliente para testing:

```
Teléfono: +5491100000001
Nivel: Plata
Secret OTP: JBSWY3DPEHPK3PXP (para debugging)
```

Para activarlo y obtener el JWT, usar el endpoint `/api/clientes/:id/activar`

---

## 🐛 Problemas comunes

### Error "Invalid Database URL"
- Verificar que sea Direct URL, no pooled
- Verificar que tenga `?sslmode=require` al final

### Error "Token expired"
- Los tokens duran 30 días, volver a activar el cliente

### Error 500 en timezone
- Verificar que `TZ=America/Argentina/Buenos_Aires` esté en .env.local

### npm install falla
- Borrar `node_modules` y `package-lock.json`
- Ejecutar `npm install` de nuevo
