// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signClienteJWT } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcrypt'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = loginSchema.parse(body)

    // Buscar cliente por email
    const cliente = await prisma.cliente.findUnique({
      where: { email: validatedData.email },
    })

    // Timing attack prevention: siempre ejecutar bcrypt.compare aunque no exista el usuario
    // Esto hace que el tiempo de respuesta sea similar si el usuario existe o no
    const dummyHash = '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const passwordToCompare = cliente?.password || dummyHash

    const isValid = await bcrypt.compare(validatedData.password, passwordToCompare)

    // Si no existe el cliente o la contraseña es incorrecta
    if (!cliente || !isValid || !cliente.password) {
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Verificar que el cliente esté activo
    if (cliente.estado !== 'ACTIVO') {
      return NextResponse.json(
        { error: 'Tu cuenta no está activa. Contactá con soporte.' },
        { status: 403 }
      )
    }

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

    console.error('Error en login:', error)
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    )
  }
}
