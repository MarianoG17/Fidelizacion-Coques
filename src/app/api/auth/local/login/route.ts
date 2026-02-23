// src/app/api/auth/local/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET_LOCAL || 'coques-local-secret-change-in-production'
const USUARIO_COQUES = 'coques'

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json()

    // Validar credenciales
    const PASSWORD_COQUES = process.env.COQUES_LOCAL_PASSWORD

    if (!PASSWORD_COQUES) {
      return NextResponse.json(
        { error: 'Configuración de autenticación incompleta' },
        { status: 500 }
      )
    }

    if (usuario === USUARIO_COQUES && password === PASSWORD_COQUES) {
      // Generar token JWT seguro
      const token = jwt.sign(
        {
          usuario: USUARIO_COQUES,
          role: 'local_staff',
          timestamp: Date.now()
        },
        JWT_SECRET,
        { expiresIn: '12h' } // Token expira en 12 horas
      )

      return NextResponse.json({
        success: true,
        token,
        usuario: USUARIO_COQUES,
      })
    } else {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('[Local Login] Error:', error)
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    )
  }
}
