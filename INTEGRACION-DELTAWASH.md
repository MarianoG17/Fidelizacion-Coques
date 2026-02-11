# Integración DeltaWash Legacy → Fidelización Coques

## 🎯 Objetivo

Permitir que los clientes del programa de fidelización de Coques vean en tiempo real el estado de sus autos que están siendo lavados en DeltaWash, **sin pedirles la patente**.

---

## 🔒 Seguridad: ¿Cómo garantizamos que cada usuario vea solo SUS autos?

### ✅ Solución Implementada: Autenticación JWT

1. **El usuario se autentica** con su teléfono en el sistema de fidelización
2. **Recibe un JWT** que contiene su `clienteId` y `phone`
3. **El endpoint usa el teléfono del JWT** (no de la query string)
4. **Solo consulta autos** asociados a ESE teléfono en DeltaWash

```typescript
// ❌ INSEGURO: Cualquiera puede poner cualquier teléfono
GET /api/deltawash/estado-auto?phone=+5491112345678

// ✅ SEGURO: El teléfono viene del JWT autenticado
GET /api/deltawash/estado-auto
Headers: Authorization: Bearer <jwt_del_usuario>
```

### Flujo de Seguridad

```
Cliente solicita sus autos
         ↓
    Envía JWT
         ↓
Backend verifica JWT → Extrae phone del payload
         ↓
Consulta DeltaWash WHERE phone = <phone_del_jwt>
         ↓
Retorna SOLO los autos de ese teléfono
```

**Ventajas:**
- ✅ Usuario no puede ver autos de otros
- ✅ No requiere patente del usuario (mejor UX)
- ✅ Usa la autenticación existente
- ✅ Escalable y seguro

---

## 🏗️ Arquitectura

### Bases de Datos

```
┌─────────────────────────────────────┐
│   Base: Fidelización Coques         │
│   (DATABASE_URL)                    │
│                                     │
│   Clientes (phone, nivel, puntos)   │
│   Autos vinculados                  │
│   Beneficios aplicados              │
└─────────────────────────────────────┘
              ↓
         [Consulta JWT]
              ↓
┌─────────────────────────────────────┐
│   Base: DeltaWash Legacy            │
│   (DELTAWASH_DATABASE_URL)          │
│                                     │
│   Clientes (phone)                  │
│   EstadoAuto (patente, estado)      │
│                                     │
│   Estados: RECIBIDO, EN_LAVADO,     │
│           EN_SECADO, LISTO, ENTREGADO│
└─────────────────────────────────────┘
```

### Endpoints Creados

#### 1. GET /api/deltawash/estado-auto

**Propósito:** Consultar autos en proceso de lavado del usuario autenticado

**Headers:**
```
Authorization: Bearer <jwt_del_usuario>
```

**Response:**
```json
{
  "autosEnLavadero": [
    {
      "patente": "ABC123",
      "marca": "Toyota",
      "modelo": "Corolla",
      "alias": "Auto de trabajo",
      "estado": "EN_LAVADO",
      "updatedAt": "2026-02-11T22:30:00Z",
      "notas": "Lavado completo + encerado"
    }
  ],
  "totalEnProceso": 1
}
```

**Casos:**
- Si el usuario tiene autos en proceso → retorna la lista
- Si no tiene autos en proceso → retorna array vacío
- Si DELTAWASH_DATABASE_URL no está configurada → retorna array vacío con mensaje

#### 2. POST /api/deltawash/estado-auto

**Propósito:** Vincular un auto de DeltaWash con la cuenta de fidelización

**Headers:**
```
Authorization: Bearer <jwt_del_usuario>
```

**Body:**
```json
{
  "patente": "ABC 123"
}
```

**Funcionalidad:**
1. Verifica que el auto exista en DeltaWash con el teléfono del usuario
2. Crea el registro del auto en la base de fidelización
3. Permite enriquecer la info del auto (marca, modelo, alias)

---

## 📦 Configuración

### Variables de Entorno

```env
# .env.local o en Vercel

# Base de datos principal (Fidelización Coques)
DATABASE_URL="postgresql://user:pass@fidelizacion.neon.tech/neondb?sslmode=require"

# Base de datos DeltaWash Legacy (solo lectura recomendado)
DELTAWASH_DATABASE_URL="postgresql://user:pass@deltawash.neon.tech/neondb?sslmode=require"

# JWT Secret
JWT_SECRET="tu_secret_seguro_aqui"
```

### En Neon

1. **Obtener la URL de DeltaWash:**
   - Ir al proyecto DeltaWash en Neon
   - Copiar la Connection String
   - Pegarla en `DELTAWASH_DATABASE_URL`

2. **Permisos recomendados:**
   - Crear un usuario READ-ONLY para la conexión
   - Solo necesita SELECT en las tablas Cliente y EstadoAuto

```sql
-- En la base DeltaWash, crear usuario de solo lectura
CREATE USER fidelizacion_readonly WITH PASSWORD 'password_seguro';
GRANT CONNECT ON DATABASE deltawash TO fidelizacion_readonly;
GRANT USAGE ON SCHEMA public TO fidelizacion_readonly;
GRANT SELECT ON "Cliente", "EstadoAuto" TO fidelizacion_readonly;
```

---

## 🎨 Integración en el Frontend

### Actualizar /pass page

```typescript
// En src/app/pass/page.tsx

const [autosEnLavadero, setAutosEnLavadero] = useState([]);

useEffect(() => {
  const fetchDeltaWash = async () => {
    const token = localStorage.getItem('fidelizacion_token');
    
    const res = await fetch('/api/deltawash/estado-auto', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const data = await res.json();
    setAutosEnLavadero(data.autosEnLavadero);
  };
  
  fetchDeltaWash();
  const interval = setInterval(fetchDeltaWash, 10000); // refresh cada 10s
  return () => clearInterval(interval);
}, []);
```

