# APRENDIZAJES DE PROYECTOS ANTERIORES
# Extraído de: coques (sistema de compras/stock) y lavadero (SaaS multi-tenant)
# Aplicar como checklist antes y durante el desarrollo con RooCode/Antigravity.

---

## 1. ZONA HORARIA — CRÍTICO

**Problema vivido:** El servidor de Vercel corre en UTC. `new Date()` devuelve hora UTC,
no hora Argentina (UTC-3). Esto causó errores 500 en producción y cálculos de demora
incorrectos (-248 min en lugar de -68 min).

### En TypeScript:
```typescript
// ❌ NUNCA
const hoy = new Date().toISOString().split('T')[0];
const ahora = new Date();

// ✅ SIEMPRE — usar esto en toda la app
function getFechaArgentina(): string {
  const ahora = new Date();
  const offsetArgentina = -3 * 60;
  const ahoraArg = new Date(ahora.getTime() + (offsetArgentina + ahora.getTimezoneOffset()) * 60000);
  return ahoraArg.toISOString().split('T')[0];
}

function getDatetimeArgentina(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
  );
}
```

### En SQL (Prisma raw o queries directas):
```sql
-- ✅ CORRECTO: timezone como literal, NUNCA como variable
SELECT NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires'

-- ❌ INCORRECTO: falla silenciosamente con error 500 en producción
const TZ = 'America/Argentina/Buenos_Aires';
await sql`SELECT NOW() AT TIME ZONE '${TZ}'`; -- ${} se interpreta como parámetro $1
```

### TIMESTAMP vs TIMESTAMPTZ:
```sql
-- ❌ Mezclar tipos causa offsets inesperados en columnas GENERATED
INSERT INTO tabla (inicio, fin)
VALUES (${fecha}::TIMESTAMP, NOW()); -- NOW() es TIMESTAMPTZ, tipos incompatibles

-- ✅ Ambos campos en el mismo tipo
INSERT INTO tabla (inicio, fin)
VALUES (
  ${fecha}::TIMESTAMP,
  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIMESTAMP
);
```

**Aplicación en este proyecto:**
- El límite "mismo día" para visitas usa la función `getDatetimeArgentina()` ✅ ya implementado
- Los EventoScan tienen timestamp server-side ✅ ya implementado
- Verificar que el job de inactividad use fecha Argentina al comparar

---

## 2. SEGURIDAD SQL

**Problema vivido:** Múltiples endpoints con concatenación de strings en queries.
Un atacante podía enviar inputs maliciosos.

### Con Prisma (nuestra stack):
```typescript
// ✅ Prisma usa parámetros automáticamente — esto ya es seguro:
await prisma.cliente.findMany({
  where: { phone: phone }  // Prisma parametriza solo
});

// ⚠️ Si usás prisma.$queryRaw, usar Prisma.sql``:
import { Prisma } from '@prisma/client';
await prisma.$queryRaw(Prisma.sql`SELECT * FROM "Cliente" WHERE phone = ${phone}`);

// ❌ NUNCA:
await prisma.$queryRaw(`SELECT * FROM "Cliente" WHERE phone = '${phone}'`);
```

### Whitelist para inputs dinámicos:
```typescript
// Si algún endpoint recibe nombre de tabla o campo como parámetro
const CAMPOS_VALIDOS = ['nivelId', 'estado', 'phone'] as const;
if (!CAMPOS_VALIDOS.includes(campo)) {
  return badRequest('Campo inválido');
}
```

---

## 3. MANEJO DE TOKENS JWT — CRÍTICO

**Problema vivido:** Los tokens expiraban después de 7 días y el sistema fallaba
con error 500 sin mensaje claro. El usuario no sabía qué pasó.

### Implementar en este proyecto:
```typescript
// En lib/auth.ts — agregar detección de expiración
import jwt from 'jsonwebtoken';

export function verificarToken(token: string): 'valid' | 'expired' | 'invalid' {
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return 'valid';
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') return 'expired';
    return 'invalid';
  }
}

// En los endpoints que requieren auth:
const tokenStatus = verificarToken(token);
if (tokenStatus === 'expired') {
  return NextResponse.json(
    { error: 'Sesión expirada. Volvé a abrir tu Pass.', code: 'TOKEN_EXPIRED' },
    { status: 401 }
  );
}
```

