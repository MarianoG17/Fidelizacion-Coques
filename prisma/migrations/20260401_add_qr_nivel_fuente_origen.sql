-- Agrega valor QR_NIVEL al enum FuenteOrigen
-- Identifica clientes registrados vía QR especial con nivel pre-asignado (ej: FORZA)

ALTER TYPE "FuenteOrigen" ADD VALUE IF NOT EXISTS 'QR_NIVEL';
