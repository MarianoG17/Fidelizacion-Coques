# 🎯 Próxima Sesión: Panel de Administración de Beneficios

## 📍 Estado Actual del Proyecto

### ✅ Completado
- **Frontend de cliente completo**: /pass, /logros, /historial, /perfil
- **Sistema de niveles**: Bronce, Plata, Oro con descripciones guardadas
- **Referidos**: Códigos únicos, tracking de activaciones
- **Gamificación**: 13 tipos de logros con XP
- **APIs funcionando**: Todas las APIs con SQL queries optimizadas
- **Zona horaria**: Timestamps en Argentina para cruce con ERP

### 📊 Datos Existentes en Base de Datos

**Niveles (tabla `Nivel`):**
- Bronce: Orden 1 - "🥤 Vaso de agua de cortesía con el almuerzo\n🔥 10% de descuento en cafetería después del almuerzo"
- Plata: Orden 2 - "🥤 Vaso de agua de cortesía con el almuerzo\n🔥 20% de descuento en cafetería después del almuerzo"
- Oro: Orden 3 - "🥤 Vaso de agua o limonada de cortesía con el almuerzo\n🔥 30% de descuento en cafetería después del almuerzo\n🎖️ Acceso prioritario a eventos especiales"

**Problema actual:** Estas descripciones son solo texto. No hay beneficios REALES que el staff pueda aplicar al escanear el QR.

---

## 🎯 Objetivo de la Próxima Sesión

Crear un **Panel de Administración de Beneficios** que permita:
1. Gestionar beneficios dinámicamente (crear, editar, eliminar)
2. Asignar beneficios a niveles con configuración de límites
3. Mostrar beneficios disponibles/usados en el pass del cliente
4. Aplicar beneficios automáticamente cuando el staff escanea el QR

---

## 📝 Especificaciones Detalladas

### 1. Base de Datos

**Tabla `Beneficio` (ya existe):**
- `id` - UUID
- `nombre` - String (ej: "Agua gratis", "Descuento 10%")
- `tipo` - Enum: DESCUENTO, PRODUCTO_GRATIS, UPGRADE, ACCESO_VIP
- `descuento` - Decimal (0.10 para 10%)
- `icono` - String opcional (emoji o URL)
- `esAcumulable` - Boolean
- `requiereValidacion` - Boolean
- `activo` - Boolean

**Tabla `NivelBeneficio` (ya existe):**
- Vincula beneficios con niveles
- `usosPorDia` - Int (límite diario, típicamente 1)
- `usosPorSemana` - Int opcional
- `usosPorMes` - Int opcional

### 2. Beneficios a Crear Inicialmente

#### Para Nivel Bronce:
1. **Agua Gratis**
   - Nombre: "Agua de cortesía"
   - Tipo: PRODUCTO_GRATIS
   - Icono: 🥤
   - Límite: 1 uso por día

2. **Descuento 10%**
   - Nombre: "10% descuento cafetería post-almuerzo"
   - Tipo: DESCUENTO
   - Descuento: 0.10
   - Icono: 🔥
   - Límite: 1 uso por día

#### Para Nivel Plata:
1. **Agua Gratis** (mismo que Bronce)
2. **Descuento 20%**
   - Nombre: "20% descuento cafetería post-almuerzo"
   - Tipo: DESCUENTO
   - Descuento: 0.20
   - Icono: 🔥
   - Límite: 1 uso por día

#### Para Nivel Oro:
1. **Agua o Limonada Gratis**
   - Nombre: "Agua o limonada de cortesía"
   - Tipo: PRODUCTO_GRATIS
   - Icono: 🥤
   - Límite: 1 uso por día

2. **Descuento 30%**
   - Nombre: "30% descuento cafetería post-almuerzo"
   - Tipo: DESCUENTO
   - Descuento: 0.30
   - Icono: 🔥
   - Límite: 1 uso por día

3. **Acceso Prioritario**
   - Nombre: "Acceso prioritario eventos especiales"
   - Tipo: ACCESO_VIP
   - Icono: 🎖️
   - Límite: Sin límite (es un status)

### 3. Páginas a Crear

#### A) `/admin/beneficios` - Panel de Gestión
**Funcionalidades:**
- Lista de todos los beneficios con filtros (activos/inactivos, por tipo)
- Botón "Crear Beneficio" que abre modal con formulario:
  - Nombre (texto)
  - Tipo (dropdown: Descuento, Producto Gratis, Upgrade, Acceso VIP)
  - Descuento % (solo si tipo es DESCUENTO)
  - Ícono (emoji picker o texto)
  - Es acumulable (checkbox)
  - Requiere validación (checkbox)
  - Estado activo (toggle)
- Botones de acción por beneficio:
  - ✏️ Editar
  - 🗑️ Eliminar (con confirmación)
  - 👁️ Ver uso (estadísticas)

#### B) `/admin/beneficios/asignar` - Asignación a Niveles
**Funcionalidades:**
- Tabs o selector de nivel (Bronce, Plata, Oro)
- Lista de beneficios disponibles para asignar
- Por cada beneficio asignado, configurar:
  - Usos por día (input numérico)
  - Usos por semana (opcional)
  - Usos por mes (opcional)
- Drag & drop para ordenar prioridad (opcional v2)
- Preview de cómo se ve en el pass del cliente

### 4. Actualización del Pass del Cliente

**En `/pass` agregar sección "Beneficios Disponibles":**

```
🎁 Tus Beneficios de Hoy
------------------------
✅ Agua de cortesía (Disponible)
✅ 10% desc. cafetería (Disponible)

💡 Mostrá tu QR al staff para aplicar estos beneficios
```

