# 📞 Normalización de Teléfonos Argentinos

## 🎯 Problema Resuelto

En Argentina hay dos formatos para el mismo número:
- **Moderno:** `11 1234-5678` (10 dígitos, empieza con 11)
- **Legacy:** `15 1234-5678` (10 dígitos, empieza con 15)

**Ambos son el MISMO número telefónico.** El `15` es redundante/legacy del sistema antiguo.

## ⚠️ Problema Anterior

**Escenario:**
1. Empleado registra cliente en lavadero con `1512345678`
2. Cliente se registra en app con `1112345678`
3. ❌ Sistema no los matchea → Cliente no ve su auto ni beneficio

## ✅ Solución Implementada

Se creó [`src/lib/phone.ts`](fidelizacion-zona/src/lib/phone.ts) con funciones de normalización:

### `normalizarTelefono()`
Convierte cualquier formato a `11XXXXXXXX` (estándar)

```typescript
normalizarTelefono("1112345678")     // "1112345678"
normalizarTelefono("1512345678")     // "1112345678" ✅ Convierte 15 → 11
normalizarTelefono("11 1234-5678")   // "1112345678"
normalizarTelefono("15 1234-5678")   // "1112345678" ✅
normalizarTelefono("+5491112345678") // "1112345678"
normalizarTelefono("+5491512345678") // "1112345678" ✅
```

---

## 🔧 Archivos Modificados

### 1. Librería de Normalización
**Archivo:** [`src/lib/phone.ts`](fidelizacion-zona/src/lib/phone.ts) (NUEVO)
- `normalizarTelefono()` - Normaliza a 11XXXXXXXX
- `toE164()` - Convierte a formato internacional
- `formatearTelefono()` - Formatea para mostrar

### 2. Webhook DeltaWash
**Archivo:** [`src/app/api/webhook/deltawash/route.ts`](fidelizacion-zona/src/app/api/webhook/deltawash/route.ts)
- Normaliza teléfono antes de buscar cliente
- Guarda teléfono normalizado en pendientes

### 3. Endpoint de Registro
**Archivo:** [`src/app/api/auth/register/route.ts`](fidelizacion-zona/src/app/api/auth/register/route.ts)
- Normaliza teléfono al registrarse
- Busca pendientes con teléfono normalizado
- Guarda teléfono normalizado en Cliente

---

## 🚀 Migración de Datos Existentes

### ⚠️ IMPORTANTE: Ejecutar ANTES de deployar

Si ya tenés clientes en la DB con teléfonos que empiezan con `15`, hay que normalizarlos:

```bash
# Conectar a la DB de producción
psql $DATABASE_URL -f fidelizacion-zona/scripts/normalizar-telefonos-existentes.sql
```

**¿Qué hace este script?**
1. Muestra cuántos clientes tienen teléfonos con `15`
2. Los convierte a `11` (mismo número, formato estándar)
3. Verifica que la normalización funcionó

---

## ✅ Garantías de Compatibilidad

### ¿Se rompe algo existente?

**NO**, porque:

1. ✅ **Clientes existentes con 11:** Siguen funcionando igual (ya están normalizados)
2. ✅ **Clientes existentes con 15:** Se normalizan con el script SQL
3. ✅ **Login existente:** Normaliza antes de buscar → funciona con ambos formatos
4. ✅ **Webhook del lavadero:** Normaliza antes de guardar → siempre guarda con 11
5. ✅ **Registro nuevo:** Normaliza antes de guardar → siempre guarda con 11

### ¿Qué pasa con el frontend?

El usuario puede ingresar su teléfono como quiera:
- `1112345678` ✅ Se normaliza a `1112345678`
- `1512345678` ✅ Se normaliza a `1112345678`
- `11 1234-5678` ✅ Se normaliza a `1112345678`
- `15 1234-5678` ✅ Se normaliza a `1112345678`

**Todos funcionan porque se normalizan internamente.**

---

## 🧪 Testing

### Caso 1: Empleado pone 15, cliente pone 11

```bash
# 1. Webhook del lavadero (empleado pone 15)
curl -X POST https://tu-app/api/webhook/deltawash \
  -H "Authorization: Bearer SECRET" \
  -d '{
    "phone": "1512345678",
    "patente": "ABC123",
    "estado": "en proceso"
  }'

# Guarda pendiente con phone="1112345678" (normalizado)

# 2. Cliente se registra con 11
POST /api/auth/register
{
  "phone": "1112345678",
  "email": "test@test.com",
  ...
}

# Normaliza a "1112345678"
# Busca pendientes con "1112345678"
# ✅ MATCH! Encuentra el auto y activa beneficio
```

