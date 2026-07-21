-- ============================================================
--  Sincronización de esquema: LOCAL (riwi_local)  ->  SUPABASE
--  Fecha: 2026-07 · Idempotente (seguro de re-ejecutar).
--  Cómo aplicar: pegar y ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) campaigns.type debe ser NULLABLE.
--    (Bug original: en Supabase estaba NOT NULL y rompía la creación de
--    campañas cuando el formulario no envía "type").
ALTER TABLE public.campaigns ALTER COLUMN type DROP NOT NULL;

-- 2) institutions: columnas para el logo y el banner del colegio.
--    Guardamos URLs (VARCHAR), no imágenes (BLOB), para no inflar la BD.
ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS logo_url   VARCHAR(500),
    ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);

-- 3) (DATOS, opcional) Asignar los logos/banners de los colegios.
--    Ejecutar además:  backend/seed/institution_images.sql
--    (usa las mismas URLs del bucket de Supabase Storage y hace match por
--    nombre de institución con ILIKE, así que funciona igual en Supabase).
