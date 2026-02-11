# Fidelización Zona

Sistema de fidelización y experiencia de zona para Coques + Lavadero.

## Stack

- **Next.js 14** (App Router) — frontend + API Routes
- **PostgreSQL en Neon** — base de datos
- **Prisma** — ORM
- **otplib** — TOTP para QR dinámico
- **Vercel** — deploy

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local` con:
- `DATABASE_URL` de Neon (panel → Connection string)
- `JWT_SECRET` generado con `openssl rand -base64 32`
- `LAVADERO_API_KEY` generado con `openssl rand -hex 32`

### 3. Generar VAPID keys para Push web (Fase 3)

```bash
npx web-push generate-vapid-keys
```

Copiar las keys al `.env.local`.

### 4. Inicializar la base de datos

```bash
npm run db:push      # crear tablas en Neon
npm run db:seed      # cargar datos iniciales (niveles, locales, mesas)
```

### 5. Correr en desarrollo

```bash
npm run dev
```

## URLs

| Ruta | Descripción |
|------|-------------|
| `/pass` | Pass del cliente (PWA) |
| `/activar` | Activación / onboarding del cliente |
| `/local` | App del local (empleados Coques) |
| `/lavadero` | Panel del lavadero |

## API Keys de desarrollo (del seed)

```
Coques:    coques-api-key-dev-change-in-prod
Lavadero:  lavadero-api-key-dev-change-in-prod
```

**Cambiar en producción.**

## API — uso rápido

### Validar OTP (desde App de Local)
```bash
curl -X POST http://localhost:3000/api/otp/validar \
  -H "Content-Type: application/json" \
  -H "X-Local-Api-Key: coques-api-key-dev-change-in-prod" \
  -d '{"otp": "123456"}'
```

### Actualizar estado del auto (desde Lavadero)
```bash
curl -X POST http://localhost:3000/api/estados-auto \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: lavadero-api-key-dev-change-in-prod" \
  -d '{"phone": "+5491100000001", "estado": "EN_LAVADO", "patente": "AB123CD"}'
```

### Registrar evento (desde App de Local, post-validación)
```bash
curl -X POST http://localhost:3000/api/eventos \
  -H "Content-Type: application/json" \
  -H "X-Local-Api-Key: coques-api-key-dev-change-in-prod" \
  -d '{
    "clienteId": "uuid-del-cliente",
    "tipoEvento": "VISITA",
    "metodoValidacion": "OTP_MANUAL"
  }'
```

## Deploy en Vercel

1. Push al repo
2. Conectar en Vercel
3. Agregar variables de entorno en Vercel Dashboard
4. Agregar `NEXT_PUBLIC_LOCAL_API_KEY` (la API key de Coques) para la App del Local
5. `npm run db:seed` contra la DB de producción

## Estructura

```
src/
├── app/
│   ├── api/
│   │   ├── clientes/       # CRUD clientes, activación
│   │   ├── otp/            # Generar y validar OTP
│   │   ├── eventos/        # EventoScan
│   │   ├── estados-auto/   # Estados del lavadero
│   │   ├── mesas/          # Layout mesas
│   │   └── pass/           # Datos del Pass del cliente
│   ├── pass/               # PWA del cliente
│   ├── activar/            # Onboarding
│   ├── local/              # App del local (empleados)
│   └── lavadero/           # Panel lavadero
├── lib/
│   ├── prisma.ts           # Cliente Prisma singleton
│   ├── auth.ts             # JWT + API Key auth
│   ├── otp.ts              # TOTP (generar, validar)
│   └── beneficios.ts       # Lógica de beneficios y niveles
└── types/
    └── index.ts            # Tipos compartidos
```

## Roadmap

- [x] Fase 1: Core MVP (clientes, OTP, eventos, mesas)
- [x] Fase 2: Niveles y beneficios
- [x] Fase 3: Lavadero + estados del auto
- [ ] Fase 4: Push web + WhatsApp
- [ ] Fase 5: Panel admin + métricas
- [ ] Futuro: Módulo seguros (pre-cotización)

---

## 🚀 Deploy en Vercel + Neon (secuencia correcta)

> Aprendida a las malas — seguir este orden exacto para evitar el deploy fallido.

### 1. Preparar y subir a GitHub
```bash
git init
git add .
git commit -m "feat: scaffold inicial coques-points"
git remote add origin https://github.com/TU_USUARIO/fidelizacion-zona.git
git push -u origin main
```

### 2. Importar en Vercel
- Ir a vercel.com/new → importar repo
- **NO agregar variables de entorno todavía**
- Click Deploy → va a fallar (normal, falta la BD)

### 3. Crear Neon PostgreSQL en Vercel
- En el proyecto → pestaña Storage → Create Database → Postgres
- Nombre: `coques-points-db`
- Vercel agrega `DATABASE_URL` automáticamente
- ⚠️ En Neon Console: usar **Connection string directa** (no pooled)
  - Pooled URL tiene `pooler.neon.tech` — evitar
  - Direct URL tiene solo `neon.tech`

### 4. Agregar variables restantes en Vercel
```
JWT_SECRET     → generar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ADMIN_KEY      → generar igual
JOB_SECRET     → generar igual
```

### 5. Redeploy + migrar schema
```bash
# Opción A: Vercel redeploy automático al hacer push
git commit --allow-empty -m "chore: trigger redeploy after env setup"
git push

# Opción B: En Neon Console > SQL Editor, correr manualmente:
# (copiar el output de: npx prisma generate && npx prisma migrate dev --name init)
```

### 6. Seed inicial
```bash
npx prisma db seed  # crea niveles, locales y cliente de prueba
```

---

## 🔒 Seguridad — Checklist antes de cada commit

- [ ] No hay API keys o passwords en el código
- [ ] `.env.local` está en `.gitignore`
- [ ] No hay `console.log()` con datos sensibles
- [ ] Verificar con: `git diff --staged | grep -i "secret\|password\|api_key\|napi_"`

> **Lección vivida:** Una API key de Neon quedó expuesta en un archivo .md
> y se subió a GitHub. Vercel y GitHub la detectaron automáticamente.
> Revocar y regenerar lleva 30 minutos. Prevenirlo lleva 30 segundos.

---

## 📋 Archivos clave para RooCode/Antigravity

Al empezar una sesión de desarrollo, darle a RooCode estos archivos como contexto:

1. **`REGLAS.md`** — reglas de negocio completas (el más importante)
2. **`APRENDIZAJES.md`** — patrones y errores a evitar
3. **`prisma/schema.prisma`** — modelo de datos actual
4. El archivo específico en el que vas a trabajar

