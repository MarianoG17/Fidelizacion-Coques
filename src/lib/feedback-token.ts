// src/lib/feedback-token.ts
// Tokens firmados para links de encuesta en emails (sin login requerido)
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-prod')

export async function signFeedbackToken(visitaId: string, clienteId: string): Promise<string> {
    return new SignJWT({ visitaId, clienteId, type: 'feedback' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(SECRET)
}

export async function verifyFeedbackToken(token: string): Promise<{ visitaId: string; clienteId: string } | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET)
        if (payload.type !== 'feedback') return null
        return { visitaId: payload.visitaId as string, clienteId: payload.clienteId as string }
    } catch {
        return null
    }
}
