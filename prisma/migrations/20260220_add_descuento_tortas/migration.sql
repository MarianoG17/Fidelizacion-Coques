-- AlterTable
ALTER TABLE "Nivel"
ADD COLUMN "descuentoPedidosTortas" INTEGER NOT NULL DEFAULT 0;
-- Comentario: Porcentaje de descuento en pedidos de tortas para cada nivel (0-100)
COMMENT ON COLUMN "Nivel"."descuentoPedidosTortas" IS 'Porcentaje de descuento aplicado al total de pedidos de tortas (0-100)';