// src/app/api/auth/empleado/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validarEmpleado, generarTokenEmpleado } from '@/lib/authEmpleado'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/empleado/login
 * Login para empleados del lavadero
 */
export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json()

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Usuario y contraseña requeridos' },
                { status: 400 }
            )
        }

        // Validar credenciales
        if (!validarEmpleado(username, password)) {
            return NextResponse.json(
                { error: 'Credenciales inválidas' },
                { status: 401 }
            )
        }

        // Generar token JWT
        const token = generarTokenEmpleado(username)

        return NextResponse.json({
            success: true,
            token,
            user: {
                username,
                role: 'empleado_lavadero',
            },
        })
    } catch (error) {
        console.error('[POST /api/auth/empleado/login] Error:', error)
        return NextResponse.json(
            { error: 'Error al iniciar sesión' },
            { status: 500 }
        )
    }
}
