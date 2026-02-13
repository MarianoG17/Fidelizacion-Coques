-- AlterTable: Add fuenteConocimiento field to Cliente table
ALTER TABLE "Cliente" ADD COLUMN "fuenteConocimiento" TEXT;

-- Comment
COMMENT ON COLUMN "Cliente"."fuenteConocimiento" IS 'Cómo conoció el negocio: Amigos, Instagram, Google Maps, Vi luz y entré';
