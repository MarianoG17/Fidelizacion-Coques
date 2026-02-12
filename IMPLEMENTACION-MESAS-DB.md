# Implementación de Mesas en Base de Datos

## 📋 Resumen

Se modificó el sistema para que las mesas se carguen desde la base de datos en lugar de estar hardcodeadas en el frontend. Esto permite registrar correctamente el ID de la mesa en cada evento y cruzar la información con tu sistema.

## ✅ Cambios Realizados en el Código

### 1. Frontend (`src/app/local/page.tsx`)
- ✅ Agregado `useState` para almacenar mesas dinámicas
- ✅ Agregado `useEffect` para cargar mesas desde `/api/mesas` al iniciar
- ✅ Mesas hardcodeadas convertidas en `MESAS_FALLBACK` (solo se usan si falla la API)
- ✅ La función `registrarEvento()` envía `mesaSeleccionada?.id` (UUID real)

### 2. API
- ✅ Ya existía `/api/mesas` que devuelve las mesas del local

### 3. Script SQL
- ✅ Creado [`scripts/crear-mesas-coques.sql`](scripts/crear-mesas-coques.sql) con todas las mesas

---

## 📝 Pasos a Seguir (EN ORDEN)

### Paso 1: Obtener el ID del Local

Abrí Neon Console SQL Editor y ejecutá:

```sql
SELECT id, nombre, tipo FROM "Local";
```

**Resultado esperado:**
- Si existe un local, copiá su UUID
- Si NO existe, crealo primero (ver Paso 1.1)

#### Paso 1.1: Si NO existe el local, crealo

```sql
INSERT INTO "Local" (id, nombre, tipo, "apiKey", activo) 
VALUES (
  gen_random_uuid(), 
  'Fidelización Coques', 
  'cafeteria', 
  'tu-api-key-de-local-aqui',  -- Reemplazá con tu API key
  true
)
RETURNING id, nombre;
```

⚠️ **IMPORTANTE**: La `apiKey` debe ser la misma que usás en `NEXT_PUBLIC_LOCAL_API_KEY` en tu `.env.local`

### Paso 2: Crear las Mesas en la Base de Datos

1. Abrí el archivo `scripts/crear-mesas-coques.sql`
2. Buscá todas las líneas que dicen `'LOCAL_ID_AQUI'` (hay 29 ocurrencias)
3. Reemplazá **TODAS** con el UUID del local que obtuviste en el Paso 1
4. Copiá **TODO el script** (desde la primera mesa hasta la última)
5. Pegalo en Neon SQL Editor
6. Ejecutá el script completo

**Ejemplo del script con el ID reemplazado:**
```sql
INSERT INTO "Mesa" (id, "localId", nombre, "posX", "posY", ancho, alto, activa) VALUES
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'S1', 2, 2, 8, 8, true),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'S3', 12, 2, 8, 8, true),
-- ... etc para todas las mesas
```

### Paso 3: Verificar que se Crearon Correctamente

Ejecutá en Neon:

```sql
SELECT id, nombre, "posX", "posY", activa 
FROM "Mesa" 
WHERE "localId" = 'TU_LOCAL_ID_AQUI'
ORDER BY nombre;
```

**Resultado esperado:** 29 filas con todas las mesas (S1, S2, S3, ..., S25, G21, G22, G23)

### Paso 4: Probar en Local (Desarrollo)

1. Asegurate que tu archivo `fidelizacion-zona/.env.local` tenga:
   ```
   NEXT_PUBLIC_LOCAL_API_KEY=tu-api-key-de-local
   ```

2. El servidor de desarrollo ya está corriendo, refrescá la página de `/local`

3. Abrí la consola del navegador (F12)

4. Deberías ver un log: `"Mesas cargadas desde la base de datos"`

5. Cuando seleccionés una mesa y registres un evento, el `mesaId` ahora será un UUID válido

### Paso 5: Deploy a Producción

Una vez que probaste en local y funciona:

```bash
cd fidelizacion-zona
git add -A
git commit -m "feat: Cargar mesas desde base de datos con UUIDs reales"
git push
```

Vercel desplegará automáticamente.

### Paso 6: Verificar en Producción

1. Andá a la página del local en producción
2. Registrá una visita seleccionando una mesa
3. Verificá en Neon que el evento se guardó con el `mesaId` correcto:

