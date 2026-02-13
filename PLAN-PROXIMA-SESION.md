# 📋 Plan de Implementación - Próxima Sesión

## Estado Actual

✅ **Completado**:
- Modelo `SesionMesa` en base de datos
- APIs de sesiones funcionando (`POST /api/sesiones`, `DELETE /api/sesiones/[id]`)
- API de estado del salón (`GET /api/salon/estado`)
- Sistema de beneficios sincronizado entre staff y cliente

⏳ **Pendiente**:
- UI visual del salón con mesas
- Aplicar beneficios desde sesión activa (sin reescanear)
- Auto-liberación de sesiones (timeout 60 min)
- Sistema de logros automáticos

---

## 🎯 Objetivo de la Próxima Sesión

Completar el **Sistema de Sesiones de Mesa** para que el staff pueda:
1. Ver el salón con mesas en **🟢 verde (libre)** o **🔴 rojo (ocupada)**
2. Click en mesa ocupada → Ver cliente y sus beneficios disponibles
3. Aplicar beneficios sin que el cliente reescanee el QR
4. Cerrar sesión cuando el cliente se retira

---

## 📝 Plan Paso a Paso

### FASE 1: Modificar el Flujo de Scanner Actual (30 min)

**Objetivo**: Que al escanear QR se cree automáticamente una sesión de mesa.

#### Archivo: `src/app/local/page.tsx`

**Modificaciones**:

1. **En `validarOTP()` (línea 113)**: Después de validar, verificar si eligió "salon" y crear sesión:

```typescript
async function validarOTP(otp: string) {
  // ... código existente hasta línea 127
  
  if (data.valido) {
    setValidacion(data)
    setPantalla('cliente')
    
    // SI YA ELIGIÓ SALÓN, CREAR SESIÓN INMEDIATAMENTE
    if (ubicacion === 'salon' && mesaSeleccionada) {
      await crearSesionMesa(data.cliente.id, mesaSeleccionada.id)
    }
  }
}
```

2. **Nueva función `crearSesionMesa()`**:

```typescript
async function crearSesionMesa(clienteId: string, mesaId: string) {
  try {
    const res = await fetch('/api/sesiones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-local-api-key': LOCAL_API_KEY,
      },
      body: JSON.stringify({ clienteId, mesaId }),
    })

    const data = await res.json()
    
    if (res.ok) {
      console.log('[Local] Sesión creada:', data.mensaje)
      // Recargar estado del salón si estamos en vista de salón
      if (vistaSalon) {
        cargarEstadoSalon()
      }
    } else {
      console.error('[Local] Error creando sesión:', data.error)
      // Si la mesa está ocupada, mostrar mensaje pero continuar
      if (res.status === 409) {
        setErrorMsg(`Mesa ocupada por otro cliente. Elegí otra mesa.`)
      }
    }
  } catch (error) {
    console.error('[Local] Error en crearSesionMesa:', error)
  }
}
```

3. **Modificar `registrarEvento()` (línea 177)**: Agregar lógica de sesión:

```typescript
async function registrarEvento() {
  // ... código existente ...
  
  // Si es salón y NO hay sesión activa, crearla primero
  if (ubicacion === 'salon' && mesaSeleccionada && validacion) {
    await crearSesionMesa(validacion.cliente.id, mesaSeleccionada.id)
  }
  
  // ... resto del código de registrar evento ...
}
```

---

### FASE 2: Nueva Vista de Salón (Modo Mesas) (45 min)

**Objetivo**: Agregar botón para alternar entre "Scanner QR" y "Ver Salón".

#### Archivo: `src/app/local/page.tsx`

**Nuevo estado**:

```typescript
const [vistaSalon, setVistaSalon] = useState(false)
const [estadoSalon, setEstadoSalon] = useState<any>(null)
const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
```

**Nueva función**:

