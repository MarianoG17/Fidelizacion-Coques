# 🔄 Sincronización Automática DeltaWash → Fidelización

## 📋 Propósito

Mantener sincronizados los estados de autos entre:
- **DeltaWash Legacy** (sistema del lavadero - solo lectura)
- **Base de Fidelización** (para que funcionen los beneficios automáticos)

---

## 🎯 ¿Por Qué Es Necesario?

### Problema
```
DeltaWash Legacy guarda: Auto ABC123 en proceso
                          ↓
Beneficio 20% busca en:  EstadoAuto (base Fidelización)
                          ↓
NO encuentra el auto → ❌ Beneficio NO se activa
```

### Solución
```
Job ejecuta cada 5 min
  ↓
Lee DeltaWash (solo lectura)
  ↓
Crea/actualiza EstadoAuto en Fidelización
  ↓
Beneficio detecta auto EN_PROCESO → ✅ Se activa automáticamente
```

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────┐
│   DeltaWash Legacy (Sistema Separado) │
│   - Empleados registran autos       │
│   - Estados: "en proceso", "listo"  │
│   - Base de datos independiente     │
└─────────────────────────────────────┘
         ↓ (Solo lectura cada 5 min)
┌─────────────────────────────────────┐
│   Job: /api/jobs/sincronizar-deltawash │
│   - Lee estados desde DeltaWash     │
│   - Normaliza formato               │
│   - Escribe en base Fidelización    │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│   Base de Fidelización              │
│   - Tabla: EstadoAuto               │
│   - Estados normalizados            │
│   - Beneficios se activan auto      │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│   Cliente ve en app de Coques       │
│   - Estado de su auto               │
│   - Beneficio 20% descuento activo  │
└─────────────────────────────────────┘
```

---

## ⚙️ Configuración

### 1. Variables de Entorno Necesarias

```env
# Base de datos principal (ya la tenés)
DATABASE_URL="postgresql://..."

# Base de datos DeltaWash Legacy (ya la tenés)
DELTAWASH_DATABASE_URL="postgresql://..."

# Secret para proteger el cron job (NUEVA)
CRON_SECRET="tu_secret_aleatorio_64_chars"
```

### 2. Generar CRON_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar el resultado y agregarlo en Vercel:
1. Settings → Environment Variables
2. Agregar: `CRON_SECRET` = (el valor generado)
3. Apply to: Production, Preview, Development

### 3. Verificar vercel.json

El archivo [`vercel.json`](vercel.json) ya está configurado con el cron:

```json
{
  "crons": [
    {
      "path": "/api/jobs/sincronizar-deltawash",
      "schedule": "*/5 * * * *"  // Cada 5 minutos
    }
  ]
}
```

---

## 🚀 Deploy e Instalación

### Paso 1: Commit y Push

```bash
cd fidelizacion-zona
git add .
git commit -m "feat: Sincronización automática DeltaWash → Fidelización

- Job que lee estados desde DeltaWash cada 5 min
- Crea/actualiza EstadoAuto en Fidelización
- Activa beneficios automáticamente
- Marca autos entregados cuando desaparecen de DeltaWash"

git push origin main
```

### Paso 2: Configurar CRON_SECRET en Vercel

1. Ir a Vercel Dashboard
2. Tu proyecto → Settings → Environment Variables
3. Add New
   - Name: `CRON_SECRET`
   - Value: (el secret generado)
   - Environments: Production, Preview, Development
4. Save

### Paso 3: Redeploy (si es necesario)

Vercel hace deploy automático, pero si querés forzar:
```bash
vercel --prod
```

### Paso 4: Verificar que el Cron Está Activo

1. Vercel Dashboard → Tu proyecto
2. Deployments → Production
3. Settings → Cron Jobs
4. Debería aparecer: `/api/jobs/sincronizar-deltawash` (cada 5 min)

---

## 🧪 Testing

### Probar Manualmente el Job

```bash
# Reemplazar con tu CRON_SECRET y URL
curl -H "Authorization: Bearer TU_CRON_SECRET" \
  https://tu-app.vercel.app/api/jobs/sincronizar-deltawash
```

**Respuesta esperada:**
```json
{
  "success": true,
  "timestamp": "2026-02-24T01:30:00.000Z",
  "estadisticas": {
    "autosEnDeltaWash": 5,
    "sincronizados": 5,
    "errores": 0,
    "marcadosEntregados": 2,
    "beneficiosActivados": 3
  },
  "beneficiosActivados": [
    "Juan Pérez: 20% descuento — Auto en lavadero",
    "María González: 20% descuento — Auto en lavadero",
    "Carlos López: 20% descuento — Auto en lavadero"
  ]
}
```

### Verificar en Base de Datos

```sql
-- Ver estados sincronizados
SELECT 
  c.nombre,
  c.phone,
  a.patente,
  ea.estado,
  ea."updatedAt"
FROM "EstadoAuto" ea
JOIN "Auto" a ON a.id = ea."autoId"
JOIN "Cliente" c ON c.id = a."clienteId"
WHERE ea.estado IN ('EN_PROCESO', 'LISTO')
ORDER BY ea."updatedAt" DESC;
```

### Verificar Beneficios Activados

```sql
-- Ver beneficios activos de clientes con autos en lavadero
SELECT 
  c.nombre,
  c.phone,
  a.patente,
  ea.estado,
  b.nombre as beneficio
