# 🔧 Configuración de Integración DeltaWash (SOLO LECTURA)

## ⚠️ IMPORTANTE

Esta integración es **SOLO de LECTURA**. No modifica, inserta ni elimina datos en la base DeltaWash Legacy.

---

## 📋 Requisitos

1. **Base de datos DeltaWash Legacy** debe estar en Neon o accesible vía PostgreSQL
2. **Estructura de tablas esperada:**
   - Tabla: `Cliente` con campo `phone` (E.164 format: +5491112345678)
   - Tabla: `estado` con campos:
     - `clienteId` (FK a Cliente.id)
     - `patente` (patente del auto)
     - `estado` (valores: "en proceso", "listo", "entregado")
     - `updatedAt` (timestamp de última actualización)
     - `notas` (opcional, observaciones sobre el lavado)

---

## 🔐 Configuración de Variables de Entorno

### En Vercel

1. Ir a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agregar nueva variable:

```
DELTAWASH_DATABASE_URL = postgresql://usuario:password@host.neon.tech/dbname?sslmode=require
```

**IMPORTANTE:** Por seguridad, considera crear un usuario de SOLO LECTURA:

```sql
-- En tu base DeltaWash, ejecutar:
CREATE USER fidelizacion_readonly WITH PASSWORD 'password_seguro_aqui';
GRANT CONNECT ON DATABASE deltawash TO fidelizacion_readonly;
GRANT USAGE ON SCHEMA public TO fidelizacion_readonly;
GRANT SELECT ON "Cliente", "estado" TO fidelizacion_readonly;
```

Luego usar este usuario en la connection string.

### En Local (.env.local)

```env
# Base de datos principal (Fidelización)
DATABASE_URL="postgresql://..."

# Base de datos DeltaWash Legacy (SOLO LECTURA)
DELTAWASH_DATABASE_URL="postgresql://fidelizacion_readonly:password@host.neon.tech/deltawash?sslmode=require"

# JWT Secret
JWT_SECRET="tu_secret_aqui"
```

---

## 📊 Estructura Esperada en DeltaWash

### Tabla `Cliente`

```sql
CREATE TABLE "Cliente" (
  id UUID PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,  -- Formato E.164: +5491112345678
  nombre VARCHAR(255),
  email VARCHAR(255),
  ...
);
```

### Tabla `estado` (no `EstadoAuto`)

```sql
CREATE TABLE "estado" (
  id UUID PRIMARY KEY,
  "clienteId" UUID NOT NULL REFERENCES "Cliente"(id),
  patente VARCHAR(20) NOT NULL,
  estado VARCHAR(50) NOT NULL,  -- "en proceso", "listo", "entregado"
  notas TEXT,
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

**Estados válidos:**
- `"en proceso"` - Auto en lavado/secado
- `"listo"` - Listo para retirar
- `"entregado"` - Ya entregado al cliente

---

## 🔍 Cómo Funciona

### 1. Cliente ingresa con su auto al lavadero

```
DeltaWash Legacy (sistema existente):
- Recepcionista ingresa: Teléfono + Patente
- Se crea registro en tabla "estado" con estado "en proceso"
```

### 2. Cliente abre la app de Fidelización

```
GET /api/deltawash/estado-auto
Headers: Authorization: Bearer <jwt_del_cliente>

Respuesta:
{
  "autosEnLavadero": [
    {
      "patente": "ABC123",
      "estado": "en proceso",
      "updatedAt": "2026-02-13T15:30:00Z",
      "notas": "Lavado completo"
    }
  ],
  "totalEnProceso": 1
}
```

### 3. Se actualiza el estado en DeltaWash

```
Lavadero actualiza estado: "en proceso" → "listo"
Cliente ve el cambio en tiempo real en su app
```

### 4. Cliente retira su auto

```
Lavadero marca estado: "entregado"
Auto desaparece del listado del cliente
```

---

## ✅ Testing

### Verificar que la conexión funciona

```bash
# En tu terminal local
cd fidelizacion-zona
npm run dev

# En otra terminal, probar el endpoint
TOKEN="<jwt_de_un_usuario_real>"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/deltawash/estado-auto
```

**Respuesta esperada si NO hay autos:**
```json
{
  "autosEnLavadero": [],
  "mensaje": "No tienes autos en proceso de lavado"
}
```

**Respuesta esperada si HAY autos:**
```json
{
  "autosEnLavadero": [
    {
      "patente": "ABC123",
      "estado": "en proceso",
      "updatedAt": "...",
      "notas": "..."
    }
  ],
  "totalEnProceso": 1
}
```

---

## 🚨 Troubleshooting

### Error: "Integración con DeltaWash no configurada"

**Causa:** Variable `DELTAWASH_DATABASE_URL` no está configurada.

**Solución:** Agregar la variable en Vercel o en `.env.local`

---

### Error: "Connection refused"

**Causa:** Connection string incorrecta o base inaccesible.

**Verificar:**
1. Host correcto
2. Puerto (default: 5432)
3. Usuario/password correctos
4. `sslmode=require` al final del string

---

### No aparecen autos

**Verificar en DeltaWash:**

```sql
-- Ver autos en proceso de un teléfono específico
SELECT 
    c.phone,
    e.patente,
    e.estado,
    e."updatedAt"
FROM "estado" e
JOIN "Cliente" c ON c.id = e."clienteId"
WHERE c.phone = '+5491112345678'  -- Reemplazar con teléfono real
  AND LOWER(e.estado) != 'entregado';
```

Si no hay resultados:
1. El usuario no tiene autos en el lavadero
2. El teléfono no coincide con el formato E.164
3. Todos sus autos están en estado "entregado"

---

## 📝 Notas Técnicas

1. **Formato de teléfono:** Debe ser E.164 (+5491112345678) en ambas bases
2. **Case-insensitive:** Los estados se comparan con `LOWER()` para evitar problemas de mayúsculas
3. **No hay escritura:** El endpoint SOLO hace SELECT, nunca INSERT/UPDATE/DELETE
4. **Performance:** La consulta es rápida (usa índice en `clienteId`)
5. **Fallback:** Si DeltaWash no responde, la app sigue funcionando (no muestra la sección)

---

## 🎯 Próximos Pasos

Una vez configurada la variable `DELTAWASH_DATABASE_URL`:

1. ✅ Hacer push de los cambios
2. ✅ Vercel desplegará automáticamente
3. ✅ Agregar la variable en Vercel
4. ✅ Probar con un usuario real que tenga auto en el lavadero
5. ✅ Verificar que aparece en `/pass` o `/lavadero`

---

## 🔐 Seguridad

- ✅ Solo lectura (SELECT)
- ✅ Usuario ve SOLO sus autos (filtrado por teléfono del JWT)
- ✅ No expone datos de otros clientes
- ✅ Connection string con usuario limitado recomendado
- ✅ SSL obligatorio (sslmode=require)

---

**Última actualización:** 2026-02-13
**Autor:** Sistema de Fidelización Coques
