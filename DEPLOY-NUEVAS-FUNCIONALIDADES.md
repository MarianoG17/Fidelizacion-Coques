# 🚀 Deploy de Nuevas Funcionalidades - Paso a Paso

## 📋 Resumen de Cambios

### Backend Implementado
- ✅ Schema actualizado con nuevos campos (referidos, feedback, cumpleaños, logros)
- ✅ Migración SQL lista (`20260213_add_nuevas_funcionalidades`)
- ✅ 5 APIs nuevas creadas con logs completos
- ✅ Sistema de 3 niveles (Bronce, Plata, Oro)
- ✅ PWA configurada (instalable en móviles)
- ✅ 13 logros de gamificación definidos

### Archivos Modificados/Creados
```
prisma/schema.prisma (actualizado)
prisma/migrations/20260213_add_nuevas_funcionalidades/migration.sql (nuevo)
scripts/seed-3-niveles.sql (nuevo)
scripts/seed-beneficios-logros.sql (nuevo)
src/types/index.ts (actualizado)
src/lib/auth.ts (agregado verificarToken())
src/app/layout.tsx (service worker registrado)
src/app/api/referidos/route.ts (nuevo)
src/app/api/feedback/route.ts (nuevo)
src/app/api/historial/route.ts (nuevo)
src/app/api/logros/route.ts (nuevo)
src/app/api/perfil/route.ts (nuevo)
public/sw.js (nuevo)
public/manifest.json (ya existía, sin cambios)
```

---

## 🔧 PASO 1: Preparación Local

### 1.1 Verificar que el servidor local funcione
```bash
cd fidelizacion-zona
npm run dev
```
✅ Debe compilar sin errores TypeScript

### 1.2 Verificar archivos críticos
```bash
# Verificar que existan los archivos nuevos
ls src/app/api/referidos/route.ts
ls src/app/api/feedback/route.ts
ls src/app/api/historial/route.ts
ls src/app/api/logros/route.ts
ls src/app/api/perfil/route.ts
ls prisma/migrations/20260213_add_nuevas_funcionalidades/migration.sql
ls scripts/seed-3-niveles.sql
ls scripts/seed-beneficios-logros.sql
ls public/sw.js
```

---

## 📦 PASO 2: Commit y Push

### 2.1 Revisar cambios
```bash
git status
git diff
```

### 2.2 Agregar archivos
```bash
git add .
```

### 2.3 Commit con mensaje descriptivo
```bash
git commit -m "feat: Nuevas funcionalidades - Referidos, Feedback, Gamificación, PWA

- Schema actualizado con campos de referidos, feedback, cumpleaños
- Migración 20260213_add_nuevas_funcionalidades lista
- APIs creadas: /api/referidos, /api/feedback, /api/historial, /api/logros, /api/perfil
- Sistema ajustado a 3 niveles (Bronce, Plata, Oro)
- PWA configurada con service worker
- 13 logros de gamificación definidos
- Logs completos en todas las APIs
- Google Maps link configurado: https://maps.app.goo.gl/9Djh6rCHD7jkzcqS6"
```

### 2.4 Push a repositorio
```bash
git push origin main
```

---

## 🌐 PASO 3: Deploy en Vercel

### 3.1 Opción A: Deploy Automático
Si tienes GitHub conectado a Vercel, el deploy se iniciará automáticamente al hacer push.

**Verificar en**: https://vercel.com/tu-cuenta/fidelizacion-coques/deployments

### 3.2 Opción B: Deploy Manual
```bash
cd fidelizacion-zona
npx vercel --prod
```

### 3.3 Esperar Confirmación
✅ El deploy debe completarse exitosamente
✅ URL de producción: https://fidelizacion-coques-813u.vercel.app

---

## 🗄️ PASO 4: Aplicar Migraciones en Base de Datos

### 4.1 Conectarse a Neon SQL Editor
1. Ir a: https://console.neon.tech
2. Seleccionar el proyecto de Fidelización
3. Click en "SQL Editor"

### 4.2 Ejecutar Migración Principal
**Copiar y pegar el contenido de:**
`prisma/migrations/20260213_add_nuevas_funcionalidades/migration.sql`

