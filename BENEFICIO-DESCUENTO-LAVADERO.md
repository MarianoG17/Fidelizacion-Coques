# 🚗💰 Beneficio: 20% Descuento en Cafetería - Auto en Lavadero

## 📋 Descripción

Cuando un cliente deja su auto en el lavadero, **automáticamente** recibe un **20% de descuento** en cafetería mientras espera.

---

## ✨ Características

### Activación Automática
- ✅ Se activa cuando el auto entra al lavadero (estado `EN_PROCESO`)
- ✅ Disponible para **todos los niveles** (Bronce, Plata, Oro, Platino)
- ✅ No requiere que el cliente lo solicite
- ✅ Aparece automáticamente en su pase digital
- ⚠️ **IMPORTANTE:** El cliente debe estar registrado en la app de Coques con el **mismo teléfono** que usa en el lavadero

### Duración y Límites
- ⏱️ **Duración:** 3 horas (180 minutos) desde activación
- 📅 **Máximo:** 1 uso por día
- 📊 **Máximo:** 10 usos por mes
- 💵 **Descuento:** 20% sobre el total de la compra en cafetería

### Instrucción para Caja
```
DESCUENTO 20% LAVADERO
Aplicar 20% desc. mientras espera su auto
```

---

## 🔄 Flujo Completo

### ⚠️ PRE-REQUISITO: Cliente Registrado en Ambos Sistemas

**IMPORTANTE:** Para que funcione el beneficio, el cliente debe:
1. ✅ Estar registrado en el **sistema del lavadero** (con su teléfono)
2. ✅ Estar registrado en la **app de Coques** (con el **mismo teléfono**)

Si el cliente es nuevo, debe:
- **Registrarse en la app de Coques primero** (con su celular)
- Activar su cuenta (código OTP)
- Luego, cuando deje el auto en el lavadero, el sistema detectará la coincidencia de teléfonos

---

### 1. Cliente llega al Lavadero
```
Cliente: "Hola, quiero dejar mi auto" [Cliente ya registrado en lavadero]
Empleado Lavadero: Escanea QR o ingresa teléfono + patente en /lavadero
Sistema: Registra auto con estado EN_PROCESO
Sistema: Busca si ese teléfono existe en la app de Coques
```

**Dos escenarios:**

**A) Cliente SÍ registrado en app Coques:**
```
✓ Sistema cruza bases de datos (mismo teléfono)
✓ Detecta: Auto en estado EN_PROCESO
✓ Activa beneficio: "20% descuento — Auto en lavadero"
✓ Beneficio aparece en /pass del cliente
```

**B) Cliente NO registrado en app Coques:**
```
✗ Sistema no encuentra el teléfono en DB de Coques
✗ El auto se registra, pero NO se activa beneficio
→ Empleado del lavadero puede decir:
   "¿Conocés la app de Coques? Registrate con este número
    y obtenés 20% descuento mientras esperás"
```

---

### 2. Cliente va a Cafetería Coques (NO al lavadero)
```
Cliente: Abre la app de Coques en su celular
Va a: /pass (su pase digital)
Ve:
  🚗 Tu auto: ABC 123 - En proceso
  💰 20% descuento — Auto en lavadero
      ↳ "DESCUENTO 20% LAVADERO - Aplicar 20% desc."
      ↳ Válido por 3 horas
```

**NOTA:** El lavadero NO tiene app para clientes. Todo el beneficio se usa en Coques.

---

### 3. Cliente Canjea en Caja de Coques
```
Cliente: Entra a la cafetería Coques (NO al lavadero)
Cliente: Muestra su QR/código al empleado de Coques
Empleado Coques: Escanea QR en /local (panel del local)
Sistema: Muestra beneficio activo del cliente
Empleado Coques: Ve instrucción "DESCUENTO 20% LAVADERO"
Empleado Coques: Aplica 20% descuento manualmente en Aires
Cliente: Paga 20% menos
```

### 5. Auto Listo
```
Lavadero: Actualiza estado a LISTO
Cliente: Ve notificación "Tu auto está listo"
Beneficio: Se mantiene activo hasta que retire el auto
```

### 6. Auto Entregado
```
Lavadero: Actualiza estado a ENTREGADO
Sistema: Desactiva el beneficio automáticamente
```