### En el Pass (frontend):
```typescript
// Si la API devuelve 401 con code TOKEN_EXPIRED, mostrar mensaje claro
if (res.status === 401) {
  const data = await res.json();
  if (data.code === 'TOKEN_EXPIRED') {
    // Mostrar: "Tu sesión expiró. Pedile al local que te reactive el Pass."
    // NO mostrar error genérico de red
  }
}
```

**Tiempo de vida del token recomendado:** 30 días (en lugar de 7 — reduce fricción para
clientes que vienen 1 vez por semana).

---

## 4. SECRETS Y VARIABLES DE ENTORNO — CRÍTICO

**Problema vivido:** Una API key de Neon quedó expuesta en un archivo .md que se subió
a GitHub. Vercel y GitHub la detectaron automáticamente.

### Reglas:
1. **NUNCA pegar keys reales en archivos .md, comentarios o código**
2. **Verificar `.gitignore` antes del primer commit** — debe incluir `.env.local`
3. **En documentación, usar siempre placeholders:** `NEON_API_KEY=napi_xxxx...`
4. **Variables de entorno necesarias para este proyecto:**

```bash
# .env.example (este archivo SÍ va al repo, con valores placeholder)
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
JWT_SECRET="cambiar-por-string-aleatorio-largo"
ADMIN_KEY="cambiar-por-string-aleatorio"
JOB_SECRET="cambiar-por-string-aleatorio"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Generación de secrets seguros:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. **En Vercel, agregar todas las variables antes del primer deploy**

---

## 5. BASE DE DATOS — DISEÑO DE SCHEMAS

**Problemas vividos:**
- Columna `cantidad INTEGER NOT NULL` mostraba "0" cuando debería estar vacía
- Columna `VARCHAR(50)` muy corta rompió cuando se guardaban strings más largos
- Mezclar `created_at` y `submitted_at` para la misma cosa en distintas tablas

### Reglas de diseño:

```
Regla de oro: "Si puede estar vacío en la UI → debe ser NULL en la BD"

NOT NULL solo para: IDs, created_at, campos que SIEMPRE tienen valor
NULL para: notas, fechas opcionales, valores calculados, snapshots

0 vs NULL:
  - Usar 0: contadores que empiezan en 0 (inscriptosCount, visitasDescontadas)
  - Usar NULL: "sin dato" (notas, snapshots opcionales)
```

### Checklist antes de crear una tabla:
- [ ] ¿Qué campos pueden estar vacíos? → deben ser nullable
- [ ] ¿Los VARCHAR son suficientemente largos? (usar TEXT si no hay límite real)
- [ ] ¿Los nombres de columnas son consistentes con el resto del schema?
  - Siempre `created_at`, nunca `submitted_at`, `fecha_creacion`, `insertedAt`
  - Siempre `updated_at`, nunca `modified_at`, `last_update`
- [ ] ¿Los enums están correctamente definidos?
- [ ] ¿Hay índices en los campos que se usan en WHERE frecuentemente?

### En este proyecto — verificar estos campos:
```prisma
// ✅ Ya bien diseñado en el schema actual:
notas       String?   // nullable — correcto
accionUrl   String?   // nullable — correcto
imagenUrl   String?   // nullable — correcto

// ⚠️ Verificar que Prisma genere estos índices al hacer db push:
// @@index([clienteId, timestamp]) — para queries de visitas
// @@index([clienteId, leida])     — para queries de noticias
```

---

## 6. DEPLOYMENT — NEON + VERCEL

**Lecciones del lavadero (stack idéntico al nuestro):**

### Neon: pooled vs direct URL
```
El driver @neondatabase/serverless requiere URL DIRECTA (no pooled).
El cliente Prisma funciona con ambas, pero direct es más compatible.

En Neon Console:
- Copiar "Connection string" → elegir "Direct connection" (no el pooler)
- Si ves "pooler.neon.tech" en la URL → es pooled
- Si ves solo "neon.tech" → es direct
```

### Secuencia de deploy en Vercel (aprendida a las malas):
```
1. git init + commit inicial
2. Push a GitHub
3. Importar en Vercel (Deploy — va a fallar, es normal)
4. En Vercel > Storage: crear Neon Postgres y conectar al proyecto
   (Vercel agrega DATABASE_URL automáticamente)
