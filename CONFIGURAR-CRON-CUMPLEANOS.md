# ⏰ Configurar Cron Job para Notificaciones de Cumpleaños

## 📦 Job Creado

**Endpoint:** `GET /api/jobs/notificaciones-cumpleanos`

**Ubicación:** [`src/app/api/jobs/notificaciones-cumpleanos/route.ts`](src/app/api/jobs/notificaciones-cumpleanos/route.ts)

## 🎯 Funcionalidad

- Busca clientes con cumpleaños HOY (día exacto)
- Envía notificación: "🎂 ¡Feliz cumpleaños! Disfrutá tu 15% de descuento durante 7 días 🎉"
- Verifica que no se envíe duplicado en el mismo año
- Respeta configuración `pushCumpleanos` en panel admin

## 🔧 Configuración en Vercel

### Opción 1: Vercel Cron (Recomendada)

**1. Crear archivo `vercel.json` en la raíz:**

```json
{
  "crons": [{
    "path": "/api/jobs/notificaciones-cumpleanos",
    "schedule": "0 9 * * *"
  }]
}
```

**Schedule:** `0 9 * * *` = Todos los días a las 9:00 AM (UTC)

**Nota:** Vercel usa UTC, así que 9:00 UTC = 6:00 AM Argentina (UTC-3)

**Para que sea 9:00 AM Argentina:**
```json
"schedule": "0 12 * * *"
```
(12:00 UTC = 9:00 AM Argentina)

**2. Pushear cambios:**
```bash
git add vercel.json
git commit -m "Add: Cron job para notificaciones de cumpleaños"
git push origin main
```

**3. Verificar en Vercel Dashboard:**
- Settings → Cron Jobs
- Verás el job configurado

---

### Opción 2: EasyCron (Gratis, Externo)

**1. Crear cuenta en [EasyCron](https://www.easycron.com)**

**2. Crear nuevo Cron Job:**
- URL: `https://tu-dominio.vercel.app/api/jobs/notificaciones-cumpleanos`
- Cron Expression: `0 9 * * *`
- Timezone: `America/Argentina/Buenos_Aires`
- Method: GET

**3. Opcional: Agregar autenticación**
```typescript
// En route.ts, agregar:
const authToken = req.headers.get('x-cron-token')
if (authToken !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**En EasyCron:**
- Headers: `x-cron-token: tu-secreto`

**En Vercel:**
- Environment Variables: `CRON_SECRET=tu-secreto`

---

### Opción 3: GitHub Actions (Gratis)

**Crear `.github/workflows/cumpleanos-cron.yml`:**

```yaml
name: Notificaciones de Cumpleaños
on:
  schedule:
    - cron: '0 12 * * *'  # 12:00 UTC = 9:00 AM Argentina
  workflow_dispatch:  # Permite ejecución manual

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Birthday Notifications
        run: |
          curl -X GET https://tu-dominio.vercel.app/api/jobs/notificaciones-cumpleanos
```

---

## 🧪 Prueba Manual

### Desde Terminal:
```bash
curl https://tu-dominio.vercel.app/api/jobs/notificaciones-cumpleanos
```

### Respuesta esperada:
```json
{
  "success": true,
  "message": "Job ejecutado correctamente",
  "fecha": "2026-03-20T12:00:00.000Z",
  "clientesConCumpleanos": 2,
  "enviadas": 2,
  "yaEnviadas": 0,
  "pendientes": 0
}
```

---

## 📊 Monitoreo

**Ver logs en Vercel:**
```
Vercel Dashboard → Functions → /api/jobs/notificaciones-cumpleanos
```

**Buscar en logs:**
```
[Job Cumpleaños] Buscando cumpleaños para: 20/3
[Job Cumpleaños] Encontrados 2 clientes con cumpleaños hoy
[Job Cumpleaños] ✅ Notificación enviada a Juan Pérez
```

---

## ✅ Checklist de Configuración

- [ ] Habilitar `pushCumpleanos` en panel admin (`/admin/configuracion`)
- [ ] Configurar beneficio de cumpleaños con:
  - `requiereFechaCumpleanos: true`
  - `diasAntes: 3`
  - `diasDespues: 3`
  - `porcentajeDescuento: 15`
  - `diasMinimosEntreUsos: 1` (una vez por día)
- [ ] Configurar cron (Vercel, EasyCron o GitHub Actions)
- [ ] Probar ejecución manual del endpoint
- [ ] Verificar que clientes tengan `fechaCumpleanos` cargada
- [ ] Verificar que clientes tengan `pushSub` (notificaciones habilitadas)

---

## 🎂 Flujo Completo

1. **Día -3:** Cliente ve beneficio disponible (backend lo detecta automáticamente)
2. **Día 0 (cumpleaños) a las 9 AM:** Job envía notificación push
3. **Días 0 a +3:** Cliente puede usar beneficio 15% OFF (1 vez por día)
4. **Día +4:** Beneficio expira automáticamente

---

## 🐛 Troubleshooting

### No se envían notificaciones

1. Verificar que `pushCumpleanos` esté habilitado
2. Verificar que cliente tenga `pushSub` (notificaciones activadas)
3. Verificar que cliente tenga `fechaCumpleanos` cargada
4. Verificar logs en Vercel para ver errores

### Se envía duplicado

- El job verifica `notificación.tipo = 'CUMPLEANOS'` del mismo año
- Si se envió duplicado, revisar la query de verificación

### Hora incorrecta

- Ajustar cron schedule según timezone
- Vercel usa UTC por defecto
- Argentina es UTC-3

---

## 📝 Notas Adicionales

- El job NO requiere autenticación por defecto
- Para producción, se recomienda agregar `x-cron-token`
- El beneficio se activa automáticamente (no necesita job)
- El job solo envía la notificación para informar al cliente
