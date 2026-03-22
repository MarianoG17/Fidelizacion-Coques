// src/lib/beneficios.ts
import { getHaceNDias, getInicioHoyArgentina } from '@/lib/timezone'
import { prisma } from './prisma'
import { sendPushNotification } from './push'
import { EstadoAutoEnum } from '@prisma/client'

/**
 * Devuelve los beneficios activos para un cliente en un momento dado.
 * Considera: nivel del cliente, estado del auto, condiciones de uso.
 */
export async function getBeneficiosActivos(clienteId: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      nivel: {
        include: {
          beneficios: {
            include: { beneficio: true },
          },
        },
      },
      autos: {
        where: { activo: true },
        include: { estadoActual: true },
      },
    },
  }) as any

  if (!cliente || cliente.estado !== 'ACTIVO') return []

  const beneficiosDelNivel = cliente.nivel?.beneficios.map((nb: any) => nb.beneficio) || []

  // Filtrar por condiciones
  const beneficiosActivos = await Promise.all(
    beneficiosDelNivel.map(async (beneficio: any) => {
      if (!beneficio.activo) return null

      // Si requiere estado externo, verificar que al menos un auto esté en ese estado
      if (beneficio.requiereEstadoExterno) {
        // Para beneficio de lavadero, activar cuando el auto está EN_PROCESO o LISTO
        // (ambos estados indican que el auto está en el lavadero)
        const estadosValidos = beneficio.id === 'beneficio-20porciento-lavadero'
          ? ['EN_PROCESO', 'LISTO']
          : [beneficio.estadoExternoTrigger]

        const autoConEstado = cliente.autos?.find(
          (auto: any) => auto.estadoActual && estadosValidos.includes(auto.estadoActual.estado)
        )
        if (!autoConEstado) return null

        // Para beneficio de lavadero, verificar que no pasó de las 19:00
        if (beneficio.id === 'beneficio-20porciento-lavadero') {
          const ahora = new Date()
          const cierreHoy = new Date(ahora)
          cierreHoy.setHours(19, 0, 0, 0) // 19:00 Argentina

          if (ahora > cierreHoy) {
            return null // Ya cerró el local, beneficio expirado
          }
        }
      }

      // Verificar límites de uso
      const condiciones = beneficio.condiciones as {
        maxPorDia?: number
        maxPorMes?: number
        maxPorCliente?: number
        usoUnico?: boolean
        duracionMinutos?: number
        diasMinimosEntreUsos?: number
        requiereFechaCumpleanos?: boolean
        diasAntes?: number
        diasDespues?: number
      }

      // Verificar ventana de cumpleaños (si el beneficio lo requiere)
      if (condiciones.requiereFechaCumpleanos) {
        if (!cliente.fechaCumpleanos) {
          // Cliente no tiene fecha de cumpleaños cargada
          return null
        }

        const ahora = new Date()
        const cumpleanos = new Date(cliente.fechaCumpleanos)

        // ✅ FIX: Manejar 29 de febrero en años no bisiestos
        let cumpleanosEsteAno: Date
        
        // Helper: verificar si un año es bisiesto
        const esBisiesto = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
        
        if (cumpleanos.getMonth() === 1 && cumpleanos.getDate() === 29) {
          // Cliente nacido el 29 de febrero
          if (esBisiesto(ahora.getFullYear())) {
            cumpleanosEsteAno = new Date(ahora.getFullYear(), 1, 29)
          } else {
            // Año no bisiesto: usar 28 de febrero
            cumpleanosEsteAno = new Date(ahora.getFullYear(), 1, 28)
          }
        } else {
          // Fecha normal
          cumpleanosEsteAno = new Date(
            ahora.getFullYear(),
            cumpleanos.getMonth(),
            cumpleanos.getDate()
          )
        }

        const diasAntes = condiciones.diasAntes || 0
        const diasDespues = condiciones.diasDespues || 0

        // Calcular inicio y fin de la ventana
        const inicioVentana = new Date(cumpleanosEsteAno)
        inicioVentana.setDate(inicioVentana.getDate() - diasAntes)
        inicioVentana.setHours(0, 0, 0, 0)

        const finVentana = new Date(cumpleanosEsteAno)
        finVentana.setDate(finVentana.getDate() + diasDespues)
        finVentana.setHours(23, 59, 59, 999)

        // Verificar si estamos dentro de la ventana
        if (ahora < inicioVentana || ahora > finVentana) {
          // Fuera de la ventana de cumpleaños
          return null
        }
      }

      if (condiciones.usoUnico) {
        const usado = await prisma.eventoScan.count({
          where: { clienteId, beneficioId: beneficio.id },
        })
        if (usado > 0) return null
      }

      if (condiciones.maxPorDia) {
        // ✅ FIX: Usar timezone de Argentina, no del servidor
        const hoy = getInicioHoyArgentina()
        const usado = await prisma.eventoScan.count({
          where: {
            clienteId,
            beneficioId: beneficio.id,
            timestamp: { gte: hoy },
          },
        })
        if (usado >= condiciones.maxPorDia) return null
      }

      // Verificar días mínimos entre usos (para beneficio de cumpleaños - previene abuso)
      if (condiciones.diasMinimosEntreUsos && condiciones.diasMinimosEntreUsos > 0) {
        const ultimoUso = await prisma.eventoScan.findFirst({
          where: {
            clienteId,
            beneficioId: beneficio.id,
            tipoEvento: 'BENEFICIO_APLICADO'
          },
          orderBy: { timestamp: 'desc' }
        })

        if (ultimoUso) {
          const diasTranscurridos = Math.floor(
            (Date.now() - ultimoUso.timestamp.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (diasTranscurridos < condiciones.diasMinimosEntreUsos) {
            // No ha pasado suficiente tiempo desde el último uso
            return null
          }
        }
      }

      return beneficio
    })
  )

  return beneficiosActivos.filter(Boolean)
}

/**
 * Evalúa si un cliente debe subir de nivel y lo actualiza.
 * Se llama después de cada EventoScan.
 * Reglas:
 * - Máximo 1 visita por día (contabilizada: true)
 * - Ventana móvil de 30 días
 * - Niveles nunca bajan (excepto por inactividad de 90 días, manejado por el job)
 */
export async function evaluarNivel(clienteId: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: { nivel: true },
  })
  if (!cliente) return

  // Obtener configuración para el período de evaluación
  const config = await prisma.configuracionApp.findFirst()
  const periodoDias = config?.nivelesPeriodoDias || 30
  const tortasMultiplicador = config?.tortasMultiplicador || 3

  // Si el cliente tiene un nivel oculto (VIP manual), no evaluar — ese nivel no se mueve automáticamente
  if ((cliente.nivel as any)?.esOculto) {
    console.log(`[evaluarNivel] Cliente ${clienteId} tiene nivel oculto (${cliente.nivel?.nombre}), se omite evaluación automática`)
    return null
  }

  // Solo niveles visibles (no ocultos) participan de la auto-promoción
  const niveles = await prisma.nivel.findMany({
    where: { esOculto: false } as any,
    orderBy: { orden: 'asc' },
  }) // Orden ascendente: Bronce -> Plata -> Oro

  // Usar timezone Argentina — el servidor corre en UTC (ver APRENDIZAJES.md)
  const hacePeriodo = getHaceNDias(periodoDias)

  // Contar DÍAS ÚNICOS con visitas contabilizadas en el período configurado
  // Un cliente puede venir varias veces en un día, pero solo cuenta como 1 visita
  const visitasRecientesResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires'))::bigint as count
    FROM "EventoScan"
    WHERE "clienteId" = ${clienteId}
      AND "contabilizada" = true
      AND "timestamp" >= ${hacePeriodo}
      AND "tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
  `
  const visitasNormales = Number(visitasRecientesResult[0]?.count || 0)

  // Contar pedidos de tortas en el período (cada pedido cuenta como múltiples visitas)
  const pedidosTortasResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint as count
    FROM "EventoScan"
    WHERE "clienteId" = ${clienteId}
      AND "contabilizada" = true
      AND "timestamp" >= ${hacePeriodo}
      AND "tipoEvento" = 'PEDIDO_TORTA'
  `
  const pedidosTortas = Number(pedidosTortasResult[0]?.count || 0)

  // Total de días = visitas normales + (pedidos tortas × multiplicador)
  const visitasRecientes = visitasNormales + (pedidosTortas * tortasMultiplicador)

  console.log(`[evaluarNivel] Cliente ${clienteId}: ${visitasNormales} visitas normales + ${pedidosTortas} pedidos tortas (×${tortasMultiplicador}) = ${visitasRecientes} visitas totales`)

  // Contar usos cruzados (distintos locales en el período)
  const localesDistintos = await prisma.eventoScan.findMany({
    where: {
      clienteId,
      timestamp: { gte: hacePeriodo },
    },
    select: { localId: true },
    distinct: ['localId'],
  })
  const usosCruzados = localesDistintos.length > 1 ? localesDistintos.length - 1 : 0

  // Obtener nivel actual del cliente
  const nivelActualOrden = cliente.nivel?.orden || 0
  const nivelActual = niveles.find((n) => n.orden === nivelActualOrden)

  // Verificar si tiene perfil completo y referidos (se usa para múltiples verificaciones)
  const perfilCompleto = !!(cliente.fechaCumpleanos && cliente.fuenteConocimiento)
  const referidosActuales = cliente.referidosActivados || 0

  // 🔻 PASO 1: Verificar si debe BAJAR de nivel (si no cumple requisitos del nivel actual)
  if (nivelActual && nivelActualOrden > 1) { // Solo si no está en el nivel mínimo (Bronce)
    const criteriosActual = nivelActual.criterios as {
      visitas?: number
      visitasMinimas?: number
      diasVentana?: number
      usosCruzados?: number
      referidosMinimos?: number
      perfilCompleto?: boolean
    }

    const visitasRequeridasActual = criteriosActual.visitas || criteriosActual.visitasMinimas || 0
    const usosCruzadosRequeridosActual = criteriosActual.usosCruzados || 0
    const referidosRequeridosActual = criteriosActual.referidosMinimos || 0
    const requierePerfilCompletoActual = criteriosActual.perfilCompleto || false

    // Si NO cumple con los requisitos de su nivel actual → BAJAR
    if (
      visitasRecientes < visitasRequeridasActual ||
      usosCruzados < usosCruzadosRequeridosActual ||
      referidosActuales < referidosRequeridosActual ||
      (requierePerfilCompletoActual && !perfilCompleto)
    ) {
      // Buscar el nivel inmediato inferior
      const nivelInferior = niveles.find((n) => n.orden === nivelActualOrden - 1)

      if (nivelInferior) {
        await prisma.cliente.update({
          where: { id: clienteId },
          data: { nivelId: nivelInferior.id },
        })

        // Crear notificación de bajada de nivel
        await prisma.noticia.create({
          data: {
            clienteId,
            titulo: `Tu nivel cambió a ${nivelInferior.nombre}`,
            cuerpo: `Para mantener ${nivelActual.nombre} necesitás ${visitasRequeridasActual} visitas en los últimos ${periodoDias} días. Actualmente tenés ${visitasRecientes}. ¡Volvé pronto para recuperar tu nivel!`,
            tipo: 'NIVEL',
          },
        })

        console.log(`[evaluarNivel] 🔻 Cliente ${clienteId} BAJÓ de ${nivelActual.nombre} a ${nivelInferior.nombre} (${visitasRecientes}/${visitasRequeridasActual} visitas, ${usosCruzados}/${usosCruzadosRequeridosActual} usos cruzados, ${referidosActuales}/${referidosRequeridosActual} referidos)`)
        return { nivel: nivelInferior, cambio: 'BAJO' } as any
      }
    }
  }

  // 🔺 PASO 2: Verificar si puede SUBIR de nivel
  const siguienteNivel = niveles.find((n) => n.orden === nivelActualOrden + 1)

  if (!siguienteNivel) {
    console.log(`[evaluarNivel] Cliente ${clienteId} ya está en el nivel máximo y cumple requisitos`)
    return null
  }

  const criteriosSiguiente = siguienteNivel.criterios as {
    visitas?: number
    visitasMinimas?: number
    diasVentana?: number
    usosCruzados?: number
    referidosMinimos?: number
    perfilCompleto?: boolean
  }

  const visitasRequeridasSiguiente = criteriosSiguiente.visitas || criteriosSiguiente.visitasMinimas || 0
  const usosCruzadosRequeridosSiguiente = criteriosSiguiente.usosCruzados || 0
  const referidosRequeridosSiguiente = criteriosSiguiente.referidosMinimos || 0
  const requierePerfilCompletoSiguiente = criteriosSiguiente.perfilCompleto || false

  if (
    visitasRecientes >= visitasRequeridasSiguiente &&
    usosCruzados >= usosCruzadosRequeridosSiguiente &&
    referidosActuales >= referidosRequeridosSiguiente &&
    (!requierePerfilCompletoSiguiente || perfilCompleto)
  ) {
    // Subir al siguiente nivel
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { nivelId: siguienteNivel.id },
    })
    console.log(`[evaluarNivel] 🔺 Cliente ${clienteId} SUBIÓ a nivel ${siguienteNivel.nombre} (${visitasRecientes} visitas, ${usosCruzados} usos cruzados, ${referidosActuales} referidos, perfil: ${perfilCompleto ? 'completo' : 'incompleto'})`)

    // Enviar push notification si está habilitado
    if (cliente.pushSub) {
      const config = await prisma.configuracionApp.findFirst()
      if (config?.pushNuevoNivel && config.pushHabilitado) {
        try {
          const nivelIconos: Record<string, string> = { 'Oro': '🥇', 'Plata': '🥈', 'Bronce': '🥉' }
          const nivelIcono = nivelIconos[siguienteNivel.nombre] || '🎖️'
          await sendPushNotification(cliente.pushSub, {
            title: `${nivelIcono} ¡Subiste a nivel ${siguienteNivel.nombre}!`,
            body: `¡Felicitaciones! Alcanzaste el nivel ${siguienteNivel.nombre} y desbloqueaste nuevos beneficios exclusivos.`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
              url: '/logros',
              type: 'nuevo_nivel',
              nivelId: siguienteNivel.id
            }
          }, {
            clienteId,
            tipo: 'NUEVO_NIVEL',
            metadata: { nivelId: siguienteNivel.id, nivelNombre: siguienteNivel.nombre },
          })
          console.log(`[evaluarNivel] ✅ Push notification enviada: Nuevo nivel ${siguienteNivel.nombre}`)
        } catch (error) {
          console.error('[evaluarNivel] Error enviando push:', error)
        }
      }
    }

    return siguienteNivel // retorna el nuevo nivel para notificación
  } else {
    console.log(`[evaluarNivel] ➡️ Cliente ${clienteId} mantiene nivel ${nivelActual?.nombre || 'actual'} (${visitasRecientes}/${visitasRequeridasSiguiente} visitas para subir, ${usosCruzados}/${usosCruzadosRequeridosSiguiente} usos cruzados, ${referidosActuales}/${referidosRequeridosSiguiente} referidos)`)
  }

  return null
}

/**
 * Dispara beneficios automáticos cuando cambia el estado del auto.
 * Se llama desde el endpoint de estados-auto.
 */
export async function triggerBeneficiosPorEstado(
  clienteId: string,
  nuevoEstado: EstadoAutoEnum
) {
  // Buscar beneficios que se triggean con este estado
  const beneficios = await prisma.beneficio.findMany({
    where: {
      activo: true,
      requiereEstadoExterno: true,
      estadoExternoTrigger: nuevoEstado,
    },
  })

  return beneficios
}