---

## 📊 Implementación Técnica

### Base de Datos

**Tabla:** `Beneficio`
```sql
id: 'beneficio-20porciento-lavadero'
nombre: '20% descuento — Auto en lavadero'
descripcionCaja: 'DESCUENTO 20% LAVADERO - Aplicar 20% desc. mientras espera su auto'
requiereEstadoExterno: true
estadoExternoTrigger: 'EN_PROCESO'
condiciones: {
  porcentajeDescuento: 20,
  maxPorDia: 1,
  maxPorMes: 10,
  duracionMinutos: 180
}
```

**Relación con Niveles:**
```
NivelBeneficio:
  - Bronce → beneficio-20porciento-lavadero
  - Plata → beneficio-20porciento-lavadero
  - Oro → beneficio-20porciento-lavadero
  - Platino → beneficio-20porciento-lavadero
```

### API

**Endpoint:** `POST /api/estados-auto`

```typescript
// Cuando se actualiza el estado del auto
const beneficiosTriggereados = await triggerBeneficiosPorEstado(
  cliente.id,
  'EN_PROCESO'
)

// Retorna:
[
  {
    id: 'beneficio-20porciento-lavadero',
    nombre: '20% descuento — Auto en lavadero',
    descripcionCaja: 'DESCUENTO 20% LAVADERO...'
  }
]
```

**Endpoint:** `GET /api/pass`

```typescript
// El cliente consulta sus beneficios activos
const beneficiosActivos = await getBeneficiosActivos(clienteId)

// Filtra automáticamente:
// - Si tiene auto en estado EN_PROCESO → Incluye el beneficio
// - Si no tiene auto en ese estado → NO incluye el beneficio
```

---

## 🚀 Instalación

### Paso 1: Ejecutar Script SQL

```bash
# Conectarse a la base de datos
psql $DATABASE_URL

# Ejecutar el script
\i scripts/crear-beneficio-descuento-lavadero.sql
```

**O desde la UI de Neon:**
1. Ir a Neon Dashboard
2. SQL Editor
3. Copiar y pegar el contenido de `scripts/crear-beneficio-descuento-lavadero.sql`
4. Ejecutar

### Paso 2: Verificar

```sql
-- Ver el beneficio creado
SELECT 
  b.id,
  b.nombre,
  b."descripcionCaja",
  b."estadoExternoTrigger",
  COUNT(nb."nivelId") as niveles_asignados
FROM "Beneficio" b
LEFT JOIN "NivelBeneficio" nb ON nb."beneficioId" = b.id
WHERE b.id = 'beneficio-20porciento-lavadero'
GROUP BY b.id, b.nombre, b."descripcionCaja", b."estadoExternoTrigger";
```

**Resultado esperado:**
```
id: beneficio-20porciento-lavadero
nombre: 20% descuento — Auto en lavadero
descripcionCaja: DESCUENTO 20% LAVADERO...
estadoExternoTrigger: EN_PROCESO
niveles_asignados: 4
```

### Paso 3: Probar

1. **Registrar un auto en el lavadero:**
   ```bash
   curl -X POST https://tu-app.vercel.app/api/estados-auto \
     -H "Content-Type: application/json" \
     -H "x-api-key: TU_LAVADERO_API_KEY" \
     -d '{
       "phone": "+5491112345678",
       "patente": "ABC123",
       "estado": "EN_PROCESO"
     }'
   ```

2. **Ver beneficios del cliente:**
   - Ingresar a la app con ese teléfono
   - Ir a `/pass`
   - Verificar que aparece el beneficio de 20% descuento

3. **Escanear en cafetería:**
   - Empleado escanea QR en `/local`
   - Debe mostrar el beneficio activo
   - Aplicar descuento en Aires manualmente

---

## 📝 Casos de Uso

### Caso 1: Cliente Nuevo (Solo Lavadero)
```
Cliente usa solo el lavadero (NO está registrado en app Coques)
→ Deja su auto
→ NO recibe beneficio (no tiene cuenta en Coques)
→ Empleado le sugiere descargar la app
→ Cliente se registra con su teléfono
→ Próxima vez que traiga el auto → SÍ recibe beneficio
```

