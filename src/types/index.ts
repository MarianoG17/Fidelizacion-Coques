// src/types/index.ts

// ─── Respuestas de API ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

// ─── Pass del cliente ────────────────────────────────────────────────────────

export interface PassData {
  clienteId: string
  nombre: string
  phone: string
  nivel: {
    nombre: string
    orden: number
  } | null
  beneficiosActivos: BeneficioActivo[]
  autos: AutoData[]  // todos los autos del cliente
  otp: {
    token: string
    qrDataUrl: string       // base64 del QR
    tiempoRestante: number  // segundos hasta que vence
    otpauthUrl: string
  }
}

export interface BeneficioActivo {
  id: string
  nombre: string
  descripcionCaja: string
  requiereEstadoExterno: boolean
  condiciones: Record<string, unknown>
}

export interface AutoData {
  id: string
  patente: string
  marca?: string
  modelo?: string
  alias?: string
  estadoActual?: EstadoAutoData | null
}

export interface EstadoAutoData {
  estado: 'RECIBIDO' | 'EN_LAVADO' | 'EN_SECADO' | 'LISTO' | 'ENTREGADO'
  updatedAt: string
}

// ─── Validación OTP (respuesta al local) ──────────────────────────────────────

export interface ValidacionResult {
  valido: boolean
  cliente?: {
    id: string
    nombre: string
    nivel: string | null
    beneficiosActivos: BeneficioActivo[]
    autos: AutoData[]  // todos los autos del cliente
  }
  error?: string
}

// ─── Mapa de mesas ────────────────────────────────────────────────────────────

export interface MesaLayout {
  id: string
  nombre: string
  posX: number
  posY: number
  ancho: number
  alto: number
  activa: boolean
}

export interface LocalLayout {
  localId: string
  nombre: string
  mesas: MesaLayout[]
}

// ─── Estado del auto ─────────────────────────────────────────────────────────

export type EstadoAuto = 'RECIBIDO' | 'EN_LAVADO' | 'EN_SECADO' | 'LISTO' | 'ENTREGADO'

export const ESTADO_AUTO_LABELS: Record<EstadoAuto, string> = {
  RECIBIDO: 'Recibido',
  EN_LAVADO: 'En lavado',
  EN_SECADO: 'En secado',
  LISTO: 'Listo para retirar',
  ENTREGADO: 'Entregado',
}

export const ESTADO_AUTO_COLORS: Record<EstadoAuto, string> = {
  RECIBIDO: '#94a3b8',
  EN_LAVADO: '#3b82f6',
  EN_SECADO: '#f59e0b',
  LISTO: '#22c55e',
  ENTREGADO: '#6b7280',
}

// ─── Niveles ─────────────────────────────────────────────────────────────────

export const NIVEL_COLORS: Record<string, string> = {
  Bronce: '#cd7f32',
  Plata: '#9ca3af',
  Oro: '#f59e0b',
  Platino: '#7c3aed',
}
