-- Agrega campo monto a EventoScan para guardar el importe de PEDIDO_TORTA
ALTER TABLE "EventoScan" ADD COLUMN IF NOT EXISTS "monto" DECIMAL(12,2);