FROM "Cliente" c
JOIN "Auto" a ON a."clienteId" = c.id
JOIN "EstadoAuto" ea ON ea."autoId" = a.id
JOIN "Nivel" n ON n.id = c."nivelId"
JOIN "NivelBeneficio" nb ON nb."nivelId" = n.id
JOIN "Beneficio" b ON b.id = nb."beneficioId"
WHERE ea.estado = 'EN_PROCESO'
  AND b.id = 'beneficio-20porciento-lavadero';
```

---

## 🔄 Cómo Funciona el Job

### 1. Lectura de DeltaWash (Solo Lectura)

```sql
-- Query que ejecuta
SELECT
  c.phone,
  e.patente,
  e.estado,
  e."updatedAt"
FROM "estado" e
JOIN "Cliente" c ON c.id = e."clienteId"
WHERE LOWER(e.estado) IN ('en proceso', 'listo')
```

### 2. Normalización

- **Patente:** `"ABC 123"` → `"ABC123"`
- **Estado:** `"en proceso"` → `"EN_PROCESO"`
- **Estado:** `"listo"` → `"LISTO"`

### 3. Sincronización a Fidelización

```typescript
// Para cada auto en DeltaWash:
// 1. Buscar cliente por teléfono
// 2. Buscar/crear auto
// 3. Crear/actualizar EstadoAuto
// 4. Si cambió a EN_PROCESO → Disparar beneficios
```

### 4. Limpieza

```typescript
// Autos que ya no están en DeltaWash
// → Marcar como ENTREGADO en Fidelización
```

---

## 📊 Logs y Monitoreo

### Ver Logs en Vercel

1. Vercel Dashboard → Tu proyecto
2. Deployments → Production
3. Functions
4. Buscar: `sincronizar-deltawash`
5. Ver logs de ejecución

### Logs Típicos

```
[Sync DeltaWash] Iniciando sincronización...
[Sync DeltaWash] Encontrados 5 autos activos en DeltaWash
[Sync DeltaWash] Auto ABC123 creado en Fidelización
[Sync DeltaWash] ✅ Beneficio activado para +5491112345678
[Sync DeltaWash] Auto XYZ789 marcado como ENTREGADO
[Sync DeltaWash] Sincronización completada: { sincronizados: 5, errores: 0 }
```

---

## 🐛 Troubleshooting

### El job no se ejecuta

**Verificar:**
1. ¿`CRON_SECRET` configurado en Vercel?
2. ¿`vercel.json` está en la raíz del proyecto?
3. ¿El deploy fue exitoso?

**Solución:**
```bash
# Re-deploy
git commit --allow-empty -m "trigger deploy"
git push origin main
```

### Beneficios no se activan

**Verificar:**
1. ¿El auto existe en DeltaWash con estado "en proceso"?
2. ¿El cliente está registrado en Fidelización con el MISMO teléfono?
3. ¿El beneficio existe en la base de datos?

**Query de diagnóstico:**
```sql
-- Ver si el auto llegó a Fidelización
SELECT * FROM "EstadoAuto" ea
JOIN "Auto" a ON a.id = ea."autoId"
WHERE a.patente = 'ABC123';  -- Reemplazar

-- Si no existe → El job no lo sincronizó todavía
-- Si existe con estado EN_PROCESO → El beneficio debería estar activo
```

### Errores de conexión a DeltaWash

**Causa:** `DELTAWASH_DATABASE_URL` incorrecta o DeltaWash no accesible

**Solución:**
1. Verificar URL en Vercel
2. Probar conexión manualmente
3. Verificar que DeltaWash permite conexiones desde Vercel (IP whitelisting)

---

## ⚙️ Configuración Avanzada

### Cambiar Frecuencia del Cron

Editar `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/sincronizar-deltawash",
      "schedule": "*/2 * * * *"  // Cada 2 minutos (más frecuente)
      // O
      "schedule": "*/10 * * * *" // Cada 10 minutos (menos frecuente)
    }
  ]
}
```

**Formato cron:**
- `*/5 * * * *` - Cada 5 minutos
- `0 * * * *` - Cada hora (minuto 0)
- `0 */6 * * *` - Cada 6 horas

### Deshabilitar Sincronización Temporalmente

**Opción 1:** Comentar en `vercel.json`
```json
{
  "crons": [
    // {
    //   "path": "/api/jobs/sincronizar-deltawash",
    //   "schedule": "*/5 * * * *"
    // }
  ]
}
```

**Opción 2:** Cambiar `CRON_SECRET` en Vercel (el job fallará auth)

---

## 📝 Checklist de Instalación

- [ ] `DELTAWASH_DATABASE_URL` configurada en Vercel
- [ ] `CRON_SECRET` generada y configurada en Vercel
- [ ] `vercel.json` con configuración de cron
- [ ] Código del job commiteado y pusheado
- [ ] Deploy exitoso en Vercel
- [ ] Cron visible en Vercel Dashboard
- [ ] Ejecutar script SQL del beneficio (si no lo hiciste)
- [ ] Probar manualmente el job con curl
- [ ] Verificar logs en Vercel
- [ ] Probar flujo completo: auto en DeltaWash → beneficio en app

---

## 🎁 Ventajas de Esta Solución

✅ **Sistemas separados:** DeltaWash y Fidelización no se mezclan  
✅ **Solo lectura:** DeltaWash nunca se modifica desde Fidelización  
✅ **Automático:** No requiere intervención manual  
✅ **Beneficios funcionan:** El código existente no necesita cambios  
✅ **Escalable:** Soporta múltiples autos y clientes  
✅ **Resiliente:** Si DeltaWash no responde, la app sigue funcionando  

---

**Implementado:** 2026-02-24  
**Autor:** Sistema de Fidelización Coques  
**Estado:** ✅ Listo para producción (requiere configuración de CRON_SECRET)
