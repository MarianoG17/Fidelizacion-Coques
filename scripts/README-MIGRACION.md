# Guía de Migración de Autos en Proceso

## Contexto

Tienes dos bases de datos en Neon:
- **Base Antigua**: Sistema anterior con EstadoAuto vinculado directamente a Cliente
- **Base Nueva**: Sistema actual con múltiples autos por cliente

Necesitas migrar solo los autos que están **en proceso de lavado** (estado != 'ENTREGADO') desde la base antigua a la nueva.

---

## Opciones de Migración

### 🟢 Opción 1: Script TypeScript (RECOMENDADO)

**Ventajas:**
- Más seguro y con mejor manejo de errores
- Muestra progreso en tiempo real
- No requiere permisos especiales en Neon
- Más fácil de debuggear

**Pasos:**

1. **Configurar variables de entorno:**

```bash
# Crear archivo .env.migration en la raíz del proyecto
cp .env.example .env.migration
```

Editar `.env.migration`:
```env
# Base de datos ANTIGUA (origen)
OLD_DATABASE_URL="postgresql://user:password@host-antiguo.neon.tech/neondb?sslmode=require"

# Base de datos NUEVA (destino)
DATABASE_URL="postgresql://user:password@host-nuevo.neon.tech/neondb?sslmode=require"
```

2. **Ejecutar el script:**

```bash
cd fidelizacion-zona

# Cargar variables de entorno
export $(cat .env.migration | xargs)

# Ejecutar migración
npx ts-node scripts/migrate-autos-from-old-db.ts
```

3. **Revisar el output:**

El script mostrará:
- Cantidad de autos encontrados
- Resumen por estado (RECIBIDO, EN_LAVADO, etc.)
- Progreso de cada auto migrado
- Resumen final de éxitos/errores

---

### 🟡 Opción 2: SQL Directo con dblink

**Ventajas:**
- Migración más rápida
- Todo en una transacción

**Desventajas:**
- Requiere extensión dblink (puede no estar disponible en Neon)
- Menos control granular
- Más difícil de debuggear

**Pasos:**

1. **Abrir consola SQL de Neon** (base NUEVA)

2. **Editar el script SQL:**
   
Abrir `scripts/migrate-autos-direct-sql.sql` y reemplazar:
```sql
\set OLD_DB_CONN 'host=xxx.neon.tech port=5432 dbname=neondb_old user=neondb_owner password=tu_password sslmode=require'
```

Con tus credenciales reales de la base ANTIGUA.

3. **Ejecutar la vista previa:**

Primero ejecuta solo la sección "Vista previa" para ver qué se va a migrar.

4. **Ejecutar la migración:**

Descomenta el bloque `DO $$` y ejecútalo.

---

### 🟠 Opción 3: Export/Import Manual con CSV

Si ninguna de las opciones anteriores funciona:

1. **Exportar desde base antigua:**

```sql
-- En la base ANTIGUA, ejecutar:
COPY (
  SELECT 
    c.phone,
    ea.patente,
    ea.estado,
    ea."localOrigenId",
    ea.notas
  FROM "EstadoAuto" ea
  JOIN "Cliente" c ON c.id = ea."clienteId"
  WHERE ea.estado != 'ENTREGADO'
    AND ea.patente IS NOT NULL 
    AND ea.patente != ''
) TO '/tmp/autos_en_proceso.csv' WITH CSV HEADER;
```

2. **Crear script para importar el CSV** (lo puedo crear si necesitas)

---

## Verificación Post-Migración

Después de migrar, ejecuta estas queries en la **base NUEVA**:

### Ver autos migrados
```sql
SELECT 
    c.phone,
    a.patente,
    ea.estado,
    ea."updatedAt"
FROM "Auto" a
JOIN "Cliente" c ON c.id = a."clienteId"
LEFT JOIN "EstadoAuto" ea ON ea."autoId" = a.id
WHERE ea.estado != 'ENTREGADO'
ORDER BY ea."updatedAt" DESC;
```

### Contar por estado
```sql
SELECT 
    ea.estado,
    COUNT(*) as cantidad
FROM "EstadoAuto" ea
GROUP BY ea.estado
ORDER BY cantidad DESC;
```

---

## Preguntas Frecuentes

### ¿Qué pasa con los clientes que no existen en la base nueva?

El script los crea automáticamente con estado `PRE_REGISTRADO` y fuente `LAVADERO`.

### ¿Qué pasa si el auto ya existe en la base nueva?

El script actualiza el estado existente en lugar de crear uno duplicado.

### ¿Puedo ejecutar el script varias veces?

Sí, el script es idempotente. Si se ejecuta múltiples veces, actualiza los registros existentes.

### ¿Se migran los autos con estado ENTREGADO?

No, el script filtra automáticamente para migrar solo los que están en proceso.

---

## Rollback

Si algo sale mal:

```sql
-- En la base NUEVA, eliminar autos migrados
-- (cuidado: esto eliminará también sus estados)
DELETE FROM "Auto" 
WHERE "createdAt" > '2026-02-11 22:00:00'  -- ajustar fecha según cuándo migraste
  AND "clienteId" IN (
    SELECT id FROM "Cliente" 
    WHERE "fuenteOrigen" = 'LAVADERO' 
      AND "createdAt" > '2026-02-11 22:00:00'
  );
```

---

## ¿Necesitas Ayuda?

Si encuentras algún problema:

1. Revisa los logs del script
2. Verifica las conexiones a ambas bases
3. Asegúrate que el schema de la base nueva esté actualizado
4. Contacta para soporte adicional