```sql
-- Migration: Nuevas funcionalidades (Referidos, Feedback, Gamificación, Cumpleaños)

-- Agregar nuevos campos a Cliente
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "fechaCumpleanos" TIMESTAMP(3);
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "codigoReferido" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "referidoPorId" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "referidosActivados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "resetPasswordExpires" TIMESTAMP(3);

-- ... [resto del contenido del archivo]
```

✅ Click en "Run" y verificar: **Success**

### 4.3 Ejecutar Seed de 3 Niveles
**Copiar y pegar el contenido de:**
`scripts/seed-3-niveles.sql`

```sql
-- Script para configurar 3 niveles (Bronce, Plata, Oro) con beneficios específicos
-- ... [contenido completo del archivo]
```

✅ Click en "Run" y verificar: **Success**

### 4.4 Ejecutar Seed de Logros
**Copiar y pegar el contenido de:**
`scripts/seed-beneficios-logros.sql`

```sql
-- Script para actualizar descripciones de beneficios por nivel y crear logros
-- ... [contenido completo del archivo]
```

✅ Click en "Run" y verificar: **Success**

### 4.5 Verificar Tablas Creadas
```sql
-- Verificar que las nuevas tablas existan
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Feedback', 'Logro', 'LogroCliente');

-- Debería retornar 3 filas
```

### 4.6 Verificar Campos Nuevos en Cliente
```sql
-- Verificar que los campos nuevos existan
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Cliente' 
AND column_name IN ('fechaCumpleanos', 'codigoReferido', 'referidoPorId', 'referidosActivados');

-- Debería retornar 4 filas
```

### 4.7 Verificar Logros Creados
```sql
-- Verificar que se crearon los 13 logros
SELECT COUNT(*) as total_logros FROM "Logro";

-- Debería retornar: total_logros = 13 (o más si agregaste extras)
```

### 4.8 Verificar Niveles (3 niveles)
```sql
-- Verificar que haya 3 niveles con descripciones
SELECT nombre, orden, descripcionBeneficios FROM "Nivel" ORDER BY orden;

-- Debería retornar 3 filas: Bronce, Plata, Oro
```

---

## ✅ PASO 5: Verificación en Producción

### 5.1 Verificar PWA
1. Abrir en móvil: https://fidelizacion-coques-813u.vercel.app
2. Debería aparecer banner "Agregar a pantalla de inicio"
3. Instalar la app
4. Abrir desde el ícono → Debe verse como app nativa

### 5.2 Verificar API de Perfil
```bash
# Obtener token de un cliente (login)
curl -X POST https://fidelizacion-coques-813u.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"tu-password"}'

# Usar el token para obtener perfil
curl https://fidelizacion-coques-813u.vercel.app/api/perfil \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Respuesta esperada:**
```json
{
  "data": {
    "nombre": "...",
    "email": "...",
    "phone": "...",
    "fechaCumpleanos": null,
    "codigoReferido": "ABC12345",
    "referidosActivados": 0,
    "estado": "ACTIVO",
    "miembroDesde": "2024-...",
    "nivel": {
      "nombre": "Bronce",
      "orden": 1,
      "descripcionBeneficios": "🥤 Vaso de agua..."
    }
  }
}
```

### 5.3 Verificar API de Logros
```bash
curl https://fidelizacion-coques-813u.vercel.app/api/logros \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Respuesta esperada:**
```json
{
  "data": {
    "obtenidos": [],
    "disponibles": [
      {
        "id": "...",
        "nombre": "Primera Visita",
        "icono": "👋",
        "puntosXp": 10
      }
      // ... 12 logros más
    ],
    "totalXp": 0,
    "logrosNoVistos": 0
  }
}
```

