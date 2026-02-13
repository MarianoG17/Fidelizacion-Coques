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
