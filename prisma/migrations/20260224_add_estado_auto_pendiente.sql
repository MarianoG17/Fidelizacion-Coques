-- CreateTable: EstadoAutoPendiente
-- Permite guardar estados de autos para clientes que aún no están registrados en Coques
-- Se procesa automáticamente cuando el cliente se registra
CREATE TABLE "EstadoAutoPendiente" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "notas" TEXT,
    "localOrigenId" TEXT,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "procesadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstadoAutoPendiente_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "EstadoAutoPendiente_phone_idx" ON "EstadoAutoPendiente"("phone");
CREATE INDEX "EstadoAutoPendiente_procesado_idx" ON "EstadoAutoPendiente"("procesado");
CREATE INDEX "EstadoAutoPendiente_phone_procesado_idx" ON "EstadoAutoPendiente"("phone", "procesado");
CREATE INDEX "EstadoAutoPendiente_createdAt_idx" ON "EstadoAutoPendiente"("createdAt");