### 5.4 Verificar API de Historial
```bash
curl https://fidelizacion-coques-813u.vercel.app/api/historial \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Respuesta esperada:**
```json
{
  "data": {
    "historial": [
      // array de visitas anteriores
    ],
    "pagination": {
      "total": 0,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### 5.5 Verificar API de Referidos
```bash
curl https://fidelizacion-coques-813u.vercel.app/api/referidos \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Respuesta esperada:**
```json
{
  "data": {
    "codigoReferido": "ABC12345",
    "referidosActivados": 0,
    "referidos": []
  }
}
```

### 5.6 Verificar API de Feedback (POST)
```bash
curl -X POST https://fidelizacion-coques-813u.vercel.app/api/feedback \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"calificacion":5,"comentario":"Excelente servicio"}'
```

**Respuesta esperada (calificación ≥ 4):**
```json
{
  "data": {
    "feedback": {
      "id": "...",
      "calificacion": 5
    },
    "googleMapsUrl": "https://maps.app.goo.gl/9Djh6rCHD7jkzcqS6",
    "message": "¡Gracias por tu calificación! Te invitamos a compartir tu experiencia en Google Maps"
  }
}
```

---

## 📊 PASO 6: Verificar Logs en Vercel

### 6.1 Abrir Panel de Logs
1. Ir a: https://vercel.com/tu-cuenta/fidelizacion-coques/logs
2. Filtrar por "Runtime Logs"

### 6.2 Buscar Logs de las Nuevas APIs
Deberías ver logs como:
```
[API /api/perfil GET] Iniciando petición
[API /api/perfil GET] Cliente autenticado: abc-123-def
[API /api/perfil GET] Perfil encontrado para: Juan Perez
[API /api/perfil GET] Completado en 145ms
```

### 6.3 Verificar que NO hay errores
❌ Si ves errores de Prisma Client, significa que falta regenerar:
```bash
cd fidelizacion-zona
npx prisma generate
git add .
git commit -m "chore: regenerar prisma client"
git push
```

---

## 🎯 PASO 7: Prueba End-to-End en Producción

### Escenario de Prueba: Cliente Nuevo con Referido

1. **Cliente A se registra**
   - Entrar a: https://fidelizacion-coques-813u.vercel.app/activar
   - Registrarse con teléfono, email, password
   - Activar cuenta

2. **Cliente A obtiene su código de referido**
   - Login en: https://fidelizacion-coques-813u.vercel.app/login
   - Ir a `/pass`
   - Ver código de referido (ej: JUAN2024)

3. **Cliente B se registra con código de A**
   - URL: `https://fidelizacion-coques-813u.vercel.app/activar?ref=JUAN2024`
   - Registrarse
   - Activar cuenta

4. **Verificar que A tiene 1 referido activado**
   - Cliente A hace GET a `/api/referidos`
   - `referidosActivados` debería ser `1`

5. **Cliente A deja feedback positivo**
   - POST a `/api/feedback` con `calificacion: 5`
   - Debe recibir link de Google Maps
   - Cliente A debería obtener logro "Crítico Positivo"

6. **Verificar logro obtenido**
   - Cliente A hace GET a `/api/logros`
   - `obtenidos` debería contener "Crítico Positivo"
   - `totalXp` debería ser `15`

---

## 🔥 PASO 8: Monitoreo Post-Deploy

### 8.1 Crear Dashboard de Monitoreo
En Neon SQL Editor, guardar estas queries:

```sql
-- 1. Total de feedbacks por calificación
SELECT calificacion, COUNT(*) as cantidad 
FROM "Feedback" 
GROUP BY calificacion 
ORDER BY calificacion DESC;

-- 2. Top referidores
SELECT 
  c.nombre,
  c.codigoReferido,
  c.referidosActivados
FROM "Cliente" c
WHERE c.referidosActivados > 0
ORDER BY c.referidosActivados DESC
LIMIT 10;

-- 3. Logros más obtenidos
SELECT 
  l.nombre,
  l.icono,
  COUNT(lc.id) as veces_obtenido
FROM "Logro" l
LEFT JOIN "LogroCliente" lc ON l.id = lc."logroId"
GROUP BY l.id, l.nombre, l.icono
ORDER BY veces_obtenido DESC;

-- 4. Clientes por nivel
SELECT 
  n.nombre as nivel,
  COUNT(c.id) as clientes
FROM "Nivel" n
LEFT JOIN "Cliente" c ON n.id = c."nivelId"
GROUP BY n.nombre, n.orden
ORDER BY n.orden;

-- 5. Clientes que aún no pusieron cumpleaños
SELECT COUNT(*) as sin_cumpleanos
FROM "Cliente"
WHERE "fechaCumpleanos" IS NULL
AND estado = 'ACTIVO';
```

### 8.2 Verificar Performance de APIs
En Vercel Logs, buscar tiempos de respuesta:
- APIs deberían completarse en < 500ms
- Si > 1000ms, revisar queries de Prisma

---

## 📝 PASO 9: Actualizar Documentación

### 9.1 Actualizar README.md
Agregar sección de nuevas features:
```markdown
## 🎉 Nuevas Funcionalidades

- 🤝 **Sistema de Referidos**: Invita amigos y sube de nivel
- ⭐ **Feedback con Google Maps**: Califica tu experiencia
- 🏆 **Gamificación**: 13 logros para desbloquear
- 📱 **PWA**: Instala la app en tu celular
- 🎂 **Descuentos de Cumpleaños**: 20% off en tortas
- 📊 **Historial Completo**: Ve todas tus visitas
```

### 9.2 Crear CHANGELOG.md
```markdown
# Changelog

## [2.0.0] - 2024-02-13

### Added
- Sistema de referidos con códigos únicos
- API de feedback con redirect a Google Maps
- 13 logros de gamificación
- PWA instalable en móviles
- Historial completo de visitas
- Perfiles con fecha de cumpleaños
- Sistema de 3 niveles (antes eran 4)

### Changed
- Niveles reducidos de 4 a 3 (eliminado Platino)
- Service worker agregado para PWA

### Fixed
- Logs completos en todas las APIs
```

---

## ✅ CHECKLIST FINAL

### Pre-Deploy
- [x] Schema actualizado
- [x] Migración SQL creada
- [x] APIs creadas con logs
- [x] PWA configurada
- [x] Service worker creado
- [x] Tipos TypeScript actualizados

### Deploy
- [ ] Código pusheado a GitHub
- [ ] Deploy en Vercel completado
- [ ] Migración aplicada en Neon
- [ ] Seed de 3 niveles ejecutado
- [ ] Seed de logros ejecutado

### Verificación
- [ ] PWA instalable en móvil
- [ ] API `/api/perfil` funciona
- [ ] API `/api/logros` funciona
- [ ] API `/api/historial` funciona
- [ ] API `/api/referidos` funciona
- [ ] API `/api/feedback` funciona
- [ ] Logs visibles en Vercel
- [ ] No hay errores en consola

### Post-Deploy
- [ ] Prueba end-to-end completada
- [ ] Dashboard de monitoreo creado
- [ ] Documentación actualizada
- [ ] CHANGELOG creado

---

## 🆘 Troubleshooting

### Error: "Property 'feedback' does not exist on type 'PrismaClient'"
**Solución:**
```bash
cd fidelizacion-zona
npx prisma generate
git add .
git commit -m "chore: regenerar prisma client después de migración"
git push
```

### Error: "Column 'fechaCumpleanos' does not exist"
**Causa**: No se aplicó la migración en la base de datos
**Solución**: Ejecutar PASO 4 completo

### Error: Service Worker no registra
**Causa**: Puede ser cache del navegador
**Solución**:
1. Abrir DevTools
2. Application > Service Workers
3. Click en "Unregister"
4. Refrescar página (Ctrl+F5)

### PWA no aparece para instalar
**Solución**:
1. Verificar que `manifest.json` esté accesible
2. Verificar HTTPS (Vercel siempre usa HTTPS)
3. Probar en navegador móvil (Safari iOS, Chrome Android)

---

## 📞 Siguiente Paso Después del Deploy

Una vez verificado que todo funciona en producción:

1. **Crear Frontend** para las nuevas funcionalidades:
   - Página de perfil con edición
   - Sección de referidos en `/pass`
   - Modal de feedback después de visitas
   - Página de historial
   - Sección de logros/gamificación

2. **Implementar Recuperación de Contraseña** con Resend

3. **Actualizar lógica de registro** para manejar referidos automáticamente

---

**¡Listo para deploy!** 🚀
