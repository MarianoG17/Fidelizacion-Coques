# 🐛 Debug: Descuentos no se Visualizan

## Paso 1: Verificar que los Descuentos estén Configurados en la BD

**Ejecutar en Neon Console:**
```sql
SELECT "nombre", "orden", "descuentoPedidosTortas" 
FROM "Nivel" 
ORDER BY "orden";
```

**Resultado esperado:**
- Bronce: 5
- Plata: 10
- Oro: 15
- Platino: 20 (si existe)

**Si todos están en 0**, ejecutar:
```sql
UPDATE "Nivel" SET "descuentoPedidosTortas" = 5 WHERE "nombre" = 'Bronce';
UPDATE "Nivel" SET "descuentoPedidosTortas" = 10 WHERE "nombre" = 'Plata';
UPDATE "Nivel" SET "descuentoPedidosTortas" = 15 WHERE "nombre" = 'Oro';
UPDATE "Nivel" SET "descuentoPedidosTortas" = 20 WHERE "nombre" = 'Platino';
```

## Paso 2: Verificar el Nivel del Usuario

**En la app, abrir DevTools (F12) y ejecutar en Console:**
```javascript
// Ver el token
localStorage.getItem('token')

// Llamar a /api/pass para ver tu nivel
fetch('/api/pass', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(d => console.log('Mi nivel:', d.data.nivel))
```

**Verificar:**
- ¿El nivel tiene nombre? (ej: "Bronce")
- ¿Tiene el campo `descuentoPedidosTortas`?
- ¿El valor es > 0?

## Paso 3: Verificar que el Deploy Terminó

1. Ir a tu dashboard de Vercel
2. Verificar que el último deploy (commit `12c9022`) esté en estado "Ready"
3. Si está "Building", esperar a que termine

## Paso 4: Limpiar Caché del Navegador

1. En la página de tortas, hacer **Ctrl + Shift + R** (hard refresh)
2. O limpiar caché completo:
   - Chrome: DevTools > Network > ✓ Disable cache
   - Luego refrescar la página

## Paso 5: Verificar Errores en Console

**En /tortas, abrir DevTools (F12) y buscar:**
- Errores en la tab "Console"
- Errores de red en la tab "Network"
- Específicamente buscar el request a `/api/pass`

**Copiar y pegar cualquier error que veas**

## Paso 6: Verificar el Request a /api/pass

**En DevTools > Network:**
1. Refrescar /tortas
2. Buscar el request a "pass"
3. Ver la respuesta (Response tab)
4. Verificar que incluya:
```json
{
  "data": {
    "nivel": {
      "nombre": "Bronce",
      "descuentoPedidosTortas": 5
    }
  }
}
```

## Soluciones Comunes

### Si descuentoPedidosTortas = 0:
```sql
-- Ejecutar en Neon Console
UPDATE "Nivel" SET "descuentoPedidosTortas" = 5 WHERE "nombre" = 'Bronce';
```

### Si el campo no existe en la respuesta:
```bash
# Regenerar Prisma Client en Vercel
# Ir a Vercel > Settings > Redeploy
```

### Si el deploy no terminó:
- Esperar a que Vercel termine el build
- Verificar que no haya errores en el deploy log

### Si el navegador tiene caché:
- Ctrl + Shift + R para hard refresh
- O abrir en ventana incógnita

## Script SQL Rápido para Verificar Todo

```sql
-- Ver niveles y sus descuentos
SELECT "nombre", "orden", "descuentoPedidosTortas" 
FROM "Nivel" 
ORDER BY "orden";

-- Ver tu cliente y su nivel
SELECT c."nombre", c."phone", n."nombre" as nivel, n."descuentoPedidosTortas"
FROM "Cliente" c
LEFT JOIN "Nivel" n ON c."nivelId" = n."id"
WHERE c."phone" = 'TU_TELEFONO_AQUI';
```