### Caso 2: Cliente Regular del Lavadero (Registrado en Coques)
```
Cliente registrado en ambos sistemas (mismo teléfono)
Martes 10:00 → Deja auto, recibe 20% descuento, compra café en Coques
Martes 15:00 → Ya usó su descuento del día (maxPorDia: 1)
Miércoles 10:00 → Nuevo día, puede usar descuento otra vez
```

### Caso 3: Cliente con Múltiples Autos
```
Cliente tiene 2 autos en el lavadero simultáneamente
→ Solo 1 descuento activo (maxPorDia: 1)
→ Puede usar otro descuento al día siguiente
```

### Caso 4: Cliente Nuevo en Coques (Bronce)
```
Primera vez en lavadero
→ Beneficio disponible (todos los niveles)
→ 20% descuento mientras espera
→ Incentivo para volver
```

### Caso 5: Cliente Platino
```
Tiene beneficio 20% lavadero (este)
ADEMÁS tiene "Café gratis — Lavadero" (si existe)
→ Puede elegir cuál usar
→ Empleado en caja le consulta
```

---

## 🎨 UI en el Pase Digital

```
┌─────────────────────────────────────┐
│ 🚗 Tus Autos                        │
├─────────────────────────────────────┤
│ ABC 123                             │
│ Toyota Corolla                      │
│ 🟡 En proceso                       │
│ Actualizado: hace 15 min            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💰 Beneficios Disponibles           │
├─────────────────────────────────────┤
│ ✓ 20% descuento — Auto en lavadero │
│                                     │
│ Válido mientras esperás tu auto     │
│                                     │
│ → DESCUENTO 20% LAVADERO           │
│   Aplicar 20% desc. en caja        │
│                                     │
│ ⏱️ Válido por 3 horas               │
└─────────────────────────────────────┘
```

---

## 🔧 Configuración Avanzada

### Cambiar el Porcentaje de Descuento

```sql
-- Cambiar de 20% a 25%
UPDATE "Beneficio" 
SET condiciones = jsonb_set(
  condiciones, 
  '{porcentajeDescuento}', 
  '25'
)
WHERE id = 'beneficio-20porciento-lavadero';
```

### Cambiar la Duración

```sql
-- Cambiar de 3 horas (180 min) a 2 horas (120 min)
UPDATE "Beneficio" 
SET condiciones = jsonb_set(
  condiciones, 
  '{duracionMinutos}', 
  '120'
)
WHERE id = 'beneficio-20porciento-lavadero';
```

### Cambiar Límites de Uso

```sql
-- Permitir 2 usos por día en lugar de 1
UPDATE "Beneficio" 
SET condiciones = jsonb_set(
  condiciones, 
  '{maxPorDia}', 
  '2'
)
WHERE id = 'beneficio-20porciento-lavadero';
```

### Activar Solo para Niveles Premium

```sql
-- Remover de Bronce
DELETE FROM "NivelBeneficio" 
WHERE "beneficioId" = 'beneficio-20porciento-lavadero'
  AND "nivelId" IN (
    SELECT id FROM "Nivel" WHERE nombre = 'Bronce'
  );
```

### Desactivar Temporalmente

```sql
-- Desactivar sin borrar
UPDATE "Beneficio" 
SET activo = false 
WHERE id = 'beneficio-20porciento-lavadero';

-- Reactivar
UPDATE "Beneficio" 
SET activo = true 
WHERE id = 'beneficio-20porciento-lavadero';
```

---

## 📈 Métricas y Reportes

### Cantidad de Usos del Beneficio

```sql
SELECT 
  COUNT(*) as total_usos,
  COUNT(DISTINCT "clienteId") as clientes_unicos,
  DATE("timestamp") as fecha
FROM "EventoScan"
WHERE "beneficioId" = 'beneficio-20porciento-lavadero'
  AND "tipoEvento" = 'BENEFICIO_APLICADO'
GROUP BY DATE("timestamp")
ORDER BY fecha DESC
LIMIT 30;
```

### Clientes que Más Usan el Beneficio