5. Agregar las variables restantes manualmente:
   JWT_SECRET, ADMIN_KEY, JOB_SECRET
6. Redeploy
7. En Neon Console > Query: ejecutar prisma db push manualmente
   (o configurar un migration endpoint)
```

### Crons en Vercel:
```json
// vercel.json — ya está en el proyecto
{
  "crons": [
    { "path": "/api/jobs/inactividad", "schedule": "0 3 * * *" }
  ]
}
// El job se llama con Authorization: Bearer ${JOB_SECRET}
// En local, llamarlo manualmente con curl para testear
```

---

## 7. UX/UI — PATRONES PROBADOS

### Inputs con buen contraste (problema común en apps internas):
```tsx
// ✅ SIEMPRE usar esto — no el default de Tailwind
className="px-4 py-3 bg-white text-gray-900 border-2 border-gray-300 
           rounded-lg placeholder-gray-500 focus:border-blue-500 
           focus:ring-2 focus:ring-blue-200 outline-none"

// ❌ EVITAR — texto casi invisible en móvil
className="border border-gray-200 px-3 py-2"
```

### Estados progresivos en botones (patrón de 3 estados):
```tsx
// Cualquier acción asíncrona debe tener 3 estados visuales:
// 1. Disponible → color llamativo, clickeable
// 2. En proceso → spinner, deshabilitado, texto "Procesando..."
// 3. Completado → verde/badge, no clickeable

// Ejemplo aplicable al Pass del cliente:
{!inscripto && cupoDisponible > 0 && (
  <button className="bg-blue-600 text-white">Anotarme</button>
)}
{procesando && (
  <button disabled className="bg-gray-400 text-white cursor-not-allowed">
    Procesando...
  </button>
)}
{inscripto && (
  <div className="bg-green-100 text-green-800 rounded px-3 py-2">
    ✅ Estás anotado
  </div>
)}
```

### Auto-refresh inteligente (Page Visibility API):
```typescript
// Para el QR del Pass que se refresca cada 30seg:
// Pausar cuando la pestaña está oculta (ahorra batería en móvil)
useEffect(() => {
  let interval: NodeJS.Timeout;

  const handleVisibility = () => {
    if (document.hidden) {
      clearInterval(interval);
    } else {
      interval = setInterval(refrescarQR, 30000);
      refrescarQR(); // refresh inmediato al volver
    }
  };

  if (!document.hidden) {
    interval = setInterval(refrescarQR, 30000);
  }
  document.addEventListener('visibilitychange', handleVisibility);
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}, []);
```

---

## 8. GIT Y COMMITS

**Lección vivida:** Funcionalidad desarrollada localmente que nunca se commiteó.
Al día siguiente "dejó de funcionar" — en realidad nunca había estado en el repo.

**Regla de oro:** "Si funciona en tu navegador, debe estar en Git INMEDIATAMENTE."

```bash
# Formato de commits:
git commit -m "feat: agregar endpoint inscripciones a eventos"
git commit -m "fix: corregir límite diario de visitas en TZ Argentina"
git commit -m "security: no exponer token en respuesta de activación"
git commit -m "refactor: extraer lógica de penalidad a función separada"
git commit -m "docs: actualizar REGLAS.md con regla de penalidad"

