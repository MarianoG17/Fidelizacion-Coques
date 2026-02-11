// src/app/api/otp/validar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized, badRequest, serverError } from '@/lib/auth'
import { validarToken } from '@/lib/otp'
import { getBeneficiosActivos } from '@/lib/beneficios'
import { ESTADO_AUTO_LABELS } from '@/types'

export const dynamic = 'force-dynamic'

const validarSchema = z.object({
  otp: z.string().length(6, 'El OTP debe tener 6 dígitos'),
  // localId se saca del auth, no del body — más seguro
})

// POST /api/otp/validar
// Requiere header X-Local-Api-Key del local
// Body: { otp: "123456" }
export async function POST(req: NextRequest) {
  try {
    // Autenticar el local
    const local = await requireLocalAuth(req)
    if (!local) return unauthorized('API Key de local inválida')

    const body = await req.json()
    const parsed = validarSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0].message)

    const { otp } = parsed.data

    // Buscar clientes activos y validar OTP contra cada uno
    // Nota: en producción con muchos clientes, se puede optimizar
    // con un índice o caché Redis. Para el MVP funciona bien.
    const clientes = await prisma.cliente.findMany({
      where: { estado: 'ACTIVO', otpSecret: { not: null } },
      select: { id: true, otpSecret: true },
    })

    let clienteValido = null
    for (const c of clientes) {
      if (c.otpSecret && validarToken(otp, c.otpSecret)) {
        clienteValido = c
        break
      }
    }

    if (!clienteValido) {
      return NextResponse.json(
        { valido: false, error: 'Código inválido o vencido' },
        { status: 200 } // 200 para que el frontend lo maneje, no un error HTTP
      )
    }

    // Obtener datos completos del cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteValido.id },
      include: {
        nivel: true,
        estadoAuto: true,
      },
    })

    if (!cliente) return badRequest('Cliente no encontrado')

    // Obtener beneficios activos
    const beneficios = await getBeneficiosActivos(cliente.id)

    return NextResponse.json({
      valido: true,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre || 'Cliente',
        nivel: cliente.nivel?.nombre || null,
        beneficiosActivos: beneficios.map((b) => ({
          id: b!.id,
          nombre: b!.nombre,
          descripcionCaja: b!.descripcionCaja,
          requiereEstadoExterno: b!.requiereEstadoExterno,
          condiciones: b!.condiciones,
        })),
        estadoAuto: cliente.estadoAuto
          ? {
              estado: cliente.estadoAuto.estado,
              label: ESTADO_AUTO_LABELS[cliente.estadoAuto.estado],
              updatedAt: cliente.estadoAuto.updatedAt.toISOString(),
            }
          : null,
      },
    })
  } catch (error) {
    console.error('[POST /api/otp/validar]', error)
    return serverError()
  }
}
