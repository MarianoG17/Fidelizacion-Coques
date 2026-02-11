# Migración: Sistema de Múltiples Autos por Cliente

## Resumen de Cambios

Se implementó un sistema que permite a cada cliente registrar múltiples autos (patentes) y trackear el estado de cada uno independientemente en el lavadero.

### Cambios en el Schema

**Antes:**
- Cliente 1:1 EstadoAuto (un cliente = un auto máximo)

**Después:**
- Cliente 1:N Auto (un cliente puede tener múltiples autos)
- Auto 1:1 EstadoAuto (cada auto tiene su estado actual)

### Nuevas Tablas

```prisma
model Auto {
  id            String         @id @default(uuid())
  clienteId     String
  patente       String         // normalizada: ABC123 o AB123CD
  marca         String?
  modelo        String?
  alias         String?        // "Auto de trabajo", "El rojo"
  activo        Boolean        @default(true)
  estadoActual  EstadoAuto?
  ...
}

model EstadoAuto {
  autoId        String         @unique
  auto          Auto           @relation(...)
  estado        EstadoAutoEnum
  ...
}
```

## Pasos para Migrar en Producción

### 1. Backup de Base de Datos

```bash
# En Neon o tu proveedor PostgreSQL, crear snapshot/backup antes de migrar
```

### 2. Ejecutar Migración Prisma

```bash
cd fidelizacion-zona
npx prisma migrate dev --name add_autos_system
```

O manualmente ejecutar el SQL en: `prisma/migrations/add_autos_table.sql`

### 3. Generar Cliente Prisma

```bash
npx prisma generate
```

### 4. Desplegar en Vercel

```bash
git add .
git commit -m "feat: implementar sistema de múltiples autos por cliente"
git push origin main
```

Vercel automáticamente ejecutará `prisma generate` en el build.

### 5. Verificar en Producción

- Acceder a `/lavadero` y registrar un auto con patente
- Verificar que el cliente pueda ver el auto en `/pass`
- Probar con múltiples autos para el mismo cliente

## Cambios en APIs

### POST /api/estados-auto

**Antes:**
```json
{
  "phone": "+5491112345678",
  "estado": "EN_LAVADO",
  "patente": "ABC123"  // opcional
}
```

**Ahora:**
```json
{
  "phone": "+5491112345678",
  "patente": "ABC 123",  // REQUERIDO (se normaliza automáticamente)
  "estado": "EN_LAVADO",
  "marca": "Toyota",     // opcional
  "modelo": "Corolla"    // opcional
}
```

### GET /api/pass

**Antes:**
```json
{
  "estadoAuto": {
    "estado": "EN_LAVADO",
    "updatedAt": "..."
  }
}
```

**Ahora:**
```json
{
  "autos": [
    {
      "id": "...",
      "patente": "ABC123",
      "marca": "Toyota",
      "modelo": "Corolla",
      "estadoActual": {
        "estado": "EN_LAVADO",
        "updatedAt": "..."
      }
    }
  ]
}
```

## Normalización de Patentes

### Formatos Soportados

- **Formato viejo**: ABC123 (3 letras + 3 números)
- **Formato Mercosur**: AB123CD (2 letras + 3 números + 2 letras)

### Normalización Automática

Cualquier input se normaliza:
- `abc 123` → `ABC123`
- `AB-123-CD` → `AB123CD`
- `ab 123 cd` → `AB123CD`

## UI Updates

### /pass (Pass del Cliente)
- Muestra todos los autos del cliente
- Indica cuáles están en el lavadero y su estado
- Formato visual mejorado con colores por estado

### /local (Panel del Local)
- Muestra todos los autos del cliente al escanear QR
- Diferencia visualmente autos en lavadero vs. históricos

### /lavadero (Panel del Lavadero)
- **Ahora requiere patente obligatoriamente**
- Guarda marca/modelo si se proporciona
- Diferencia autos por teléfono + patente (no solo teléfono)

## Migración de Datos Existentes

El script SQL automáticamente:
1. Crea un Auto por cada EstadoAuto existente
2. Vincula el EstadoAuto al Auto creado
3. Limpia registros huérfanos
4. Si había EstadoAuto sin patente, usa placeholder "MIGRADO"

## Testing Checklist

- [ ] Cliente puede ver múltiples autos en su pass
- [ ] Lavadero puede registrar nuevo auto con patente
- [ ] Estado se actualiza correctamente para el auto específico
- [ ] Cliente con 2 autos ve estados independientes
- [ ] Patentes se normalizan correctamente (ABC 123 → ABC123)
- [ ] Formato display muestra espacios (ABC123 → ABC 123)
- [ ] Beneficios se disparan al cambiar estado de auto
- [ ] Scanner QR muestra todos los autos del cliente

## Rollback

Si algo falla, restaurar desde el backup:

```sql
-- Restaurar desde snapshot en Neon
-- O ejecutar script de rollback:
DROP TABLE IF EXISTS "Auto";
-- ... recrear EstadoAuto viejo
```

## Próximos Pasos (Opcional - Futuro)

1. **Importación masiva**: CSV con phone,patente,marca,modelo
2. **Alias de autos**: Cliente puede nombrar sus autos
3. **Historial por auto**: Ver todas las visitas de un auto específico
4. **Notificaciones por auto**: "Tu Corolla está listo"
5. **Múltiples estados simultáneos**: Varios autos en lavadero al mismo tiempo
