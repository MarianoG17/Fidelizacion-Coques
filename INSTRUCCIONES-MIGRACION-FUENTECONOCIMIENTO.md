# Migración: Agregar campo fuenteConocimiento

## ⚠️ URGENTE - Ejecutar en producción

El deploy fue exitoso pero falta agregar la columna `fuenteConocimiento` en la base de datos de producción.

## SQL a ejecutar en producción:

```sql
-- Agregar columna fuenteConocimiento
ALTER TABLE "Cliente" ADD COLUMN "fuenteConocimiento" TEXT;
```

## Pasos:

1. Conectarse a la base de datos de producción (Supabase/PostgreSQL)
2. Ejecutar el SQL de arriba
3. Verificar que se agregó correctamente:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'Cliente' AND column_name = 'fuenteConocimiento';
   ```

## Después de la migración:

La aplicación volverá a funcionar normalmente. El error actual es:
```
The column `Cliente.fuenteConocimiento` does not exist in the current database.
```

Este error desaparecerá una vez ejecutada la migración.

## Valores válidos para fuenteConocimiento:

- "Amigos"
- "Instagram"
- "Google Maps"
- "Vi luz y entré"

## Opcional: Asignar nivel Bronce a clientes existentes

Si hay clientes sin nivel asignado, también podés ejecutar:

```sql
-- Ver cuántos clientes no tienen nivel
SELECT COUNT(*) FROM "Cliente" WHERE "nivelId" IS NULL;

-- Asignar nivel Bronce (orden = 1) a los que no tienen
UPDATE "Cliente"
SET "nivelId" = (SELECT id FROM "Nivel" WHERE orden = 1 LIMIT 1)
WHERE "nivelId" IS NULL;
```
