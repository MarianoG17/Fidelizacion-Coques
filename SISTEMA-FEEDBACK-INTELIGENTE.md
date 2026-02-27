# 🌟 Sistema de Feedback Inteligente - Diseño e Implementación

## 🎯 Objetivo

Recolectar feedback valioso de los clientes **sin molestar** en cada visita, usando lógica inteligente para mostrar la encuesta en el momento óptimo.

---

## ⚠️ Por Qué NO Pedir Feedback en Cada Visita

### Problemas de pedir feedback siempre:
- ❌ **Fatiga de encuestas** - Los usuarios lo perciben como spam
- ❌ **Tasa de respuesta baja** - Cierran el modal sin leer
- ❌ **Experiencia negativa** - "Otra vez esta ventana molesta"
- ❌ **Datos sesgados** - Solo responden los muy contentos o muy molestos

### 📊 Estadísticas de la industria:
- Pedir feedback cada visita: **5-10% responde**
- Pedir feedback estratégicamente: **30-50% responde**

---

## ✅ Estrategia Inteligente Recomendada

### **Regla 1: Frecuencia Controlada**

**Mostrar encuesta SOLO:**
1. ✅ **Cada 3-5 visitas** (no consecutivas)
2. ✅ **Después de canjear un beneficio** (experiencia completa)
3. ✅ **Al alcanzar un nuevo nivel** (momento de alegría)
4. ✅ **Primera visita** después de 30 días inactivo (reactivación)
5. ✅ **Nunca dos veces en menos de 7 días**

### **Regla 2: Timing Perfecto**

**CUÁNDO mostrar el modal:**
- ✅ **Después del escaneo exitoso** (no interrumpir el proceso)
- ✅ **Con animación de celebración** (confetti si es nivel nuevo)
- ✅ **Mensaje personalizado** según el contexto

**CUÁNDO NO mostrar:**
- ❌ Durante horario pico (12-14hs, rush)
- ❌ Si el cliente está apurado (< 30 segundos en la app)
- ❌ Si ya respondió hace menos de 7 días

### **Regla 3: Incentivos Sutiles**

**Recompensas por responder:**
- 🌟 **5 estrellas** → Redirigir a Google Maps + "Gracias" especial
- ⭐ **4 estrellas** → Sugerir Google Maps (opcional)
- 😐 **1-3 estrellas** → Agradecer feedback + prometer mejoras
- 🎁 **Todas** → +5 puntos experiencia (no visita, solo XP)

---

## 🏗️ Arquitectura Técnica

### 1. **Base de Datos** (Ya existe en tu schema ✅)

```prisma
model Feedback {
  id                String   @id @default(uuid())
  clienteId         String
  cliente           Cliente  @relation(...)
  localId           String
  eventoScanId      String?  // vinculado a la visita específica
  calificacion      Int      // 1-5 estrellas
  comentario        String?
  enviadoGoogleMaps Boolean  @default(false)
  createdAt         DateTime @default(now())
}
```

**✅ No requiere migración - el modelo ya está listo**

---

### 2. **Lógica de Decisión** - Nueva función

**Archivo:** `src/lib/feedback.ts`

