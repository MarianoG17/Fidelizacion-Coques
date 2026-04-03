-- Migración: ConfiguracionMarca (White-Label)
-- Tabla para que nuevos deployments configuren el branding desde el admin.
-- El app de Coques NO usa esta tabla — sigue con brand.config.ts.

CREATE TABLE IF NOT EXISTS "ConfiguracionMarca" (
    "id"                  TEXT NOT NULL,

    -- Empresa
    "nombreEmpresa"       TEXT NOT NULL DEFAULT 'Mi Empresa',
    "nombreCompleto"      TEXT,
    "slogan"              TEXT,
    "descripcion"         TEXT,
    "dominio"             TEXT,
    "sitioWeb"            TEXT,

    -- Branding / Nombres
    "appNombreClientes"   TEXT NOT NULL DEFAULT 'Mi App',
    "appNombreStaff"      TEXT NOT NULL DEFAULT 'Mi App Staff',
    "appNombreAdmin"      TEXT NOT NULL DEFAULT 'Mi App Admin',
    "programaNombre"      TEXT NOT NULL DEFAULT 'Mi Programa',

    -- Colores (nombres Tailwind)
    "colorPrimario"       TEXT NOT NULL DEFAULT 'blue',
    "colorSecundario"     TEXT NOT NULL DEFAULT 'orange',
    "colorAcento"         TEXT NOT NULL DEFAULT 'purple',

    -- Assets
    "logoUrl"             TEXT,
    "faviconUrl"          TEXT,

    -- Contacto
    "telefono"            TEXT,
    "emailContacto"       TEXT,
    "direccion"           TEXT,

    -- Redes Sociales
    "instagram"           TEXT,
    "facebook"            TEXT,
    "whatsapp"            TEXT,
    "googleMapsReviews"   TEXT,

    -- Emails Transaccionales
    "emailFrom"           TEXT,
    "emailFromNombre"     TEXT,
    "emailReplyTo"        TEXT,

    -- Módulos / Feature Flags
    "moduloNiveles"       BOOLEAN NOT NULL DEFAULT true,
    "moduloBeneficios"    BOOLEAN NOT NULL DEFAULT true,
    "moduloLogros"        BOOLEAN NOT NULL DEFAULT true,
    "moduloReferidos"     BOOLEAN NOT NULL DEFAULT false,
    "moduloMesas"         BOOLEAN NOT NULL DEFAULT false,
    "moduloPresupuestos"  BOOLEAN NOT NULL DEFAULT false,
    "moduloEventos"       BOOLEAN NOT NULL DEFAULT false,
    "moduloFeedback"      BOOLEAN NOT NULL DEFAULT true,
    "moduloPushNotif"     BOOLEAN NOT NULL DEFAULT true,
    "moduloGoogleOAuth"   BOOLEAN NOT NULL DEFAULT false,
    "moduloPasskeys"      BOOLEAN NOT NULL DEFAULT false,
    "moduloWoocommerce"   BOOLEAN NOT NULL DEFAULT false,
    "moduloDeltawash"     BOOLEAN NOT NULL DEFAULT false,
    "moduloExportExcel"   BOOLEAN NOT NULL DEFAULT true,

    -- Textos Personalizables
    "textoBienvenida"     TEXT,
    "textoQR"             TEXT,

    -- Estado
    "setupCompleto"       BOOLEAN NOT NULL DEFAULT false,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfiguracionMarca_pkey" PRIMARY KEY ("id")
);