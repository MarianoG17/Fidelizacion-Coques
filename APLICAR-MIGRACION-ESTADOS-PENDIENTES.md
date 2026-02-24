# 🚀 Cómo Aplicar la Migración de Estados Pendientes

## 📍 Base de Datos Correcta

Ejecutá el SQL en la base de datos **PRINCIPAL** de fidelización:

- ✅ **Base correcta:** La que apunta `DATABASE_URL` en tu `.env`
- ✅ **Nombre en Neon:** Probablemente `fidelizacion` o similar
- ❌ **NO ejecutar en:** `deltawash` (esa es solo lectura)

---

## 🎯 Opción 1: Desde Neon Console (Recomendado)

### Paso a paso:

1. **Entrá a Neon Console:** https://console.neon.tech
2. **Seleccioná tu proyecto:** Fidelización Coques
3. **Seleccioná la base:** `fidelizacion` (la principal)
4. **Hacé clic en "SQL Editor"** (o "Query")
5. **Copiá y pegá este SQL:**

```sql
-- Crear tabla EstadoAutoPendiente
CREATE TABLE IF NOT EXISTS "EstadoAutoPendiente" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "notas" TEXT,
    "localOrigenId" TEXT,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "procesadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoAutoPendiente_pkey" PRIMARY KEY ("id")
);

-- Crear índices
CREATE INDEX IF NOT EXISTS "EstadoAutoPendiente_phone_idx" ON "EstadoAutoPendiente"("phone");
CREATE INDEX IF NOT EXISTS "EstadoAutoPendiente_procesado_idx" ON "EstadoAutoPendiente"("procesado");
CREATE INDEX IF NOT EXISTS "EstadoAutoPendiente_phone_procesado_idx" ON "EstadoAutoPendiente"("phone", "procesado");
CREATE INDEX IF NOT EXISTS "EstadoAutoPendiente_createdAt_idx" ON "EstadoAutoPendiente"("createdAt");
```

6. **Ejecutá** (botón "Run" o Ctrl+Enter)
7. **Verificá que se creó:**

```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'EstadoAutoPendiente'
ORDER BY ordinal_position;
```

Deberías ver las 12 columnas listadas.

---

## 🖥️ Opción 2: Desde tu terminal (psql)

Si tenés `psql` instalado:

```bash
# 1. Copiá tu DATABASE_URL desde Vercel o .env
export DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/fidelizacion?sslmode=require"

# 2. Ejecutá el script
psql $DATABASE_URL -f fidelizacion-zona/scripts/aplicar-migracion-estados-pendientes.sql
```

Deberías ver:
```
✅ Tabla EstadoAutoPendiente creada exitosamente
```

---

## 🔍 Verificar que Funcionó

### En Neon Console o psql:

```sql
-- Ver estructura de la tabla
\d "EstadoAutoPendiente"

-- Ver estadísticas
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE procesado = false) as pendientes,
    COUNT(*) FILTER (WHERE procesado = true) as procesados
FROM "EstadoAutoPendiente";
```

Resultado esperado:
```
 total | pendientes | procesados 
-------+------------+------------
     0 |          0 |          0
```

(Normal que esté en 0 porque es una tabla nueva)

---

## 🚀 Después de Aplicar la Migración

### 1. Deploy a Vercel

```bash
git add .
git commit -m "feat: Sistema de estados pendientes lavadero → Coques"
git push origin main
```

Vercel detecta el push y deploya automáticamente.

### 2. Verificar en Producción

Una vez deployado, podés verificar que todo funciona:

```bash
# Llamar al webhook de prueba (sin cliente registrado)
curl -X POST https://tu-dominio.vercel.app/api/webhook/deltawash \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_DELTAWASH_WEBHOOK_SECRET" \
  -d '{
    "phone": "+5491199999999",
    "patente": "TEST123",
    "estado": "en proceso"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "pendiente": true,
  "message": "Estado guardado. Se procesará cuando el cliente se registre"
}
```

Luego verificá en Neon:
```sql
SELECT * FROM "EstadoAutoPendiente" WHERE phone = '+5491199999999';
```

Deberías ver el registro con `procesado = false`.

---

## ✅ Checklist de Verificación

- [ ] Tabla `EstadoAutoPendiente` creada en Neon
- [ ] 4 índices creados correctamente
- [ ] Prisma client regenerado (`npx prisma generate`)
- [ ] Código commiteado y pusheado a GitHub
- [ ] Vercel deployó exitosamente
- [ ] Webhook funciona y guarda pendientes
- [ ] Registro de cliente procesa pendientes automáticamente

---

## 🐛 Troubleshooting

### Error: "relation already exists"
✅ Está bien, significa que la tabla ya existe. Podés ignorarlo.

### Error: "permission denied"
❌ Verificá que estás conectado a la base correcta con permisos de escritura.

### Error: "syntax error"
❌ Asegurate de copiar el SQL completo sin modificar.

### La tabla se creó pero el código no la ve
```bash
cd fidelizacion-zona
npx prisma generate
```

---

## 📞 Soporte

Si tenés problemas:
1. Revisá [`SOLUCION-REGISTRO-PENDIENTE-LAVADERO.md`](fidelizacion-zona/SOLUCION-REGISTRO-PENDIENTE-LAVADERO.md)
2. Verificá logs en Vercel → tu proyecto → Logs
3. Consultá la sección Troubleshooting del documento principal

---

**Última actualización:** 2026-02-24
