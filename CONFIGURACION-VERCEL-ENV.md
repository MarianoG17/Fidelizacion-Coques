# 🔧 Configuración de Variables de Entorno en Vercel

## ⚠️ PROBLEMA ACTUAL

Los eventos NO se están registrando porque **falta la API Key** para autenticar las peticiones del local.

El código en [`src/app/local/page.tsx:8`](./src/app/local/page.tsx#L8) intenta usar:
```typescript
const LOCAL_API_KEY = process.env.NEXT_PUBLIC_LOCAL_API_KEY || ''
```

Si esta variable no está configurada en Vercel, será `''` (vacía) y el backend rechazará todas las peticiones.

---

## ✅ SOLUCIÓN: Configurar Variables en Vercel

### Paso 1: Ir a Configuración de Vercel

1. **Abrir** https://vercel.com/dashboard
2. **Seleccionar** tu proyecto "Fidelización Coques"
3. **Click** en "Settings"
4. **Click** en "Environment Variables" (menú lateral)

### Paso 2: Agregar Variables Requeridas

#### 🔑 NEXT_PUBLIC_LOCAL_API_KEY (REQUERIDA)

Esta variable **DEBE** estar configurada para que el sistema funcione.

**Nombre**: `NEXT_PUBLIC_LOCAL_API_KEY`  
**Value**: Usa el mismo valor que tienes en la base de datos

**Cómo obtener el valor**:

```sql
-- Ejecutar en Neon SQL Editor
SELECT apiKey FROM "Local" WHERE nombre = 'Coques Cafeteria';
```

O si no tienes locales creados, genera uno nuevo:

```bash
# En tu terminal local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia ese valor y:
1. Pégalo como valor de `NEXT_PUBLIC_LOCAL_API_KEY` en Vercel
2. Úsalo para crear/actualizar el Local en la base de datos:

```sql
-- Ejecutar en Neon SQL Editor
INSERT INTO "Local" (id, nombre, tipo, "apiKey")
VALUES (
  gen_random_uuid(),
  'Coques Cafeteria',
  'cafeteria',
  'TU_API_KEY_GENERADA_AQUI'
);
```

#### 🔧 Otras Variables (ya deberías tenerlas)

**DATABASE_URL**:
- Ya debería estar configurada
- Es tu connection string de Neon
- Ejemplo: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/fidelizacion?sslmode=require`

**DELTAWASH_DATABASE_URL** (OPCIONAL):
- Solo si usas la integración con DeltaWash
- Connection string de la base de DeltaWash Legacy

### Paso 3: Configurar para Todos los Entornos

**IMPORTANTE**: Al agregar cada variable, selecciona:
- ✅ Production
- ✅ Preview
- ✅ Development

Esto asegura que funcione en todos los entornos.

### Paso 4: Redeploy

Después de agregar las variables:

1. Ve a la pestaña "Deployments"
2. Click en el deployment más reciente
3. Click en "⋯" (tres puntos)
4. Click en "Redeploy"

O simplemente haz un commit vacío:
```bash
git commit --allow-empty -m "Trigger redeploy after env vars"
git push
```

---

## 🔍 Verificar Configuración

### Ver Variables Configuradas en Vercel

1. Ir a Settings → Environment Variables
2. Deberías ver al menos:
   - `DATABASE_URL` (valor oculto)
   - `NEXT_PUBLIC_LOCAL_API_KEY` (valor visible porque es PUBLIC)

### Verificar que el Local Existe en la Base de Datos

```sql
-- Ejecutar en Neon SQL Editor
SELECT id, nombre, tipo, "apiKey" 
FROM "Local"
WHERE tipo = 'cafeteria';
```

Debe retornar al menos una fila con el local "Coques Cafeteria" (o similar).

### Probar Después del Redeploy

1. Abrir https://fidelizacion-coques-813u.vercel.app/local
2. Presionar F12 → Console
3. En la consola escribir:
   ```javascript
   console.log('API Key configurada:', process.env.NEXT_PUBLIC_LOCAL_API_KEY ? '✅ Sí' : '❌ No')
   ```
4. Si dice "✅ Sí", la variable está configurada
5. Intentar registrar un evento y ver el mensaje en consola

---

## 🎯 Resultado Esperado

Una vez configurado correctamente:

1. ✅ Los eventos se registran en la tabla `EventoScan`
2. ✅ Aparecen en la tabla "Visitas Recientes" del admin
3. ✅ Se contabilizan visitas para niveles
4. ✅ Los beneficios se aplican correctamente

---

## 🆘 Troubleshooting

### "API Key de local inválida"

**Causa**: La `NEXT_PUBLIC_LOCAL_API_KEY` no coincide con ningún `Local.apiKey` en la BD.

**Solución**:
1. Verifica el valor en Vercel Settings → Environment Variables
2. Verifica que existe un Local con esa apiKey:
   ```sql
   SELECT * FROM "Local" WHERE "apiKey" = 'TU_API_KEY';
   ```
3. Si no existe, créalo con ese apiKey

### Los eventos no aparecen en la tabla

**Causa**: El evento se registra pero no aparece en "Visitas Recientes".

**Solución**:
1. Verifica que se está guardando en la BD:
   ```sql
   SELECT * FROM "EventoScan" ORDER BY timestamp DESC LIMIT 10;
   ```
2. Si aparecen ahí pero no en el admin, el problema está en el endpoint de métricas

### Error: "cliente no encontrado o inactivo"

**Causa**: El cliente existe pero su `estado` no es `'ACTIVO'`.

**Solución**:
```sql
UPDATE "Cliente" 
SET estado = 'ACTIVO' 
WHERE phone = 'NUMERO_DEL_CLIENTE';
```

---

## 📝 Resumen Rápido

```bash
# 1. Generar API Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Crear Local en Neon
INSERT INTO "Local" (id, nombre, tipo, "apiKey")
VALUES (gen_random_uuid(), 'Coques Cafeteria', 'cafeteria', 'API_KEY_AQUI');

# 3. Configurar en Vercel
# → Settings → Environment Variables → Add
# NEXT_PUBLIC_LOCAL_API_KEY = API_KEY_AQUI

# 4. Redeploy
git commit --allow-empty -m "Trigger redeploy"
git push
```
