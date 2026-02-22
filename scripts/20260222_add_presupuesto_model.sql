-- Migración: Sistema de Presupuestos/Cotizaciones
-- Fecha: 2026-02-22
-- Descripción: Agregar tabla Presupuesto (el enum ya existe por prisma db push)

-- 1. Verificar si el enum existe (skip si ya existe)
-- El enum EstadoPresupuesto ya fue creado por prisma db push
-- Si no existe, ejecutar: CREATE TYPE "EstadoPresupuesto" AS ENUM ('PENDIENTE', 'COMPLETO', 'CONFIRMADO', 'CANCELADO');

-- 2. Crear tabla Presupuesto
CREATE TABLE "Presupuesto" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT,
    "nombreCliente" TEXT,
    "telefonoCliente" TEXT,
    "emailCliente" TEXT,
    "items" JSONB NOT NULL,
    "precioTotal" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechaEntrega" TIMESTAMP(3),
    "horaEntrega" TEXT,
    "estado" "EstadoPresupuesto" NOT NULL DEFAULT 'PENDIENTE',
    "camposPendientes" JSONB,
    "notasInternas" TEXT,
    "notasCliente" TEXT,
    "creadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoEn" TIMESTAMP(3),
    "wooOrderId" INTEGER,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- 3. Crear índices para optimizar consultas
CREATE UNIQUE INDEX "Presupuesto_codigo_key" ON "Presupuesto"("codigo");
CREATE INDEX "Presupuesto_codigo_idx" ON "Presupuesto"("codigo");
CREATE INDEX "Presupuesto_clienteId_idx" ON "Presupuesto"("clienteId");
CREATE INDEX "Presupuesto_estado_idx" ON "Presupuesto"("estado");
CREATE INDEX "Presupuesto_creadoEn_idx" ON "Presupuesto"("creadoEn");

-- 4. Crear foreign key constraint
ALTER TABLE "Presupuesto" 
ADD CONSTRAINT "Presupuesto_clienteId_fkey" 
FOREIGN KEY ("clienteId") 
REFERENCES "Cliente"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 5. Verificar que se creó correctamente
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'Presupuesto'
ORDER BY 
    ordinal_position;

-- Comentarios explicativos:
COMMENT ON TABLE "Presupuesto" IS 'Presupuestos/cotizaciones guardadas que pueden confirmarse posteriormente';
COMMENT ON COLUMN "Presupuesto"."codigo" IS 'Código único generado (ej: PRE-12ABC34-5DEF67)';
COMMENT ON COLUMN "Presupuesto"."items" IS 'JSON con productos, add-ons, campos personalizados';
COMMENT ON COLUMN "Presupuesto"."estado" IS 'PENDIENTE: falta info, COMPLETO: listo para confirmar, CONFIRMADO: pedido creado, CANCELADO: descartado';
COMMENT ON COLUMN "Presupuesto"."wooOrderId" IS 'ID del pedido WooCommerce creado al confirmar';
