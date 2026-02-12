# Checklist de Prueba - Mesas desde Base de Datos

## ✅ Qué Verificar en el Navegador

### 1. Consola del Navegador (F12)
Cuando abras `/local`, deberías ver:
```
Mesas cargadas: 29
```

Si ves un error, será uno de estos:
- `Error al cargar mesas: 401` → API key incorrecta
- `Error al cargar mesas: 404` → Ruta incorrecta
- `Error al cargar mesas: 500` → Error del servidor

### 2. Visual del Salón
- Deberían aparecer las 29 mesas en el layout
- Las mesas deben tener los mismos nombres (S1, S2, ..., G21, etc.)
- Las posiciones deben ser las mismas que antes

### 3. Al Seleccionar una Mesa
- La mesa debe resaltarse visualmente
- Al hacer hover debe mostrar el nombre

### 4. Al Registrar un Evento
En la consola deberías ver:
```javascript
Enviando evento: {
  clienteId: "uuid-del-cliente",
  mesaId: "uuid-largo-de-la-mesa",  // ← Esto debe ser un UUID largo, NO 's2'
  tipoEvento: "VISITA",
  beneficioId: null,
  metodoValidacion: "QR"
}
```

**IMPORTANTE**: El `mesaId` debe ser algo como:
```
"a1b2c3d4-5678-90ab-cdef-1234567890ab"
```

NO debe ser:
```
"s2"  // ← Esto es incorrecto
```

### 5. Verificar en Neon
Después de registrar un evento, ejecutá en Neon:

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
WHERE e.timestamp >= NOW() - INTERVAL '5 minutes'
ORDER BY e.timestamp DESC;
```

Deberías ver el nombre de la mesa en la columna `mesa` (ej: "S2", "G21")

---

## ❌ Problemas Comunes

### Problema 1: Las mesas no se cargan
**Síntoma**: Layout vacío, sin mesas

**Debug**:
```javascript
// En consola del navegador:
fetch('/api/mesas', {
  headers: { 'x-local-api-key': 'TU_API_KEY_AQUI' }
}).then(r => r.json()).then(console.log)
```

**Soluciones**:
- Verificá que el `.env.local` tenga `NEXT_PUBLIC_LOCAL_API_KEY`
- Verificá que la API key coincida con la de la base de datos

### Problema 2: Sigue enviando 's2' en lugar de UUID
**Síntoma**: Error "Invalid uuid" en el registro de evento

**Debug**:
```javascript
// Ver qué mesas se cargaron:
console.log(mesas)
```

**Soluciones**:
- Refrescá la página con Ctrl + F5 (hard refresh)
- Verificá que las mesas se hayan creado en Neon
- Verificá que el LOCAL_ID sea correcto

### Problema 3: Error 401 al cargar mesas
**Síntoma**: Console log: "Error al cargar mesas: 401"

**Causa**: API key incorrecta o no configurada

**Solución**:
```bash
# En fidelizacion-zona/.env.local
NEXT_PUBLIC_LOCAL_API_KEY=tu-api-key-correcta
```

Reiniciá el servidor de desarrollo después de cambiar el `.env.local`

---

## 🎯 Resultado Esperado

### Flujo Completo Exitoso:
1. ✅ Abrir `/local`
2. ✅ Ver las 29 mesas en el layout
3. ✅ Escanear QR o validar OTP de un cliente
4. ✅ Seleccionar una mesa (ej: S2)
5. ✅ Click en "Confirmar visita"
6. ✅ Ver mensaje de éxito
7. ✅ En Neon, verificar que `EventoScan.mesaId` es un UUID válido
8. ✅ Query con JOIN muestra el nombre de la mesa correctamente

### Datos en la Base de Datos:
```
EventoScan:
- id: [UUID del evento]
- clienteId: [UUID del cliente]
- mesaId: [UUID de la mesa] ← ¡ESTO ES LO IMPORTANTE!
- timestamp: [fecha/hora]
- tipoEvento: "VISITA"

Mesa:
- id: [UUID de la mesa]
- nombre: "S2"
- localId: "65ceb6c8-cf0b-4e9b-8ed3-0bca399332df"
```

---

## 📊 Query para Analizar Uso de Mesas

Una vez que tengas varios eventos registrados:

```sql
-- Top 5 mesas más usadas
SELECT 
  m.nombre,
  COUNT(e.id) as total_visitas
FROM "Mesa" m
LEFT JOIN "EventoScan" e ON e."mesaId" = m.id
WHERE m."localId" = '65ceb6c8-cf0b-4e9b-8ed3-0bca399332df'
GROUP BY m.id, m.nombre
ORDER BY total_visitas DESC
LIMIT 5;

-- Visitas de hoy por mesa
SELECT 
  m.nombre,
  COUNT(e.id) as visitas_hoy
FROM "Mesa" m
LEFT JOIN "EventoScan" e ON e."mesaId" = m.id
WHERE m."localId" = '65ceb6c8-cf0b-4e9b-8ed3-0bca399332df'
  AND e.timestamp >= CURRENT_DATE
  AND e."tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
GROUP BY m.id, m.nombre
ORDER BY visitas_hoy DESC;

-- Última visita por mesa
SELECT 
  m.nombre,
  MAX(e.timestamp) as ultima_visita,
  c.nombre as ultimo_cliente
FROM "Mesa" m
LEFT JOIN "EventoScan" e ON e."mesaId" = m.id
LEFT JOIN "Cliente" c ON e."clienteId" = c.id
WHERE m."localId" = '65ceb6c8-cf0b-4e9b-8ed3-0bca399332df'
GROUP BY m.id, m.nombre, c.nombre
ORDER BY ultima_visita DESC NULLS LAST;
```