# Tipos: feat | fix | security | refactor | perf | docs | chore
```

---

## 9. PROTECCIÓN DE DATOS Y SOFT DELETES

**Lección del lavadero:** Los EventoScan nunca se deben borrar — son la fuente de verdad.
Un borrado accidental es irrecuperable si no hay soft delete.

**Ya implementado en este proyecto:**
- `contabilizada: false` en lugar de borrar eventos penalizados ✅
- Noticias append-only (no se borran) ✅

**Pendiente de implementar (cuando haya tiempo):**
```typescript
// Para tablas críticas, considerar agregar soft delete:
eliminado     Boolean    @default(false)
eliminadoAt   DateTime?
// Filtrar siempre: where: { eliminado: false }
```

**Tabla de auditoría para operaciones sensibles:**
```typescript
// Candidatos para loguear en auditoría:
// - Cambio de nivel de un cliente (aunque no hay manual, el cron lo hace)
// - Cancelación con penalidad (ya genera Noticia — suficiente por ahora)
// - Creación/cancelación de eventos especiales
```

---

## 10. PERFORMANCE — EVITAR N+1 QUERIES

**Problema vivido:** Página de compras tardaba >10 segundos. Había 250+ queries
por cada página cargada. Solución: caché en memoria + JOINs.

**En este proyecto, los lugares de riesgo:**

```typescript
// ❌ N+1 — si se necesita nivel + beneficios de varios clientes
for (const cliente of clientes) {
  const nivel = await prisma.nivel.findUnique({ where: { id: cliente.nivelId } });
  const beneficios = await prisma.beneficio.findMany({ ... });
}

// ✅ Include en la misma query
const clientes = await prisma.cliente.findMany({
  include: {
    nivel: true,
    inscripciones: { where: { estado: 'CONFIRMADA' } }
  }
});

// ✅ Para datos que no cambian (niveles, beneficios base):
// Cachear en memoria con invalidación manual
let cachedNiveles: Nivel[] | null = null;
export async function getNiveles() {
  if (cachedNiveles) return cachedNiveles;
  cachedNiveles = await prisma.nivel.findMany({ orderBy: { orden: 'asc' } });
  return cachedNiveles;
}
```

---

## 11. CHECKLIST PRE-DEPLOY

Antes de cada push a producción:

- [ ] ¿Funciona correctamente en local?
- [ ] ¿Hice `git status` y commiteé TODOS los archivos?
- [ ] ¿El mensaje de commit describe qué cambió?
- [ ] ¿No hay console.log() de debug?
- [ ] ¿Las variables de entorno están en Vercel?
- [ ] ¿Verifiqué que no hardcodeé ninguna API key o secret?
- [ ] ¿Corrí `npx prisma validate` si cambié el schema?
- [ ] ¿Las migraciones nuevas son idempotentes (IF NOT EXISTS)?

---

## 12. TESTING MANUAL DESPUÉS DE CAMBIOS

Después de cada funcionalidad, verificar:

**Sistema de visitas:**
- [ ] Escanear QR → registra EventoScan con `contabilizada: true`
- [ ] Escanear QR dos veces el mismo día → segunda visita tiene `contabilizada: false`
- [ ] Verificar que el nivel sube cuando corresponde

**Eventos especiales:**
- [ ] Crear evento desde admin → aparece en Pass de clientes con nivel correcto
- [ ] Inscribirse → decrementa cupo, crea noticia
- [ ] Cancelar con >48hs → sin penalidad, libera cupo
- [ ] Cancelar con <48hs → descuenta 2 visitas, crea noticia de advertencia

**Lavadero:**
- [ ] Cambiar estado a EN_LAVADO → habilita café gratis para clientes Plata+
- [ ] Cambiar estado a LISTO → crea noticia "Tu auto está listo"
- [ ] Verificar que el Pass del cliente muestra el estado del auto

**Noticias:**
- [ ] Subir de nivel → genera noticia de tipo NIVEL
- [ ] Inscribirse a evento → genera noticia de tipo EVENTO
- [ ] Contador de no leídas se actualiza al leer

---

## 13. DEBUGGING DE CONEXIONES DE BD

**Lección del lavadero:** El sistema conectaba a la BD incorrecta silenciosamente.

**Agregar logs claros en funciones de BD:**
```typescript
// En lib/prisma.ts o en funciones críticas:
console.log('========================================');
console.log('[DB] Conectando a:', process.env.DATABASE_URL?.split('@')[1]); // host only
console.log('[DB] Operación:', operacion);
console.log('========================================');
```

**Si algo falla en producción, verificar en Vercel Logs:**
- ¿A qué BD se conectó?
- ¿Qué query se ejecutó?
- ¿Qué error devolvió Postgres?

---

**Fuente:** Experiencia real de proyectos coques (2025-2026) y lavadero (2026)
**Aplicar antes de empezar cada sesión de desarrollo con RooCode**
