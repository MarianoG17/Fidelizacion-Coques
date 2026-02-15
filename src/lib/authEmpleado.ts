// src/lib/authEmpleado.ts
// Sistema de autenticación simple para empleados del lavadero
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET_EMPLEADOS || 'empleados-secret-key-change-in-production'
const EMPLEADO_USERNAME = process.env.EMPLEADO_USERNAME || 'lavadero'
const EMPLEADO_PASSWORD = process.env.EMPLEADO_PASSWORD || 'coques2024'

export interface EmpleadoPayload {
  username: string
  role: 'empleado_lavadero'
}

/**
 * Validar credenciales de empleado
 */
export function validarEmpleado(username: string, password: string): boolean {
  return username === EMPLEADO_USERNAME && password === EMPLEADO_PASSWORD
}

/**
 * Generar token JWT para empleado
 */
export function generarTokenEmpleado(username: string): string {
  const payload: EmpleadoPayload = {
    username,
    role: 'empleado_lavadero',
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

/**
 * Verificar token de empleado
 */
export function verificarTokenEmpleado(token: string): EmpleadoPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as EmpleadoPayload
    return payload
  } catch {
    return null
  }
}

/**
 * Middleware para proteger rutas de empleados
 */
export function requireEmpleadoAuth(req: NextRequest): EmpleadoPayload | null {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  return verificarTokenEmpleado(token)
}