```typescript
async function cargarEstadoSalon() {
  try {
    const res = await fetch('/api/salon/estado', {
      headers: { 'x-local-api-key': LOCAL_API_KEY },
    })

    if (res.ok) {
      const data = await res.json()
      setEstadoSalon(data.data)
    }
  } catch (error) {
    console.error('[Local] Error cargando estado del salón:', error)
  }
}
```

**useEffect para auto-refresh**:

```typescript
useEffect(() => {
  if (vistaSalon) {
    // Cargar inmediatamente
    cargarEstadoSalon()
    
    // Actualizar cada 5 segundos
    const id = setInterval(cargarEstadoSalon, 5000)
    setIntervalId(id)
    
    return () => {
      if (id) clearInterval(id)
    }
  }
}, [vistaSalon])
```

**Botón para alternar vistas** (agregar en el header):

```tsx
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setVistaSalon(false)}
    className={`flex-1 py-3 rounded-xl font-bold transition ${
      !vistaSalon
        ? 'bg-purple-600 text-white'
        : 'bg-gray-200 text-gray-600'
    }`}
  >
    📱 Scanner QR
  </button>
  <button
    onClick={() => setVistaSalon(true)}
    className={`flex-1 py-3 rounded-xl font-bold transition ${
      vistaSalon
        ? 'bg-purple-600 text-white'
        : 'bg-gray-200 text-gray-600'
    }`}
  >
    🏠 Ver Salón
  </button>
</div>
```

**Renderizado condicional**:

```tsx
{vistaSalon ? (
  <VistaSalon 
    estadoSalon={estadoSalon} 
    onCerrarSesion={cerrarSesionMesa}
    onAplicarBeneficio={aplicarBeneficioDesdeMesa}
  />
) : (
  // ... código actual del scanner ...
)}
```

---

### FASE 3: Componente Vista del Salón (45 min)

**Objetivo**: Mostrar mesas como cards con colores según estado.

#### Nuevo archivo: `src/app/local/components/VistaSalon.tsx`

```tsx
'use client'

interface Props {
  estadoSalon: any
  onCerrarSesion: (sesionId: string) => void
  onAplicarBeneficio: (clienteId: string, beneficioId: string) => void
}

export default function VistaSalon({ estadoSalon, onCerrarSesion, onAplicarBeneficio }: Props) {
  const [mesaSeleccionada, setMesaSeleccionada] = useState<any>(null)

  if (!estadoSalon) {
    return <div className="text-center py-8">Cargando estado del salón...</div>
  }

  return (
    <div>
      {/* Header con stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{estadoSalon.totalMesas}</div>
          <div className="text-sm text-gray-500">Total Mesas</div>
        </div>
        <div className="bg-green-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{estadoSalon.mesasLibres}</div>
          <div className="text-sm text-gray-600">Libres</div>
        </div>
        <div className="bg-red-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{estadoSalon.mesasOcupadas}</div>
          <div className="text-sm text-gray-600">Ocupadas</div>
        </div>
      </div>

      {/* Grid de mesas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {estadoSalon.mesas.map((item: any) => (
          <button
            key={item.mesa.id}
            onClick={() => setMesaSeleccionada(item)}
            className={`p-6 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${
              item.ocupada
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-green-500 text-white'
            }`}
          >
            <div className="text-3xl mb-2">
              {item.ocupada ? '🔴' : '🟢'}
            </div>
            <div>Mesa {item.mesa.nombre}</div>
            {item.ocupada && (
              <div className="text-sm mt-2 opacity-90">
                {item.sesion.cliente.nombre}
                <br />
                <span className="text-xs">
                  {item.sesion.duracionMinutos} min
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Modal de mesa seleccionada */}
      {mesaSeleccionada && mesaSeleccionada.ocupada && (
        <MesaModal
          mesa={mesaSeleccionada}
          onClose={() => setMesaSeleccionada(null)}
          onCerrarSesion={onCerrarSesion}
          onAplicarBeneficio={onAplicarBeneficio}
        />
      )}
    </div>
  )
}
```