### Mostrar en la UI

```tsx
{autosEnLavadero.length > 0 && (
  <div className="bg-blue-50 rounded-xl p-4 mb-4">
    <h3 className="font-bold text-blue-900 mb-2">
      🚗 Tus autos en el lavadero
    </h3>
    {autosEnLavadero.map((auto) => (
      <div key={auto.patente} className="bg-white rounded-lg p-3 mb-2">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-mono font-bold">
              {formatearPatenteDisplay(auto.patente)}
            </span>
            {auto.marca && (
              <span className="text-gray-600 ml-2">
                {auto.marca} {auto.modelo}
              </span>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            auto.estado === 'LISTO' 
              ? 'bg-green-100 text-green-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {ESTADO_AUTO_LABELS[auto.estado]}
          </span>
        </div>
        {auto.notas && (
          <p className="text-sm text-gray-500 mt-1">{auto.notas}</p>
        )}
      </div>
    ))}
  </div>
)}
```

---

## 🔄 Flujo Completo de Uso

### Caso: Cliente nuevo llega al lavadero

1. **En DeltaWash (sistema legacy):**
   - Recepcionista ingresa: Teléfono + Patente
   - Crea registro en EstadoAuto con estado RECIBIDO

2. **El cliente abre su app de Fidelización:**
   - Ya está autenticado (tiene JWT)
   - La app llama a `/api/deltawash/estado-auto`
   - Ve su auto con estado RECIBIDO

3. **Lavadero va actualizando:**
   - EN_LAVADO → EN_SECADO → LISTO
   - Cliente ve las actualizaciones en tiempo real

4. **Cliente retira su auto:**
   - DeltaWash marca como ENTREGADO
   - Desaparece del listado del cliente

### Caso: Cliente con auto registrado

Si el cliente ya tiene el auto vinculado en Fidelización:
- Se muestra marca, modelo y alias personalizado
- Mejor experiencia visual

---

## 📊 Consultas SQL Útiles

### Ver autos en proceso (DeltaWash)

```sql
SELECT 
    c.phone,
    ea.patente,
    ea.estado,
    ea."updatedAt"
FROM "EstadoAuto" ea
JOIN "Cliente" c ON c.id = ea."clienteId"
WHERE ea.estado != 'ENTREGADO'
ORDER BY ea."updatedAt" DESC;
```

### Ver autos vinculados (Fidelización)

```sql
SELECT 
    c.phone,
    c.nombre,
    a.patente,
    a.marca,
    a.modelo,
    a.alias
FROM "Auto" a
JOIN "Cliente" c ON c.id = a."clienteId"
WHERE a.activo = true;
```

---

## 🚀 Deploy

### En Vercel

1. Agregar variable de entorno:
   ```
   DELTAWASH_DATABASE_URL = <connection_string_deltawash>
   ```

2. Deploy automático al push:
   ```bash
   git add .
   git commit -m "feat: integración con DeltaWash en tiempo real"
   git push origin main
   ```

3. Verificar en logs que la conexión funciona

---

## 🧪 Testing

### Test manual del endpoint

```bash
# 1. Obtener JWT del usuario
TOKEN="<jwt_del_usuario>"

# 2. Consultar autos en lavadero
curl -H "Authorization: Bearer $TOKEN" \
  https://tu-app.vercel.app/api/deltawash/estado-auto

# 3. Vincular un auto
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patente":"ABC123"}' \
  https://tu-app.vercel.app/api/deltawash/estado-auto
```

### Checklist de Testing

- [ ] Usuario ve solo sus propios autos
- [ ] No puede ver autos de otros usuarios
- [ ] Auto con estado ENTREGADO no aparece
- [ ] Actualización cada 10 segundos funciona
- [ ] Si no hay conexión a DeltaWash, no rompe la app
- [ ] Marca/modelo se enriquecen desde base local si existen

---

## 🔧 Troubleshooting

### Error: "Cannot find name 'PrismaClient'"

El script usa dos instancias de Prisma. Asegúrate de tener instalado:
```bash
npm install @prisma/client
```

### Error: "Connection refused"

Verifica que `DELTAWASH_DATABASE_URL` sea correcta:
- Host correcto
- Puerto 5432
- sslmode=require
- Usuario/password correctos

### No aparecen autos

1. Verificar que existan en DeltaWash:
```sql
SELECT * FROM "EstadoAuto" 
WHERE "clienteId" IN (
  SELECT id FROM "Cliente" WHERE phone = '+54911...'
);
```

2. Verificar que el estado NO sea ENTREGADO

3. Verificar que el JWT del usuario sea válido

---

## 📝 Notas Importantes

1. **No migrar datos**: Esta es una integración en tiempo real, NO una migración. Los datos se quedan en DeltaWash.

2. **Performance**: La consulta es rápida (usa índices en phone). No afecta la experiencia del usuario.

3. **Privacidad**: Cada usuario solo ve SUS autos. El teléfono viene del JWT, no de la URL.

4. **Escalabilidad**: Si DeltaWash tiene muchos registros, considera agregar un índice:
```sql
CREATE INDEX idx_estadoauto_cliente_estado 
ON "EstadoAuto"("clienteId", "estado");
```

5. **Fallback**: Si DeltaWash no responde, la app sigue funcionando (solo no muestra esa sección).

---

## 🎁 Próximos Pasos (Opcional)

- [ ] Notificación push cuando el auto esté LISTO
- [ ] Historial de lavados (consultar todos los estados, no solo != ENTREGADO)
- [ ] Sincronización de marca/modelo desde DeltaWash
- [ ] Dashboard de administrador con métricas de ambas bases
