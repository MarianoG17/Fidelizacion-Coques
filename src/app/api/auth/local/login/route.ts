// src/app/api/auth/local/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json()

    // Validar credenciales
    const USUARIO_COQUES = 'coques'
    const PASSWORD_COQUES = process.env.COQUES_LOCAL_PASSWORD

    if (!PASSWORD_COQUES) {
      return NextResponse.json(
        { error: 'Configuración de autenticación incompleta' },
        { status: 500 }
      )
    }

    if (usuario === USUARIO_COQUES && password === PASSWORD_COQUES) {
      // Generar token simple (timestamp + hash)
      const token = crypto
        .createHash('sha256')
        .update(`${usuario}-${Date.now()}-${PASSWORD_COQUES}`)
        .digest('hex')

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
