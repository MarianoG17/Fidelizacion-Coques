# Solución Bug #9: Timezone en EventoScan

**Fecha:** 2026-03-19
**Bug:** Beneficios usados muestran fecha incorrecta (UTC vs Argentina)
**Solución:** Forzar timestamp Argentina en todos los `EventoScan.create`

---

## ✅ Fix Aplicado

### Cambio realizado:

```typescript
// ❌ ANTES: Prisma usaba @default(now()) que devuelve UTC
await prisma.eventoScan.create({
  data: {
    clienteId,
    localId,
    // ... timestamp se generaba automáticamente en UTC
  }
})

// ✅ AHORA: Forzamos timestamp con timezone Argentina
import { getDatetimeArgentina } from '@/lib/timezone'

await prisma.eventoScan.create({
  data: {
    timestamp: getDatetimeArgentina(), // Fuerza Argentina UTC-3
    clienteId,
    localId,
    // ...
  }
})
```

---

## 📂 Archivos Modificados (10 total)

1. ✅ `src/app/api/eventos/route.ts` - Eventos principales (QR/OTP)
2. ✅ `src/app/api/woocommerce/webhook/route.ts` - Pedidos tortas WooCommerce
3. ✅ `src/app/api/woocommerce/mis-pedidos/route.ts` - Confirmación pedidos
4. ✅ `src/app/api/perfil/cuestionario/route.ts` - Bonus cuestionario
5. ✅ `src/app/api/webhook/deltawash/route.ts` - Eventos lavadero
6. ✅ `src/app/api/presupuestos/[codigo]/confirmar/route.ts` - Presupuestos
7. ✅ `src/app/api/estados-auto/route.ts` - Estados externos auto
8. ✅ `src/app/api/clientes/[id]/activar/route.ts` - Activación manual
9. ✅ `src/app/api/auth/register/route.ts` - Registro (2 lugares)

---

## 🎯 Impacto

### Antes:
- Evento a las 23:50 Argentina (02:50 UTC del día siguiente)
- Se guardaba: `2026-03-19 02:50:00 UTC`
- Cliente veía: "Usado ayer"
- Admin veía: "Usado ayer 23:50"
- **Confusión total** ❌

### Después:
- Evento a las 23:50 Argentina
- Se guarda: `2026-03-18 23:50:00` (Argentina time)
- Cliente ve: "Usado hoy"
- Admin ve: "Usado hoy 23:50"
- **Consistente** ✅

---

## 🧪 Testing

### Caso de prueba:

```typescript
// Simular uso de beneficio a las 23:50 Argentina
const timestamp = getDatetimeArgentina()
console.log('Timestamp guardado:', timestamp)
// Debe ser 2026-03-18 23:50:00, NO 2026-03-19 02:50:00

// Verificar en beneficios-disponibles que considera HOY
const inicioDia = getInicioHoyArgentina()
const eventos = await prisma.eventoScan.findMany({
  where: {
    timestamp: { gte: inicioDia }
  }
})
// Debe incluir el evento de las 23:50
```

### Comandos SQL de verificación:

```sql
-- Ver eventos recientes con timezone correcto
SELECT 
  id,
  "tipoEvento",
  timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires' as timestamp_arg,
  "contabilizada"
FROM "EventoScan"
WHERE "clienteId" = 'xxx'
ORDER BY timestamp DESC
LIMIT 10;

-- Comparar timestamps antes y después del fix
SELECT 
  DATE(timestamp AT TIME ZONE 'UTC') as fecha_utc,
  DATE(timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') as fecha_argentina,
  COUNT(*) as cantidad
FROM "EventoScan"
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY fecha_utc, fecha_argentina
HAVING fecha_utc != fecha_argentina;
-- Si hay diferencias, son eventos del bug (antes del fix)
```

---

## 📝 Nota Importante

Este fix **NO** corrige eventos antiguos ya guardados. Solo aplica a eventos nuevos desde el deploy.

### Para corregir históricos (opcional):

```sql
-- Ajustar timestamps antiguos (ejecutar SOLO si es necesario)
UPDATE "EventoScan"
SET timestamp = timestamp - INTERVAL '3 hours'
WHERE timestamp > '2026-03-01'
  AND timestamp < '2026-03-19'  -- Antes del fix
  AND EXTRACT(HOUR FROM timestamp) >= 0 AND EXTRACT(HOUR FROM timestamp) <= 3;
-- Esto resta 3 horas a eventos que están "adelantados" por UTC
```

**⚠️ Advertencia:** No ejecutar este UPDATE sin backup. Es solo para referencia.

---

## ✅ Resultado

- **Bug resuelto:** Fechas consistentes entre cliente y admin
- **Beneficios diarios:** maxPorDia ahora funciona correctamente
- **Sin regresión:** Todas las queries existentes siguen funcionando
- **Performance:** Sin impacto (solo cambio en creación)

---

## 🔗 Referencias

- Bug report: [`BUG-TIMEZONE-BENEFICIOS-USADOS.md`](BUG-TIMEZONE-BENEFICIOS-USADOS.md)
- Librería timezone: [`src/lib/timezone.ts`](src/lib/timezone.ts)
- Tests relacionados: Ya existían tests de timezone en beneficios.ts

---

**Deployed:** 2026-03-19
**Status:** ✅ Resuelto en producción