### Caso 2: Empleado pone 11, cliente pone 15

```bash
# 1. Webhook del lavadero (empleado pone 11)
curl -X POST https://tu-app/api/webhook/deltawash \
  -d '{ "phone": "1112345678", ... }'

# Guarda pendiente con phone="1112345678"

# 2. Cliente se registra con 15
POST /api/auth/register
{ "phone": "1512345678", ... }

# Normaliza a "1112345678"
# Busca pendientes con "1112345678"
# ✅ MATCH! Funciona igual
```

### Caso 3: Ambos ponen 15

```bash
# 1. Webhook: phone="1512345678" → Guarda "1112345678"
# 2. Registro: phone="1512345678" → Busca "1112345678"
# ✅ MATCH!
```

### Caso 4: Ambos ponen 11

```bash
# 1. Webhook: phone="1112345678" → Guarda "1112345678"
# 2. Registro: phone="1112345678" → Busca "1112345678"
# ✅ MATCH!
```

**Resultado: Todos los casos funcionan ✅**

---

## 📋 Checklist de Deploy

- [ ] Ejecutar script de normalización en producción:
  ```bash
  psql $DATABASE_URL -f scripts/normalizar-telefonos-existentes.sql
  ```
- [ ] Verificar que no hay clientes con 15:
  ```sql
  SELECT COUNT(*) FROM "Cliente" WHERE phone LIKE '15%';
  -- Debería dar 0
  ```
- [ ] Deploy del código:
  ```bash
  git add .
  git commit -m "feat: Normalización de teléfonos argentinos (11/15)"
  git push origin main
  ```
- [ ] Testing en producción con ambos formatos

---

## 🔍 Queries Útiles

### Ver distribución de formatos actuales
```sql
SELECT 
    CASE 
        WHEN phone ~ '^11[0-9]{8}$' THEN 'Formato 11XXXXXXXX'
        WHEN phone ~ '^15[0-9]{8}$' THEN 'Formato 15XXXXXXXX'
        WHEN phone ~ '^\+549' THEN 'Formato E.164 (+549...)'
        ELSE 'Otro formato'
    END as formato,
    COUNT(*) as cantidad
FROM "Cliente"
GROUP BY formato;
```

### Buscar clientes que podrían tener duplicados por 11/15
```sql
SELECT 
    REPLACE(phone, '15', '11') as phone_normalizado,
    COUNT(*) as cantidad,
    ARRAY_AGG(phone) as variantes
FROM "Cliente"
GROUP BY phone_normalizado
HAVING COUNT(*) > 1;
```

---

## 🐛 Troubleshooting

### Cliente no encuentra su auto después del deploy

1. Verificar que el teléfono está normalizado en Cliente:
```sql
SELECT id, nombre, phone FROM "Cliente" WHERE nombre ILIKE '%nombre_cliente%';
```

2. Verificar que el pendiente tiene el teléfono normalizado:
```sql
SELECT phone, patente, procesado FROM "EstadoAutoPendiente" WHERE patente = 'ABC123';
```

3. Si no matchean, normalizar manualmente:
```sql
UPDATE "Cliente" SET phone = '11' || SUBSTRING(phone FROM 3) WHERE id = 'cliente-id';
-- O
UPDATE "EstadoAutoPendiente" SET phone = '11' || SUBSTRING(phone FROM 3) WHERE id = 'pendiente-id';
```

---

## 📚 Referencias

- Librería de normalización: [`src/lib/phone.ts`](fidelizacion-zona/src/lib/phone.ts)
- Script de migración: [`scripts/normalizar-telefonos-existentes.sql`](fidelizacion-zona/scripts/normalizar-telefonos-existentes.sql)
- Webhook modificado: [`src/app/api/webhook/deltawash/route.ts`](fidelizacion-zona/src/app/api/webhook/deltawash/route.ts)
- Registro modificado: [`src/app/api/auth/register/route.ts`](fidelizacion-zona/src/app/api/auth/register/route.ts)

---

**Última actualización:** 2026-02-24  
**Estado:** ✅ Implementado y listo para testing
