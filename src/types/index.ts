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
  email?: string
  fechaCumpleanos?: string
  codigoReferido?: string
  referidosActivados: number
  nivel: {
    nombre: string
    orden: number
    descripcionBeneficios?: string
  } | null
  beneficiosActivos: BeneficioActivo[]
  autos: AutoData[]  // todos los autos del cliente
  logrosRecientes: LogroData[]  // logros no vistos
  totalXp: number
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

// ─── Feedback ────────────────────────────────────────────────────────────────

export interface FeedbackData {
  id: string
  calificacion: number
  comentario?: string
  enviadoGoogleMaps: boolean
  createdAt: string
}

export interface FeedbackRequest {
  calificacion: number
  comentario?: string
  eventoScanId?: string
}

// ─── Logros y Gamificación ───────────────────────────────────────────────────

export type TipoLogro =
  | 'PRIMERA_VISITA'
  | 'VISITAS_CONSECUTIVAS'
  | 'NIVEL_ALCANZADO'
  | 'REFERIDOS'
  | 'FEEDBACK_POSITIVO'
  | 'CUMPLEANOS'
  | 'ANIVERSARIO'
  | 'USO_CRUZADO'
  | 'MADRUGADOR'
  | 'CLIENTE_VIP'

export interface LogroData {
  id: string
  nombre: string
  descripcion: string
  tipo: TipoLogro
  icono?: string
  puntosXp: number
  obtenidoEn: string
  visto: boolean
}

// ─── Referidos ───────────────────────────────────────────────────────────────

export interface ReferidoData {
  nombre: string
  estado: 'PRE_REGISTRADO' | 'ACTIVO'
  createdAt: string
}

// ─── Historial de Visitas ───────────────────────────────────────────────────

export interface VisitaHistorial {
  id: string
  timestamp: string
  local: {
    nombre: string
    tipo: string
  }
  mesa?: {
    nombre: string
  }
  beneficio?: {
    nombre: string
  }
  contabilizada: boolean
}

// ─── Perfil de Cliente ───────────────────────────────────────────────────────

export interface PerfilData {
  nombre: string
  email?: string
  telefono: string
  phone: string
  fechaCumpleanos?: string
  createdAt: string
  estado: 'ACTIVO' | 'INACTIVO'
  codigoReferido?: string
  referidosActivados?: number
  totalXp?: number
  nivel: {
    nombre: string
    descripcionBeneficios?: string
  }
}

export interface UpdatePerfilRequest {
  nombre?: string
  email?: string
  fechaCumpleanos?: string
}

// ─── Recuperación de Contraseña ──────────────────────────────────────────────

export interface RecuperarPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}