**Cuando ya usó un beneficio:**
```
🎁 Tus Beneficios de Hoy
------------------------
✓ Agua de cortesía (Usado - renueva mañana)
✅ 10% desc. cafetería (Disponible)
```

### 5. API Endpoints Necesarios

#### GET `/api/admin/beneficios`
- Requiere auth de admin
- Devuelve lista completa de beneficios
- Incluye estadísticas de uso

#### POST `/api/admin/beneficios`
- Crear nuevo beneficio
- Validar datos

#### PATCH `/api/admin/beneficios/[id]`
- Actualizar beneficio existente

#### DELETE `/api/admin/beneficios/[id]`
- Eliminar beneficio (soft delete)

#### GET `/api/admin/niveles/[id]/beneficios`
- Listar beneficios asignados a un nivel

#### POST `/api/admin/niveles/[id]/beneficios`
- Asignar beneficio a nivel con configuración

#### GET `/api/pass/beneficios-disponibles`
- Para el cliente logueado
- Devuelve beneficios de su nivel
- Indica cuáles ya usó hoy

#### POST `/api/eventos` (actualizar endpoint existente)
- Al escanear QR, permitir aplicar un beneficio
- Validar que el cliente no lo haya usado hoy
- Registrar el uso en EventoScan

---

## 🚀 Cómo Empezar la Próxima Sesión

### Opción 1: Desarrollo Completo
**Instrucción sugerida:**
```
"Necesito implementar el panel de administración de beneficios completo según las especificaciones 
en PROXIMA-SESION-BENEFICIOS.md. Por favor comenzá creando:
1. El script SQL para insertar los beneficios iniciales (Bronce, Plata, Oro)
2. La página /admin/beneficios con CRUD completo
3. La actualización del /pass para mostrar beneficios disponibles/usados"
```

### Opción 2: Por Fases
**Fase 1 - Configuración Inicial:**
```
"Leé PROXIMA-SESION-BENEFICIOS.md y creá el script SQL para insertar los beneficios 
iniciales de los 3 niveles (Bronce, Plata, Oro) según las especificaciones"
```

**Fase 2 - Panel Admin:**
```
"Implementá la página /admin/beneficios con CRUD completo de beneficios"
```

**Fase 3 - Visualización Cliente:**
```
"Actualizá /pass para mostrar los beneficios disponibles del nivel del cliente, 
indicando cuáles ya usó hoy"
```

---

## 📊 Estructura de Archivos Esperada

```
fidelizacion-zona/
├── scripts/
│   └── seed-beneficios-iniciales.sql    ← NUEVO: Beneficios de 3 niveles
├── src/app/
│   ├── admin/
│   │   └── beneficios/
│   │       ├── page.tsx                  ← NUEVO: Panel gestión
│   │       ├── asignar/
│   │       │   └── page.tsx              ← NUEVO: Asignación a niveles
│   │       └── components/
│   │           ├── BeneficioForm.tsx     ← NUEVO: Formulario crear/editar
│   │           ├── BeneficioCard.tsx     ← NUEVO: Card de beneficio
│   │           └── AsignacionNivel.tsx   ← NUEVO: Config por nivel
│   ├── pass/
│   │   └── page.tsx                      ← ACTUALIZAR: Mostrar beneficios
│   └── api/
│       └── admin/
│           └── beneficios/
│               ├── route.ts              ← NUEVO: CRUD beneficios
│               └── [id]/
│                   └── route.ts          ← NUEVO: Update/Delete
└── PROXIMA-SESION-BENEFICIOS.md          ← ESTE ARCHIVO
```

---

## ⚠️ Consideraciones Importantes

1. **Renovación Diaria:**
   - Los beneficios se renuevan a las 00:00 Argentina (UTC-3)
   - Usar `DATE(timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')` en queries

2. **Control de Uso:**
   - Verificar en `EventoScan` si el beneficio ya se usó hoy
   - Query: `SELECT COUNT(*) FROM EventoScan WHERE clienteId = X AND beneficioId = Y AND DATE(timestamp AT TIME ZONE 'TZ') = CURRENT_DATE`

3. **Acceso Administrativo:**
   - Implementar middleware de auth admin si aún no existe
   - Proteger todas las rutas `/admin/*`

4. **UI/UX:**
   - Usar los mismos estilos del resto de la app (Tailwind con gradientes purple-blue)
   - Iconos: usar emojis nativos para máxima compatibilidad
   - Responsive: optimizar para mobile y desktop

---

## 🎓 Contexto Adicional para el Asistente

- **Proyecto:** Sistema de fidelización para cafetería Coques + lavadero
- **Stack:** Next.js 14, Prisma, PostgreSQL (Neon), TypeScript, Tailwind
- **Auth:** JWT tokens en localStorage con clave `fidelizacion_token`
- **TZ:** Siempre usar `America/Argentina/Buenos_Aires`
- **ERP:** Ayres IT (los timestamps deben coincidir para cruce de datos)
- **Cliente actual:** Usuario de prueba en nivel Bronce

---

## ✅ Checklist Pre-Desarrollo

Antes de empezar, verificar:
- [ ] Base de datos accesible (Neon SQL Editor)
- [ ] Proyecto compilando localmente (`npm run dev`)
- [ ] Git en estado limpio (`git status`)
- [ ] Usuario admin existe en BD (crear si no)

---

**Última actualización:** 13 de febrero de 2026
**Estado del proyecto:** Frontend cliente 100% completo, listo para módulo admin de beneficios
**Deployment:** Vercel (auto-deploy en push a main)
