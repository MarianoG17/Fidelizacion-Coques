-- CreateTable
CREATE TABLE "SesionMesa" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "mesaId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "inicioSesion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finSesion" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "cerradaPor" TEXT,
    "duracionMinutos" INTEGER,
    CONSTRAINT "SesionMesa_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "SesionMesa_mesaId_idx" ON "SesionMesa"("mesaId");
-- CreateIndex
CREATE INDEX "SesionMesa_clienteId_idx" ON "SesionMesa"("clienteId");
-- CreateIndex
CREATE INDEX "SesionMesa_activa_idx" ON "SesionMesa"("activa");
-- CreateIndex
CREATE INDEX "SesionMesa_localId_activa_idx" ON "SesionMesa"("localId", "activa");
-- AddForeignKey
ALTER TABLE "SesionMesa"
ADD CONSTRAINT "SesionMesa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "SesionMesa"
ADD CONSTRAINT "SesionMesa_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;