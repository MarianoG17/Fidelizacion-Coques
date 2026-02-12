# Instrucciones para Migrar la Base de Datos de Producción

## ⚠️ PROBLEMA ACTUAL

El deploy de Vercel está fallando con este error:
```
The table `public.Auto` does not exist in the current database.
```

Esto es porque el código está listo para usar la tabla `Auto`, pero la base de datos de producción todavía no tiene esa tabla.

## 🔧 SOLUCIÓN: Ejecutar la Migración en Neon

### Opción 1: Desde la Consola de Neon (Recomendado)

1. **Ir a la consola de Neon**: https://console.neon.tech/
2. **Seleccionar tu proyecto** de Fidelización Coques
3. **Abrir SQL Editor**
4. **Copiar y pegar el SQL** del archivo [`prisma/migrations/add_autos_table.sql`](./prisma/migrations/add_autos_table.sql)
5. **Ejecutar el script completo**
6. **Verificar** que se creó la tabla:
   ```sql
   SELECT * FROM "Auto" LIMIT 5;
   ```

### Opción 2: Desde psql (Línea de Comandos)

Si prefieres usar la terminal:

```bash
# 1. Copiar tu DATABASE_URL de producción (la que está en Vercel)
# 2. Ejecutar la migración directamente
psql "TU_DATABASE_URL_DE_PRODUCCION" -f prisma/migrations/add_autos_table.sql
```

### Opción 3: Usar Prisma Migrate (Avanzado)

```bash
# 1. Asegurarte que .env tenga DATABASE_URL de producción
# 2. Ejecutar
npx prisma migrate deploy
```

⚠️ **CUIDADO**: Esta opción solo funciona si nunca has usado Prisma Migrate antes en esta base de datos.

## 📊 ¿Qué Hace la Migración?

1. ✅ Crea la tabla `Auto` para almacenar múltiples autos por cliente
2. ✅ Migra datos existentes de `EstadoAuto` (patentes) a la nueva tabla `Auto`
3. ✅ Actualiza `EstadoAuto` para referenciar a `Auto` en lugar de `Cliente`
4. ✅ Mantiene todos los datos existentes (no se pierde nada)

## 🚀 Después de la Migración

Una vez que ejecutes la migración en Neon:

1. **Volver a deployar en Vercel**:
   - Puedes hacer `git push` de nuevo, o
   - Ir a Vercel Dashboard → Deployments → Redeploy

2. **Verificar que funciona**:
   - El build debería completarse exitosamente
   - La app debería funcionar normalmente

## 🔍 Verificación Rápida

Para verificar que la migración funcionó correctamente:

```sql
-- Ver las tablas
\dt

-- Debería mostrar: Auto, EstadoAuto, Cliente, etc.

-- Ver cuántos autos se migraron
SELECT COUNT(*) FROM "Auto";

-- Ver la estructura de Auto
\d "Auto"
```

## 📞 Si Hay Problemas

Si algo sale mal:
- La migración está diseñada para ser segura
- No elimina datos, solo los reorganiza
- Si necesitas revertir, contáctame antes de hacer nada