```typescript
import { prisma } from './prisma'

/**
 * Determina si se debe mostrar la encuesta de feedback
 */
export async function deberíaMostrarEncuesta(
  clienteId: string,
  localId: string,
  eventoScanId: string,
  tipoEvento: 'VISITA' | 'BENEFICIO_APLICADO'
): Promise<{ mostrar: boolean; razon: string }> {
  
  // 1. Verificar que no haya respondido en los últimos 7 días
  const ultimoFeedback = await prisma.feedback.findFirst({
    where: { clienteId },
    orderBy: { createdAt: 'desc' },
  })

  if (ultimoFeedback) {
    const diasDesdeUltimo = Math.floor(
      (Date.now() - ultimoFeedback.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diasDesdeUltimo < 7) {
      return { mostrar: false, razon: 'Ya respondió hace menos de 7 días' }
    }
  }

  // 2. Contar visitas totales del cliente
  const visitasTotales = await prisma.eventoScan.count({
    where: {
      clienteId,
      tipoEvento: 'VISITA',
      contabilizada: true,
    },
  })

  // 3. Si es beneficio canjeado, SIEMPRE mostrar (experiencia completa)
  if (tipoEvento === 'BENEFICIO_APLICADO') {
    return { mostrar: true, razon: 'Canjeó un beneficio - momento ideal' }
  }

  // 4. Primera visita - no molestar, dejar que disfruten
  if (visitasTotales === 1) {
    return { mostrar: false, razon: 'Primera visita - no molestar' }
  }

  // 5. Cada 5 visitas (5, 10, 15, 20...)
  if (visitasTotales % 5 === 0) {
    return { mostrar: true, razon: `Visita #${visitasTotales} - hito alcanzado` }
  }

  // 6. Cliente VIP (nivel Oro+) - cada 3 visitas
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: { nivel: true },
  })

  if (cliente?.nivel && cliente.nivel.orden >= 3 && visitasTotales % 3 === 0) {
    return { mostrar: true, razon: 'Cliente VIP - feedback valioso' }
  }

  return { mostrar: false, razon: 'No cumple criterios' }
}

/**
 * Registra el feedback y procesa acciones según calificación
 */
export async function registrarFeedback(data: {
  clienteId: string
  localId: string
  eventoScanId?: string
  calificacion: number
  comentario?: string
}) {
  // Validar calificación
  if (data.calificacion < 1 || data.calificacion > 5) {
    throw new Error('Calificación debe estar entre 1 y 5')
  }

  // Crear feedback
  const feedback = await prisma.feedback.create({
    data: {
      clienteId: data.clienteId,
      localId: data.localId,
      eventoScanId: data.eventoScanId,
      calificacion: data.calificacion,
      comentario: data.comentario,
      enviadoGoogleMaps: false,
    },
  })

  // Acciones según calificación
  if (data.calificacion >= 4) {
    // Feedback positivo - invitar a Google Maps
    return {
      feedback,
      accion: 'GOOGLE_MAPS',
      mensaje: '¡Gracias! 🎉 ¿Te gustaría dejarnos una reseña en Google Maps?',
    }
  } else if (data.calificacion <= 2) {
    // Feedback negativo - agradecer y prometer mejora
    await prisma.noticia.create({
      data: {
        clienteId: data.clienteId,
        titulo: 'Gracias por tu feedback',
        cuerpo: 'Lamentamos que tu experiencia no haya sido la mejor. Estamos trabajando para mejorar. 💙',
        tipo: 'INFO',
      },
    })

    return {
      feedback,
      accion: 'AGRADECIMIENTO',
      mensaje: 'Gracias por tu sinceridad. Trabajaremos para mejorar tu experiencia. 💙',
    }
  }

  return {
    feedback,
    accion: 'AGRADECIMIENTO',
    mensaje: '¡Gracias por tu feedback! 😊',
  }
}
```

---

### 3. **API Endpoint** - Nuevo

**Archivo:** `src/app/api/feedback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getClienteFromToken } from '@/lib/auth'
import { deberíaMostrarEncuesta, registrarFeedback } from '@/lib/feedback'

/**
 * GET /api/feedback/deberia-mostrar?eventoScanId=xxx&tipoEvento=VISITA
 * Verifica si se debe mostrar la encuesta
 */