```sql
SELECT 
  e.id,
  e.timestamp,
  c.nombre as cliente,
  m.nombre as mesa,
  e."tipoEvento"
FROM "EventoScan" e
LEFT JOIN "Cliente" c ON e."clienteId" = c.id
LEFT JOIN "Mesa" m ON e."mesaId" = m.id
ORDER BY e.timestamp DESC
LIMIT 10;
```

**Resultado esperado:** Deberías ver el nombre de la mesa (ej: "S2", "G21") en la columna `mesa`

---

## 🔍 Troubleshooting

### Error: "No se pueden cargar las mesas"

**Problema:** La API `/api/mesas` falla

**Solución:**
1. Verificá que el `NEXT_PUBLIC_LOCAL_API_KEY` en `.env.local` coincida con el `apiKey` del Local en la base de datos
2. Verificá en la consola del navegador qué error específico muestra
3. Si falla, el sistema usará las mesas hardcodeadas como fallback (pero no guardarán el ID)

### Error: "Invalid uuid" al registrar evento

**Problema:** Todavía está enviando IDs hardcodeados como 's2'

**Solución:**
1. Verificá que las mesas se hayan creado en la base de datos (Paso 3)
2. Refrescá completamente la página del local (Ctrl + F5)
3. Verificá en la consola del navegador el payload que se envía (debe tener un UUID largo en `mesaId`)

### Las mesas no aparecen en el layout visual

**Problema:** Se cargan desde la DB pero no se visualizan

**Solución:**
1. Las coordenadas `posX`, `posY`, `ancho`, `alto` deben estar en el rango 0-100 (porcentajes)
2. Verificá que las mesas tengan `activa: true`
3. Revisá la consola del navegador para ver si hay errores

---

## 📊 Beneficios de Este Cambio

### Antes (Hardcodeado)
- ❌ `mesaId` era `'s2'`, `'g21'` (no válido para UUID)
- ❌ No se podía guardar en la base de datos
- ❌ No se podía cruzar con otros sistemas
- ❌ No había trazabilidad de qué mesa usó cada cliente

### Ahora (Base de Datos)
- ✅ `mesaId` es un UUID válido: `'a1b2c3d4-5678-90ab-cdef-1234567890ab'`
- ✅ Se guarda correctamente en `EventoScan`
- ✅ Podés hacer queries para ver qué clientes usan cada mesa
- ✅ Podés cruzar con tu sistema Aires usando el nombre de la mesa
- ✅ Tenés métricas reales de uso de mesas

---

## 🎯 Próximos Pasos (Opcional)

### Agregar Métricas de Mesas

Podés agregar queries para analizar el uso de mesas:

```sql
-- Mesas más usadas
SELECT 
  m.nombre,
  COUNT(e.id) as visitas_totales
FROM "Mesa" m
LEFT JOIN "EventoScan" e ON e."mesaId" = m.id
WHERE e."tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
GROUP BY m.id, m.nombre
ORDER BY visitas_totales DESC;

-- Uso por horario
SELECT 
  m.nombre,
  EXTRACT(HOUR FROM e.timestamp) as hora,
  COUNT(e.id) as visitas
FROM "EventoScan" e
JOIN "Mesa" m ON e."mesaId" = m.id
WHERE e.timestamp >= NOW() - INTERVAL '7 days'
GROUP BY m.nombre, hora
ORDER BY hora, visitas DESC;
```

### Sincronizar con Aires

Si querés sincronizar automáticamente:
1. Agregá un campo `codigoAires` en la tabla Mesa
2. Cuando se registre un evento, enviá el código a Aires
3. Mantené sincronizadas ambas bases de datos

---

## ✅ Checklist Final

- [ ] Paso 1: Obtener ID del Local
- [ ] Paso 2: Ejecutar script SQL en Neon (29 mesas creadas)
- [ ] Paso 3: Verificar que las mesas se crearon correctamente
- [ ] Paso 4: Probar en desarrollo local
- [ ] Paso 5: Deploy a producción
- [ ] Paso 6: Verificar en producción que se guarda el mesaId

Una vez completados todos los pasos, el sistema estará registrando correctamente qué mesa usó cada cliente en cada visita.
