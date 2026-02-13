// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signClienteJWT } from '@/lib/auth'
import { generarSecretoOTP } from '@/lib/otp'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().regex(/^\+549\d{10}$/, 'Teléfono inválido (formato: +5491112345678)'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = registerSchema.parse(body)

    // Verificar si ya existe un cliente con ese email
    const existingEmail = await prisma.cliente.findUnique({
      where: { email: validatedData.email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un cliente con ese teléfono
    const existingPhone = await prisma.cliente.findUnique({
      where: { phone: validatedData.phone },
    })

    if (existingPhone) {
      return NextResponse.json(
        { error: 'El teléfono ya está registrado' },
        { status: 400 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS)

    // Generar otpSecret para el cliente (necesario para el QR del Pass)
    const otpSecret = generarSecretoOTP()

    // Obtener el nivel Bronce (orden 1) para asignarlo por defecto
    const nivelBronce = await prisma.nivel.findFirst({
      where: { orden: 1 },
    })

    // Crear el cliente con estado ACTIVO y nivel inicial Bronce
    const cliente = await prisma.cliente.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        nombre: validatedData.nombre,
        phone: validatedData.phone,
        estado: 'ACTIVO',
        fuenteOrigen: 'AUTOREGISTRO',
        consentimientoAt: new Date(),
        otpSecret,
        nivelId: nivelBronce?.id, // Asignar nivel Bronce desde el registro
      },
    })

    // Generar JWT
    const token = await signClienteJWT({
      clienteId: cliente.id,
      phone: cliente.phone,
    })

    // No retornar el password en la respuesta
    const { password: _, ...clienteSinPassword } = cliente

    return NextResponse.json({
      success: true,
      data: {
        cliente: clienteSinPassword,
        token,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error en registro:', error)
    return NextResponse.json(
      { error: 'Error al crear la cuenta' },
      { status: 500 }
    )
  }
}
