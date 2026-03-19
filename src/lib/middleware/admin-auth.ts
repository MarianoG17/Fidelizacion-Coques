// src/lib/middleware/admin-auth.ts

import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware para validar autenticación de admin
 * 
 * Verifica que el header 'x-admin-key' coincida con ADMIN_KEY del entorno.
 * 
 * @param req - NextRequest con headers
 * @returns null si está autorizado, NextResponse con error 401 si no
 * 
 * @example
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   const authError = requireAdminAuth(req)
 *   if (authError) return authError
 *   
 *   // ... resto del código
 * }
 * ```
 */
export function requireAdminAuth(req: NextRequest): NextResponse | null {
    const adminKey = req.headers.get('x-admin-key')

    // Validar que existe ADMIN_KEY en env
    if (!process.env.ADMIN_KEY) {
        console.error('[ADMIN_AUTH] ❌ ADMIN_KEY no configurada en variables de entorno')
        return NextResponse.json(
            {
                error: 'Configuración de servidor incorrecta',
                code: 'ADMIN_KEY_NOT_CONFIGURED'
            },
            { status: 500 }
        )
    }

    // Validar que el cliente envió la key
    if (!adminKey) {
        console.warn('[ADMIN_AUTH] ⚠️ Request sin x-admin-key header')
        return NextResponse.json(
            {
                error: 'No autorizado - Falta header de autenticación',
                code: 'ADMIN_AUTH_MISSING'
            },
            { status: 401 }
        )
    }

    // Validar que la key es correcta
    if (adminKey !== process.env.ADMIN_KEY) {
        console.warn('[ADMIN_AUTH] ⚠️ x-admin-key incorrecta')
        return NextResponse.json(
            {
                error: 'No autorizado - Credenciales inválidas',
                code: 'ADMIN_AUTH_INVALID'
            },
            { status: 401 }
        )
    }

    // ✅ Autorizado
    return null
}

/**
 * Wrapper alternativo que lanza error en vez de retornar NextResponse
 * Útil para usar con try/catch
 * 
 * @throws Error si no está autorizado
 */
export function assertAdminAuth(req: NextRequest): void {
    const adminKey = req.headers.get('x-admin-key')

    if (!process.env.ADMIN_KEY) {
        throw new Error('ADMIN_KEY no configurada en variables de entorno')
    }

    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        throw new Error('No autorizado')
    }
}
