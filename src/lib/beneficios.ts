// src/lib/beneficios.ts
import { getHaceNDias } from '@/lib/timezone'
import { prisma } from './prisma'
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
      }

      if (condiciones.usoUnico) {
        const usado = await prisma.eventoScan.count({
          where: { clienteId, beneficioId: beneficio.id },
        })
        if (usado > 0) return null
      }

      if (condiciones.maxPorDia) {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const usado = await prisma.eventoScan.count({
          where: {
            clienteId,
            beneficioId: beneficio.id,
            timestamp: { gte: hoy },
          },
        })
        if (usado >= condiciones.maxPorDia) return null
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

  const niveles = await prisma.nivel.findMany({ orderBy: { orden: 'asc' } }) // Orden ascendente: Bronce -> Plata -> Oro

  // Usar timezone Argentina — el servidor corre en UTC (ver APRENDIZAJES.md)
  const hace30dias = getHaceNDias(30)

  // Contar DÍAS ÚNICOS con visitas contabilizadas en los últimos 30 días
  // Un cliente puede venir varias veces en un día, pero solo cuenta como 1 visita
  const visitasRecientesResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires'))::bigint as count
    FROM "EventoScan"
    WHERE "clienteId" = ${clienteId}
      AND "contabilizada" = true
      AND "timestamp" >= ${hace30dias}
      AND "tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
  `
  const visitasRecientes = Number(visitasRecientesResult[0]?.count || 0)

  // Contar usos cruzados (distintos locales en últimos 30 días)
  const localesDistintos = await prisma.eventoScan.findMany({
    where: {
      clienteId,
      timestamp: { gte: hace30dias },
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
            cuerpo: `Para mantener ${nivelActual.nombre} necesitás ${visitasRequeridasActual} visitas en los últimos 30 días. Actualmente tenés ${visitasRecientes}. ¡Volvé pronto para recuperar tu nivel!`,
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