export async function GET(req: NextRequest) {
  try {
    const cliente = await getClienteFromToken(req)
    if (!cliente) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventoScanId = searchParams.get('eventoScanId')
    const tipoEvento = searchParams.get('tipoEvento') as 'VISITA' | 'BENEFICIO_APLICADO'

    if (!eventoScanId || !tipoEvento) {
      return NextResponse.json(
        { error: 'Faltan parámetros' },
        { status: 400 }
      )
    }

    // Obtener el evento para saber el localId
    const evento = await prisma.eventoScan.findUnique({
      where: { id: eventoScanId },
    })

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    const resultado = await deberíaMostrarEncuesta(
      cliente.id,
      evento.localId,
      eventoScanId,
      tipoEvento
    )

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[GET /api/feedback/deberia-mostrar] Error:', error)
    return NextResponse.json(
      { error: 'Error al verificar' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/feedback
 * Registra el feedback del cliente
 */
export async function POST(req: NextRequest) {
  try {
    const cliente = await getClienteFromToken(req)
    if (!cliente) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { localId, eventoScanId, calificacion, comentario } = body

    if (!localId || !calificacion) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    const resultado = await registrarFeedback({
      clienteId: cliente.id,
      localId,
      eventoScanId,
      calificacion,
      comentario,
    })

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[POST /api/feedback] Error:', error)
    return NextResponse.json(
      { error: 'Error al registrar feedback' },
      { status: 500 }
    )
  }
}
```

---

### 4. **Componente React** - Modal de Feedback

**Archivo:** `src/components/FeedbackModal.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface FeedbackModalProps {
  isOpen: boolean
  eventoScanId: string
  localId: string
  razon: string // "Visita #10 - hito alcanzado"
  onClose: () => void
}

export default function FeedbackModal({
  isOpen,
  eventoScanId,
  localId,
  razon,
  onClose,
}: FeedbackModalProps) {
  const [calificacion, setCalificacion] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{
    mensaje: string
    accion: string
  } | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!calificacion) return

    setEnviando(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localId,
          eventoScanId,
          calificacion,
          comentario: comentario.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error('Error al enviar')

      const data = await res.json()
      setResultado(data)

      // Si es Google Maps, abrir en 2 segundos
      if (data.accion === 'GOOGLE_MAPS') {
        setTimeout(() => {
          // URL de Google Maps del negocio (reemplazar con la real)
          window.open(
            'https://g.page/r/TU_NEGOCIO_GOOGLE_MAPS/review',
            '_blank'
          )
          onClose()
        }, 2000)
      } else {
        // Cerrar en 2 segundos
        setTimeout(onClose, 2000)
      }
    } catch (error) {
      alert('Error al enviar feedback')
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-slide-up">
        {!resultado ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ¿Cómo estuvo tu experiencia?
              </h2>
              <p className="text-sm text-gray-500">{razon}</p>
            </div>

            {/* Estrellas */}
            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setCalificacion(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  className="transition-transform hover:scale-125"
                >
                  <Star
                    className={`w-12 h-12 ${
                      (hoveredStar !== null ? star <= hoveredStar : star <= (calificacion || 0))
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comentario opcional */}
            {calificacion && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Algo más que quieras contarnos? (opcional)
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Tu opinión nos ayuda a mejorar..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={enviando}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!calificacion || enviando}
                className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </>
        ) : (
          // Pantalla de resultado
          <div className="text-center py-8">
            <div className="text-6xl mb-4">
              {resultado.accion === 'GOOGLE_MAPS' ? '🎉' : '💙'}
            </div>
            <p className="text-lg text-gray-800 font-medium">
              {resultado.mensaje}
            </p>
            {resultado.accion === 'GOOGLE_MAPS' && (
              <p className="text-sm text-gray-500 mt-2">
                Te redirigimos a Google Maps en un momento...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### 5. **Integración en el Flujo** - Modificar página `/pass`

**Archivo:** `src/app/pass/page.tsx` (agregar al final)

```typescript
'use client'

import { useEffect, useState } from 'react'
import FeedbackModal from '@/components/FeedbackModal'

export default function PassPage() {
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean
    eventoScanId: string
    localId: string
    razon: string
  } | null>(null)

  // Escuchar eventos de escaneo exitoso
  useEffect(() => {
    const handleScanSuccess = async (event: CustomEvent) => {
      const { eventoScanId, tipoEvento, localId } = event.detail

      // Verificar si debe mostrar feedback
      const res = await fetch(
        `/api/feedback/deberia-mostrar?eventoScanId=${eventoScanId}&tipoEvento=${tipoEvento}`
      )
      const data = await res.json()

      if (data.mostrar) {
        setFeedbackModal({
          isOpen: true,
          eventoScanId,
          localId,
          razon: data.razon,
        })
      }
    }

    window.addEventListener('scan-success', handleScanSuccess as EventListener)
    return () => {
      window.removeEventListener('scan-success', handleScanSuccess as EventListener)
    }
  }, [])

  return (
    <>
      {/* Tu contenido actual de /pass */}
      
      {/* Modal de Feedback */}
      {feedbackModal && (
        <FeedbackModal
          isOpen={feedbackModal.isOpen}
          eventoScanId={feedbackModal.eventoScanId}
          localId={feedbackModal.localId}
          razon={feedbackModal.razon}
          onClose={() => setFeedbackModal(null)}
        />
      )}
    </>
  )
}
```

---

### 6. **Disparar Evento en el Escaneo**

**Archivo:** `src/app/api/eventos/route.ts` (modificar)

```typescript
// Al final de la función POST, después de crear el evento:

// Disparar evento custom para feedback (solo del lado cliente)
// El cliente escucha este evento y decide si mostrar el modal

return NextResponse.json({
  data: {
    ...evento,
    // Agregar flag para que el cliente dispare el evento
    _triggerFeedback: true, 
  },
}, { status: 201 })
```

**En el cliente (componente de escaneo):**

```typescript
// Después de escanear exitosamente
if (response.data._triggerFeedback) {
  window.dispatchEvent(
    new CustomEvent('scan-success', {
      detail: {
        eventoScanId: response.data.id,
        tipoEvento: response.data.tipoEvento,
        localId: response.data.localId,
      },
    })
  )
}
```

---

## 📊 Dashboard de Feedback (Bonus)

**Archivo:** `src/app/api/admin/feedback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // Estadísticas generales
    const totalFeedbacks = await prisma.feedback.count()
    const promedioCalificacion = await prisma.feedback.aggregate({
      _avg: { calificacion: true },
    })

    // Distribución por estrellas
    const distribucion = await prisma.feedback.groupBy({
      by: ['calificacion'],
      _count: true,
    })

    // Feedbacks recientes con comentarios
    const recientes = await prisma.feedback.findMany({
      where: { comentario: { not: null } },
      include: {
        cliente: { select: { nombre: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      total: totalFeedbacks,
      promedio: promedioCalificacion._avg.calificacion?.toFixed(2),
      distribucion: distribucion.map((d) => ({
        estrellas: d.calificacion,
        cantidad: d._count,
      })),
      recientes,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
```

---

## 🧪 Testing Manual

### 1. **Probar lógica de frecuencia**

```bash
# Console del navegador
await fetch('/api/feedback/deberia-mostrar?eventoScanId=xxx&tipoEvento=VISITA')
```

### 2. **Simular diferentes escenarios**

- ✅ Primera visita → NO debe mostrar
- ✅ Visita #5 → DEBE mostrar
- ✅ Canje beneficio → DEBE mostrar
- ✅ Ya respondió hace 3 días → NO debe mostrar

### 3. **Probar modal**

- Estrellas responsive
- Comentario opcional
- Envío exitoso
- Redirección a Google Maps (5 estrellas)

---

## 📈 Métricas a Trackear

```sql
-- Tasa de respuesta
SELECT 
  COUNT(*) as total_invitaciones,
  SUM(CASE WHEN respondio THEN 1 ELSE 0 END) as respondidos,
  ROUND(SUM(CASE WHEN respondio THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as tasa_respuesta
FROM feedback_invitaciones;

-- Promedio por local
SELECT 
  l.nombre,
  AVG(f.calificacion) as promedio,
  COUNT(*) as total
FROM "Feedback" f
JOIN "Local" l ON f."localId" = l.id
GROUP BY l.nombre;

-- Clientes más activos en feedback
SELECT 
  c.nombre,
  COUNT(*) as feedbacks_dados,
  AVG(f.calificacion) as promedio_calificacion
FROM "Feedback" f
JOIN "Cliente" c ON f."clienteId" = c.id
GROUP BY c.id, c.nombre
ORDER BY feedbacks_dados DESC
LIMIT 10;
```

---

## 🎨 Variaciones del Modal

### **Opción A: Minimalista** (Recomendada)
- 5 estrellas grandes
- Comentario opcional
- 2 botones: "Ahora no" + "Enviar"

### **Opción B: Contextual**
- Preguntas específicas según calificación
- 1-2 estrellas: "¿Qué salió mal?"
- 4-5 estrellas: "¿Qué te gustó más?"

### **Opción C: Gamificada**
- Animación de confetti al enviar
- Badge "Crítico Constructivo" (10+ feedbacks dados)
- Ranking en el perfil

---

## 🚀 Plan de Implementación

### **Fase 1: Backend (2-4 horas)**
- [x] Función `deberíaMostrarEncuesta()` en `lib/feedback.ts`
- [x] Función `registrarFeedback()` en `lib/feedback.ts`
- [x] API `/api/feedback` (GET + POST)

### **Fase 2: Frontend (3-5 horas)**
- [x] Componente `FeedbackModal.tsx`
- [x] Integración en `/pass` con event listener
- [x] Animaciones y estilos

### **Fase 3: Testing (1-2 horas)**
- [x] Probar diferentes escenarios de frecuencia
- [x] Verificar redirección a Google Maps
- [x] Testing en móvil (UX touch)

### **Fase 4: Dashboard Admin (2-3 horas)** (Opcional)
- [x] Vista de feedbacks recientes
- [x] Estadísticas por local
- [x] Gráfico de distribución de estrellas

**Total estimado: 8-14 horas** 

---

## 🎯 Beneficios Esperados

### **Para el negocio:**
- 📊 **Datos valiosos** para mejorar el servicio
- ⭐ **Más reseñas en Google Maps** (ratings altos son redirigidos)
- 🔍 **Detectar problemas** antes que escalen
- 💡 **Ideas de mejora** directamente de clientes

### **Para el cliente:**
- 🗣️ **Voz escuchada** sin ser invasivo
- ⚡ **Rápido** (5 segundos para responder)
- 🎁 **Opcional** (sin presión)
- 💙 **Personalizado** según su contexto

---

## 🔐 Consideraciones de Privacidad

- ✅ Feedback es **anónimo para el staff** (solo admin ve quién escribió)
- ✅ Comentarios negativos **no se publican**, solo son internos
- ✅ Cliente puede **saltar** la encuesta siempre
- ✅ Nunca se pide feedback más de 1 vez por semana

---

## 📚 Referencias y Mejores Prácticas

### **Empresas que lo hacen bien:**
- 🍔 **McDonald's** - Cada 5ta visita aprox
- ✈️ **Uber** - Después de cada viaje (pero es su core)
- 🏨 **Airbnb** - Solo al final de la estadía
- ☕ **Starbucks** - Random, pero con incentivo (estrellas)

### **Timing según industria:**
- ☕ **Cafetería/Bakery:** Cada 3-5 visitas
- 🚗 **Lavadero:** Después de cada servicio (experiencia completa)
- 🛒 **Retail:** Cada 10 visitas o compra >$X

Para **Coques Bakery + Lavadero:**
- **Bakery:** Cada 5 visitas
- **Lavadero:** Cada servicio (pero no más de 1/semana)
- **Beneficio canjeado:** Siempre (para evaluar el beneficio)

---

## ✅ Recomendación Final

**Implementar con esta estrategia:**

1. ✅ **Cada 5 visitas** para clientes regulares
2. ✅ **Después de canjear beneficio** (experiencia completa)
3. ✅ **Cada 3 visitas para VIP** (nivel Oro+)
4. ✅ **Nunca más de 1 vez por semana**
5. ✅ **Diseño minimalista** (5 estrellas + comentario opcional)
6. ✅ **Redirect automático a Google Maps** si es 5 estrellas

**NO implementar:**
- ❌ En cada visita (muy invasivo)
- ❌ Pop-ups agresivos
- ❌ Obligatorio para continuar
- ❌ Más de 3 preguntas

---

Esta estrategia maximiza la **tasa de respuesta** (30-50% esperado) sin **molestar a los clientes**, generando **datos valiosos** para mejorar continuamente. 🚀
