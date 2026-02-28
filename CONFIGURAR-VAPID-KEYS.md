# 🔑 Configurar VAPID Keys en Vercel

## ✅ Pasos Completados

1. ✅ `npm install web-push` - Instalado
2. ✅ `npx prisma generate` - Cliente Prisma regenerado
3. ✅ VAPID Keys generadas

---

## 📋 Variables de Entorno para Vercel

### Ir a: [Vercel Dashboard](https://vercel.com) → Tu Proyecto → Settings → Environment Variables

Agregar las siguientes **4 variables**:

### 1. VAPID_PUBLIC_KEY
```
BGrFZJEsHUMGTMcN7CMi8IQS0CoO3MJeyXMTsT94aAk_B9gkd5B8of79EiM_itvU1wPhv4V3fIOgdllo851wV7s
```

### 2. VAPID_PRIVATE_KEY
```
LUwEgdMChNVTbIf6miAZFnbDG6yQe1f3JhgwYfDD_AA
```

### 3. VAPID_EMAIL
```
mariano@coquesbakery.com
```
_(O el email que prefieras usar para contacto)_

### 4. NEXT_PUBLIC_VAPID_PUBLIC_KEY
```
BGrFZJEsHUMGTMcN7CMi8IQS0CoO3MJeyXMTsT94aAk_B9gkd5B8of79EiM_itvU1wPhv4V3fIOgdllo851wV7s
```
_(Es la misma que VAPID_PUBLIC_KEY - se usa en el frontend)_

---

## 🗄️ Ejecutar Migración en Neon

### Opción A: Desde tu computadora
```bash
npx prisma migrate deploy
```

### Opción B: Desde Neon Console

1. Ir a [Neon Console](https://console.neon.tech)
2. Seleccionar tu proyecto
3. Ir a "SQL Editor"
4. Copiar y ejecutar el siguiente script:

```sql
-- Crear tabla ConfiguracionApp
CREATE TABLE "ConfiguracionApp" (
    "id" TEXT NOT NULL,
    "feedbackHabilitado" BOOLEAN NOT NULL DEFAULT true,
    "feedbackTiempoVisitaMinutos" INTEGER NOT NULL DEFAULT 10,
    "feedbackDiasPedidoTorta" INTEGER NOT NULL DEFAULT 1,
    "feedbackFrecuenciaDias" INTEGER NOT NULL DEFAULT 7,
    "feedbackMinEstrellas" INTEGER NOT NULL DEFAULT 4,
    "googleMapsUrl" TEXT NOT NULL DEFAULT 'https://maps.app.goo.gl/n6q5HNELZuwDyT556',
    "pushHabilitado" BOOLEAN NOT NULL DEFAULT true,
    "pushAutoListo" BOOLEAN NOT NULL DEFAULT true,
    "pushNuevoNivel" BOOLEAN NOT NULL DEFAULT true,
    "pushBeneficioDisponible" BOOLEAN NOT NULL DEFAULT true,
    "pushBeneficioVence" BOOLEAN NOT NULL DEFAULT true,
    "pushCumpleanos" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfiguracionApp_pkey" PRIMARY KEY ("id")
);

-- Insertar configuración por defecto
INSERT INTO "ConfiguracionApp" (
    "id",
    "feedbackHabilitado",
    "feedbackTiempoVisitaMinutos",
    "feedbackDiasPedidoTorta",
    "feedbackFrecuenciaDias",
    "feedbackMinEstrellas",
    "googleMapsUrl",
    "pushHabilitado",
    "pushAutoListo",
    "pushNuevoNivel",
    "pushBeneficioDisponible",
    "pushBeneficioVence",
    "pushCumpleanos",
    "updatedAt",
    "createdAt"
) VALUES (
    'default-config-001',
    true,
    10,
    1,
    7,
    4,
    'https://maps.app.goo.gl/n6q5HNELZuwDyT556',
    true,
    true,
    true,
    true,
    true,
    true,
    NOW(),
    NOW()
);

-- Verificar
SELECT * FROM "ConfiguracionApp";
```

---

## 🚀 Deploy a Vercel

Después de configurar las variables de entorno:

```bash
git add .
git commit -m "feat: Sistema completo de feedback y push notifications"
git push origin main
```

Vercel desplegará automáticamente con las nuevas variables de entorno.

---

## ✅ Verificar Funcionamiento

### 1. Panel Admin
- Ir a `/admin` → Pestaña "Configuración"
- Debería mostrar el panel de configuración
- Hacer clic en "🔔 Enviar Push de Prueba"

### 2. Push Notifications
- Abrir la app en un navegador compatible (Chrome Android/Desktop)
- Esperar 5 segundos después de login
- Debería aparecer el prompt de notificaciones
- Activar y verificar que se guarde la suscripción

### 3. Feedback Modal
- Registrar una visita con QR/OTP
- Esperar 10 minutos
- Debería aparecer el modal de feedback

---

## 🔐 Seguridad

⚠️ **IMPORTANTE**: 
- **NUNCA** compartir la `VAPID_PRIVATE_KEY` públicamente
- Estas keys son únicas para tu aplicación
- Si se comprometen, generar nuevas y reconfigurar

---

## 📝 Notas

- Los errores de TypeScript que había se resolvieron con `npx prisma generate`
- El Service Worker se actualizó a versión v4
- Los usuarios existentes recibirán actualización automática
- La configuración por defecto ya tiene valores sensatos

---

## 🎯 Sistema Completo

Una vez configurado, el sistema enviará automáticamente:
- 🚗 Push cuando auto esté listo (DeltaWash)
- 🥇 Push al subir de nivel
- 🎁 Push cuando se activa un beneficio
- ⭐ Feedback post-visita (10 min después)
- ⭐ Feedback post-pedido torta (1 día después)

Todo configurable desde `/admin` → Configuración.