---

### FASE 4: Modal de Mesa con Beneficios (30 min)

#### Nuevo archivo: `src/app/local/components/MesaModal.tsx`

```tsx
'use client'

interface Props {
  mesa: any
  onClose: () => void
  onCerrarSesion: (sesionId: string) => void
  onAplicarBeneficio: (clienteId: string, beneficioId: string) => void
}

export default function MesaModal({ mesa, onClose, onCerrarSesion, onAplicarBeneficio }: Props) {
  const { sesion } = mesa

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Mesa {mesa.mesa.nombre}</h2>
              <p className="text-purple-200">
                {sesion.cliente.nombre} • {sesion.cliente.nivel}
              </p>
              <p className="text-sm text-purple-200 mt-1">
                {sesion.duracionMinutos} minutos en la mesa
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white text-3xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Beneficios disponibles */}
          {sesion.beneficiosDisponibles.length > 0 ? (
            <div>
              <h3 className="font-bold text-lg mb-3">Beneficios Disponibles</h3>
              <div className="space-y-3">
                {sesion.beneficiosDisponibles.map((b: any) => (
                  <div
                    key={b.id}
                    className="bg-green-50 border-2 border-green-200 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-green-800">{b.nombre}</p>
                        <p className="text-sm text-green-700 mt-1 font-mono bg-white/50 rounded p-2">
                          → Cargar en Aires: {b.descripcionCaja}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onAplicarBeneficio(sesion.cliente.id, b.id)
                          onClose()
                        }}
                        className="ml-3 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-500">
              Sin beneficios disponibles
            </div>
          )}

          {/* Botón cerrar sesión */}
          <button
            onClick={() => {
              if (confirm('¿El cliente se retiró? Esto liberará la mesa.')) {
                onCerrarSesion(sesion.id)
                onClose()
              }
            }}
            className="w-full mt-6 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition"
          >
            Cerrar Sesión (Liberar Mesa)
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### FASE 5: Funciones de Cerrar Sesión y Aplicar Beneficio (20 min)

#### Archivo: `src/app/local/page.tsx`

```typescript
async function cerrarSesionMesa(sesionId: string) {
  try {
    const res = await fetch(`/api/sesiones/${sesionId}`, {
      method: 'DELETE',
      headers: { 'x-local-api-key': LOCAL_API_KEY },
    })

    if (res.ok) {
      const data = await res.json()
      console.log('[Local] Sesión cerrada:', data.mensaje)
      
      // Recargar estado del salón
      cargarEstadoSalon()
    }
  } catch (error) {
    console.error('[Local] Error cerrando sesión:', error)
  }
}

