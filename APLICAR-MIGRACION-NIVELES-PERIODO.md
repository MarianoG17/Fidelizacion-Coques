# Migración: Período de Días Configurable para Niveles

## Cambio Implementado

**Antes:** El período de 30 días para evaluar visitas en niveles estaba hardcodeado.  
**Ahora:** Es configurable desde la base de datos en `ConfiguracionApp.nivelesPeriodoDias`

## Paso 1: Aplicar Migración SQL en Producción

### Conectarse a la Base de Datos de Producción

1. **Ir a Neon Dashboard:** https://console.neon.tech
2. **Seleccionar el proyecto:** Coques Fidelización
3. **Ir a SQL Editor**

### Ejecutar el Script

Copiar y pegar el contenido de [`scripts/agregar-niveles-periodo-dias.sql`](scripts/agregar-niveles-periodo-dias.sql):

```sql
-- Agregar campo nivelesPeriodoDias a ConfiguracionApp
ALTER TABLE "ConfiguracionApp" 
ADD COLUMN IF NOT EXISTS "nivelesPeriodoDias" INTEGER NOT NULL DEFAULT 30;

-- Verificar el cambio
SELECT id, "nivelesPeriodoDias", "feedbackHabilitado", "updatedAt" 
FROM "ConfiguracionApp" 
LIMIT 1;

-- Comentario informativo
COMMENT ON COLUMN "ConfiguracionApp"."nivelesPeriodoDias" IS 'Período de días para evaluar visitas en la gestión de niveles (ej: 30 días)';
```

### Verificar Resultado

Deberías ver:
```
ALTER TABLE
SELECT 1
COMMENT
```

Y el SELECT debería mostrar:
```
id                                   | nivelesPeriodoDias | feedbackHabilitado | updatedAt
-------------------------------------|--------------------|--------------------|------------
xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx    | 30                 | true              | 2026-...
```

## Paso 2: Deploy Automático

El código ya fue pusheado a GitHub, Vercel desplegará automáticamente en ~2 minutos.

## Paso 3: Verificar en Producción

1. **Probar evaluación de niveles:**
   - Escanear un cliente en `/local`
   - La función `evaluarNivel()` ahora usa el valor de `nivelesPeriodoDias`

2. **Logs esperados:**
```
[evaluarNivel] Cliente XXXX mantiene nivel Bronce (3/5 visitas para subir)
```

## Cómo Cambiar el Período en el Futuro

Para cambiar de 30 a otro valor (ej: 60 días):

```sql
UPDATE "ConfiguracionApp" 
SET "nivelesPeriodoDias" = 60 
WHERE id = (SELECT id FROM "ConfiguracionApp" LIMIT 1);
```

O desde la app cuando agregues interfaz admin para configuración.

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| [`prisma/schema.prisma`](prisma/schema.prisma:456) | +1 campo: `nivelesPeriodoDias` |
| [`src/lib/beneficios.ts`](src/lib/beneficios.ts:115) | Lee de config, usa valor dinámico |
| [`scripts/agregar-niveles-periodo-dias.sql`](scripts/agregar-niveles-periodo-dias.sql) | Script de migración |

## Impacto

### ✅ Funcionalidad Mejorada
- El período para evaluar visitas ahora es editable desde la base de datos
- Mensajes de notificación usan el valor dinámico
- Valor por defecto: 30 días (comportamiento anterior)

### ⚠️ Sin Cambios en Comportamiento
- Si no modificás el valor, funciona exactamente igual que antes
- Los clientes no notarán ninguna diferencia

## Commit

**Hash:** `28223d5`  
**Mensaje:** feat: Hacer configurable el período de días para evaluación de niveles (antes hardcoded 30 días)

---

**Fecha:** 2026-03-01  
**Estado:** ✅ Listo para aplicar en producción
