// src/app/api/auth/local/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET_LOCAL || 'coques-local-secret-change-in-production'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token no proporcionado' },
        { status: 401 }
      )
    }

    try {
      // Verificar y decodificar el token JWT
      const decoded = jwt.verify(token, JWT_SECRET) as {
        usuario: string
        role: string
        timestamp: number
      }

      // Verificar que el rol sea correcto
      if (decoded.role !== 'local_staff') {
        return NextResponse.json(
          { valid: false, error: 'Token inválido' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        valid: true,
        usuario: decoded.usuario,
      })
    } catch (error: any) {
      // Token expirado o inválido
      console.error('[Local Verify] Token inválido:', error.message)
      return NextResponse.json(
        { valid: false, error: 'Token expirado o inválido' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('[Local Verify] Error:', error)
    return NextResponse.json(
      { valid: false, error: 'Error en el servidor' },
      { status: 500 }
    )
  }
}