async function aplicarBeneficioDesdeM esa(clienteId: string, beneficioId: string) {
  try {
    // Registrar evento de beneficio aplicado
    const res = await fetch('/api/eventos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-local-api-key': LOCAL_API_KEY,
      },
      body: JSON.stringify({
        clienteId,
        tipoEvento: 'BENEFICIO_APLICADO',
        beneficioId,
        metodoValidacion: 'QR',
        notas: 'Aplicado desde sesión de mesa',
      }),
    })

    if (res.ok) {
      alert('✅ Beneficio aplicado correctamente')
      
      // Recargar estado del salón para actualizar beneficios disponibles
      cargarEstadoSalon()
    } else {
      const data = await res.json()
      alert(`❌ Error: ${data.mensaje || 'No se pudo aplicar el beneficio'}`)
    }
  } catch (error) {
    console.error('[Local] Error aplicando beneficio:', error)
    alert('❌ Error aplicando beneficio')
  }
}
```

---

### FASE 6: Job de Auto-Liberación (30 min)

**Objetivo**: Cerrar automáticamente sesiones inactivas después de 60 minutos.

#### Nuevo archivo: `src/app/api/jobs/auto-liberar-sesiones/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/jobs/auto-liberar-sesiones
// Este endpoint debe ser llamado por un cron job externo (ej: Vercel Cron, GitHub Actions)
export async function GET(req: NextRequest) {
  try {
    // Verificar que venga de un origen autorizado (opcional)
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ahora = new Date()
    const hace60Min = new Date(ahora.getTime() - 60 * 60 * 1000)

    // Buscar sesiones activas con más de 60 minutos
    const sesionesExpiradas = await prisma.sesionMesa.findMany({
      where: {
        activa: true,
        inicioSesion: {
          lt: hace60Min,
        },
      },
    })

    // Cerrar cada sesión
    const resultados = await Promise.all(
      sesionesExpiradas.map(async (sesion) => {
        const duracion = Math.floor(
          (ahora.getTime() - sesion.inicioSesion.getTime()) / 60000
        )

        return prisma.sesionMesa.update({
          where: { id: sesion.id },
          data: {
            activa: false,
            finSesion: ahora,
            cerradaPor: 'TIMEOUT',
            duracionMinutos: duracion,
          },
        })
      })
    )

    return NextResponse.json({
      mensaje: `${resultados.length} sesiones liberadas por timeout`,
      sesionesLiberadas: resultados.length,
    })
  } catch (error) {
    console.error('[GET /api/jobs/auto-liberar-sesiones]', error)
    return NextResponse.json(
      { error: 'Error en job de auto-liberación' },
      { status: 500 }
    )
  }
}
```

#### Configurar Cron en Vercel

Crear archivo: `vercel.json` (si no existe, o agregar al existente):

```json
{
  "crons": [
    {
      "path": "/api/jobs/auto-liberar-sesiones",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

Esto ejecutará el job cada 10 minutos. Agregar variable de entorno en Vercel:
- `CRON_SECRET=tu-secreto-aleatorio`

---

### FASE 7: Sistema de Logros Automáticos (45 min)

**Objetivo**: Otorgar logros automáticamente después de cada evento.

#### Nuevo archivo: `src/lib/logros.ts`

```typescript
import { prisma } from './prisma'

/**
 * Evalúa y otorga logros automáticamente después de un evento
 */
export async function evaluarLogros(clienteId: string) {
  try {
    // Obtener logros activos
    const logrosActivos = await prisma.logro.findMany({
      where: { activo: true },
    })

    // Obtener logros ya obtenidos por el cliente
    const logrosObtenidos = await prisma.logroCliente.findMany({
      where: { clienteId },
      select: { logroId: true },
    })

    const idsObtenidos = new Set(logrosObtenidos.map((l) => l.logroId))

    // Evaluar cada logro
    for (const logro of logrosActivos) {
      // Si ya lo tiene, saltar
      if (idsObtenidos.has(logro.id)) continue

      const criterios = logro.criterios as any
      let cumple = false

      switch (logro.tipo) {
        case 'PRIMERA_VISITA':
          cumple = await verificarPrimeraVisita(clienteId)
          break

        case 'VISITAS_CONSECUTIVAS':
          cumple = await verificarVisitasConsecutivas(clienteId, criterios)
          break

        case 'NIVEL_ALCANZADO':
          cumple = await verificarNivelAlcanzado(clienteId, logro.nivelId)
          break

        case 'REFERIDOS':
          cumple = await verificarReferidos(clienteId, criterios)
          break

        case 'USO_CRUZADO':
          cumple = await verificarUsoCruzado(clienteId)
          break

        // Agregar más tipos según necesites
      }

      // Si cumple, otorgar logro
      if (cumple) {
        await prisma.logroCliente.create({
          data: {
            clienteId,
            logroId: logro.id,
            visto: false,
          },
        })

        console.log(`[Logros] Otorgado: ${logro.nombre} a cliente ${clienteId}`)
      }
    }
  } catch (error) {
    console.error('[evaluarLogros] Error:', error)
  }
}

async function verificarPrimeraVisita(clienteId: string): Promise<boolean> {
  const visitasTotal = await prisma.eventoScan.count({
    where: {
      clienteId,
      tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
    },
  })

  return visitasTotal === 1
}

async function verificarVisitasConsecutivas(
  clienteId: string,
  criterios: { visitas?: number; visitasConsecutivas?: number; diasVentana?: number }
): Promise<boolean> {
  // Si es total de visitas (Cliente Frecuente: 5 visitas)
  if (criterios.visitas) {
    const visitasTotal = await prisma.eventoScan.count({
      where: {
        clienteId,
        contabilizada: true,
        tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
      },
    })

    return visitasTotal >= criterios.visitas
  }

  // Si es racha consecutiva (3 días consecutivos en 7 días)
  if (criterios.visitasConsecutivas && criterios.diasVentana) {
    // Implementar lógica de días consecutivos
    // (más complejo, revisar después)
    return false
  }

  return false
}

async function verificarNivelAlcanzado(
  clienteId: string,
  nivelId: string | null
): Promise<boolean> {
  if (!nivelId) return false

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { nivelId: true },
  })

  return cliente?.nivelId === nivelId
}

async function verificarReferidos(
  clienteId: string,
  criterios: { referidos: number }
): Promise<boolean> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { referidosActivados: true },
  })

  return (cliente?.referidosActivados || 0) >= criterios.referidos
}

async function verificarUsoCruzado(clienteId: string): Promise<boolean> {
  const localesUsados = await prisma.eventoScan.findMany({
    where: { clienteId },
    select: { localId: true },
    distinct: ['localId'],
  })

  return localesUsados.length >= 2
}
```

#### Modificar: `src/app/api/eventos/route.ts`

```typescript
// Agregar import
import { evaluarLogros } from '@/lib/logros'

// En POST, después de crear el evento (línea 85-89):
if (contabilizada && tipoEvento !== 'ESTADO_EXTERNO') {
  evaluarNivel(clienteId).catch(console.error)
  evaluarLogros(clienteId).catch(console.error) // ← AGREGAR ESTA LÍNEA
}
```

---

## 📦 Resumen de Archivos a Crear/Modificar

### Crear:
- ✅ `src/app/local/components/VistaSalon.tsx`
- ✅ `src/app/local/components/MesaModal.tsx`
- ✅ `src/app/api/jobs/auto-liberar-sesiones/route.ts`
- ✅ `src/lib/logros.ts`

### Modificar:
- ✅ `src/app/local/page.tsx` (agregar vista de salón)
- ✅ `src/app/api/eventos/route.ts` (agregar evaluación de logros)
- ✅ `vercel.json` (agregar cron job)

---

## 🧪 Orden de Testing Recomendado

1. **Probar creación de sesiones** desde scanner actual
2. **Probar vista del salón** con mesas en verde/rojo
3. **Probar modal de mesa** con beneficios
4. **Probar aplicar beneficio** desde mesa
5. **Probar cerrar sesión** manualmente
6. **Verificar timeout automático** después de 60 min
7. **Verificar logros** después de visitas

---

## ⚠️ Notas Importantes

- El sistema actual de scanner sigue funcionando igual (no rompes nada)
- La vista de salón es **opcional** - el staff puede usar cualquiera de las dos
- Las sesiones se crean automáticamente al seleccionar "Salón" + mesa
- El timeout de 60 min puede ajustarse fácilmente cambiando el cálculo en el job
- Los logros ahora se evaluarán automáticamente en cada evento

---

## 🚀 Deploy y Configuración Post-Implementación

1. Commit y push de todos los cambios
2. En Vercel, agregar variable de entorno: `CRON_SECRET=valor-secreto`
3. El cron job se activará automáticamente después del deploy
4. Probar todo en producción con un cliente de prueba