```sql
SELECT 
  c.nombre,
  c.phone,
  n.nombre as nivel,
  COUNT(*) as veces_usado
FROM "EventoScan" es
JOIN "Cliente" c ON c.id = es."clienteId"
LEFT JOIN "Nivel" n ON n.id = c."nivelId"
WHERE es."beneficioId" = 'beneficio-20porciento-lavadero'
  AND es."tipoEvento" = 'BENEFICIO_APLICADO'
GROUP BY c.id, c.nombre, c.phone, n.nombre
ORDER BY veces_usado DESC
LIMIT 10;
```

### Conversión Lavadero → Cafetería

```sql
-- Clientes que usaron el lavadero y luego la cafetería
SELECT 
  DATE(es1."timestamp") as fecha,
  COUNT(DISTINCT es1."clienteId") as clientes_lavadero,
  COUNT(DISTINCT CASE 
    WHEN es2."localId" = (SELECT id FROM "Local" WHERE tipo = 'cafeteria' LIMIT 1)
    THEN es1."clienteId" 
  END) as clientes_usaron_cafeteria
FROM "EventoScan" es1
LEFT JOIN "EventoScan" es2 ON es2."clienteId" = es1."clienteId"
  AND DATE(es2."timestamp") = DATE(es1."timestamp")
  AND es2."beneficioId" = 'beneficio-20porciento-lavadero'
WHERE es1."localId" = (SELECT id FROM "Local" WHERE tipo = 'lavadero' LIMIT 1)
GROUP BY DATE(es1."timestamp")
ORDER BY fecha DESC
LIMIT 30;
```

---

## 🐛 Troubleshooting

### El beneficio no aparece para el cliente

**Verificar:**
1. ¿El auto está en estado `EN_PROCESO`?
   ```sql
   SELECT * FROM "EstadoAuto" 
   WHERE "autoId" IN (
     SELECT id FROM "Auto" WHERE "clienteId" = 'ID_DEL_CLIENTE'
   );
   ```

2. ¿El beneficio está activo?
   ```sql
   SELECT activo FROM "Beneficio" 
   WHERE id = 'beneficio-20porciento-lavadero';
   ```

3. ¿El cliente tiene un nivel asignado?
   ```sql
   SELECT c.nombre, n.nombre as nivel 
   FROM "Cliente" c 
   LEFT JOIN "Nivel" n ON n.id = c."nivelId"
   WHERE c.id = 'ID_DEL_CLIENTE';
   ```

4. ¿Ya usó el descuento hoy?
   ```sql
   SELECT COUNT(*) as usos_hoy
   FROM "EventoScan"
   WHERE "clienteId" = 'ID_DEL_CLIENTE'
     AND "beneficioId" = 'beneficio-20porciento-lavadero'
     AND DATE("timestamp") = CURRENT_DATE;
   ```

### El descuento no se aplica en caja

**Causa:** Este es un **descuento manual**, no automático en Aires.

**Solución:** El empleado debe:
1. Ver el beneficio en el scanner de `/local`
2. Leer la instrucción: "DESCUENTO 20% LAVADERO"
3. Aplicar el descuento manualmente en Aires (20% del total)

---

## 🎯 Ventajas del Beneficio

### Para el Negocio
- ✅ Incrementa ventas cruzadas (lavadero → cafetería)
- ✅ Fideliza clientes del lavadero
- ✅ Aumenta tráfico en cafetería durante horarios de menor demanda
- ✅ Diferenciador vs. competencia

### Para el Cliente
- ✅ Ahorro inmediato (20% off)
- ✅ Incentivo para esperar en la cafetería (no irse)
- ✅ Experiencia premium
- ✅ Disponible desde nivel Bronce (accesible)

---

## 📚 Documentos Relacionados

- [`scripts/crear-beneficio-descuento-lavadero.sql`](scripts/crear-beneficio-descuento-lavadero.sql) - Script de instalación
- [`INTEGRACION-LAVADERO-COQUES-ESTADO-ACTUAL.md`](INTEGRACION-LAVADERO-COQUES-ESTADO-ACTUAL.md) - Estado de integración
- [`src/lib/beneficios.ts`](src/lib/beneficios.ts) - Lógica de beneficios
- [`REGLAS.md`](REGLAS.md) - Reglas de negocio generales

---

**Implementado:** 2026-02-24  
**Autor:** Sistema de Fidelización Coques  
**Estado:** ✅ Listo para producción
