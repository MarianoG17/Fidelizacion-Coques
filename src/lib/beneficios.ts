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
        const autoConEstado = cliente.autos?.find(
          (auto: any) => auto.estadoActual?.estado === beneficio.estadoExternoTrigger
        )
        if (!autoConEstado) return null
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

  // Contar SOLO visitas contabilizadas en los últimos 30 días
  const visitasRecientes = await prisma.eventoScan.count({
    where: {
      clienteId,
      contabilizada: true,
      timestamp: { gte: hace30dias },
      tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
    },
  })

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
  
  // Buscar el SIGUIENTE nivel inmediato (upgrade incremental)
  const siguienteNivel = niveles.find((n) => n.orden === nivelActualOrden + 1)
  
  if (!siguienteNivel) {
    console.log(`[evaluarNivel] Cliente ${clienteId} ya está en el nivel máximo`)
    return null
  }

  const criterios = siguienteNivel.criterios as {
    visitas?: number          // nombre correcto en BD
    visitasMinimas?: number   // retrocompatibilidad
    diasVentana?: number
    usosCruzados?: number
    referidosMinimos?: number
    perfilCompleto?: boolean
  }

  const visitasRequeridas = criterios.visitas || criterios.visitasMinimas || 0
  const usosCruzadosRequeridos = criterios.usosCruzados || 0
  const referidosRequeridos = criterios.referidosMinimos || 0
  const requierePerfilCompleto = criterios.perfilCompleto || false

  // Verificar si tiene perfil completo
  const perfilCompleto = !!(cliente.fechaCumpleanos && cliente.fuenteConocimiento)
  
  // Verificar referidos
  const referidosActuales = cliente.referidosActivados || 0

  if (
    visitasRecientes >= visitasRequeridas &&
    usosCruzados >= usosCruzadosRequeridos &&
    referidosActuales >= referidosRequeridos &&
    (!requierePerfilCompleto || perfilCompleto)
  ) {
    // Subir al siguiente nivel
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { nivelId: siguienteNivel.id },
    })
    console.log(`[evaluarNivel] Cliente ${clienteId} subió a nivel ${siguienteNivel.nombre} (${visitasRecientes} visitas, ${usosCruzados} usos cruzados, ${referidosActuales} referidos, perfil: ${perfilCompleto ? 'completo' : 'incompleto'})`)
    return siguienteNivel // retorna el nuevo nivel para notificación
  } else {
    console.log(`[evaluarNivel] Cliente ${clienteId} mantiene nivel actual (${visitasRecientes}/${visitasRequeridas} visitas, ${usosCruzados}/${usosCruzadosRequeridos} usos cruzados, ${referidosActuales}/${referidosRequeridos} referidos, perfil: ${perfilCompleto ? 'completo' : 'incompleto'} ${requierePerfilCompleto ? '(requerido)' : ''})`)
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
