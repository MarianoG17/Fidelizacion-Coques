# Instrucciones para Claude Code

## ⚠️ TIMEZONE — NO MODIFICAR

Los timestamps en la base de datos (`EventoScan.timestamp`, `createdAt`, etc.) están almacenados como **hora local Argentina en formato UTC**. Esto significa que el valor UTC en la BD ya ES la hora argentina, no hay que convertir.

**Regla fija:** En todos los componentes del admin, los formateos de fecha deben usar `timeZone: 'UTC'`. **NUNCA cambiar a `America/Argentina/Buenos_Aires`** — eso restaría 3 horas de más y mostraría horarios incorrectos.

Archivos afectados:
- `src/app/admin/components/Clientes.tsx` → `formatearFecha()`
- `src/app/admin/components/Pedidos.tsx` → `formatearFecha()`
- `src/app/admin/clientes/[id]/page.tsx` → todos los `toLocaleDateString`

## Catálogo de tortas

Los productos de temporada (ej: Pascuas) se agregan manualmente en `PRODUCTOS_PASCUAS` en `src/app/api/woocommerce/tortas/route.ts`. Después de cualquier cambio en ese array, hay que refrescar el cache llamando a `/api/woocommerce/tortas?refresh=1`.
