// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-prod')

// ─── JWT para clientes ────────────────────────────────────────────────────────

export interface ClientePayload {
  clienteId: string
  phone: string
}

export async function signClienteJWT(payload: ClientePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '30d')
    .sign(SECRET)
}

export async function verifyClienteJWT(token: string): Promise<ClientePayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as ClientePayload
  } catch {
    return null
  }
}

// ─── Middleware helpers ───────────────────────────────────────────────────────

/**
 * Extrae y verifica el JWT del cliente desde el header Authorization.
 * Uso: const cliente = await requireClienteAuth(request)
 */
export async function requireClienteAuth(req: NextRequest): Promise<ClientePayload | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  return verifyClienteJWT(token)
}

/**
 * Verifica la API Key del local desde el header X-Local-Api-Key.
 * Retorna el local si es válido, null si no.
 */
export async function requireLocalAuth(req: NextRequest) {
  const apiKey = req.headers.get('x-local-api-key')
  if (!apiKey) return null

  const local = await prisma.local.findUnique({
    where: { apiKey, activo: true },
  })

  return local
}

/**
 * Verifica la API Key del lavadero (misma tabla de locales, tipo lavadero).
 */
export async function requireLavaderoAuth(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) return null

  const local = await prisma.local.findUnique({
    where: { apiKey, activo: true },
  })

  if (!local || local.tipo !== 'lavadero') return null
  return local
}

// ─── Respuestas de error estandarizadas ───────────────────────────────────────

export const unauthorized = (msg = 'No autorizado') =>
  NextResponse.json({ error: msg }, { status: 401 })

export const forbidden = (msg = 'Sin permisos') =>
  NextResponse.json({ error: msg }, { status: 403 })

export const badRequest = (msg = 'Datos inválidos') =>
  NextResponse.json({ error: msg }, { status: 400 })

export const notFound = (msg = 'No encontrado') =>
  NextResponse.json({ error: msg }, { status: 404 })

export const serverError = (msg = 'Error interno') =>
  NextResponse.json({ error: msg }, { status: 500 })


/**
 * Estado de un JWT — distingue expirado de inválido.
 * Lección aprendida: token expirado vs token inválido necesitan
 * mensajes diferentes. El expirado es normal, el inválido es sospechoso.
 */
export async function verificarEstadoToken(token: string): Promise<'valid' | 'expired' | 'invalid'> {
  try {
    await jwtVerify(token, SECRET)
    return 'valid'
  } catch (error: any) {
    if (error.code === 'ERR_JWT_EXPIRED') return 'expired'
    return 'invalid'
  }
}

/**
 * Tiempo de vida recomendado: 30 días (reducir fricción para clientes semanales)
 * Ver APRENDIZAJES.md sección 3 — Manejo de tokens JWT
 */
export const JWT_EXPIRES_IN = '30d'
