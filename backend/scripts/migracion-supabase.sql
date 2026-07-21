-- ============================================================
-- MIGRACIÓN SEGURA PARA SUPABASE EXISTENTE
-- ============================================================
-- Aplica SOLO los cambios de estructura que faltan, sin recrear
-- tablas ni borrar datos. Diseñado para una BD que ya tiene
-- instituciones, personas, credenciales y catálogos cargados.
--
-- Confirmado antes de generar este script:
--   * NO hay campañas ni updates -> esas partes no tienen riesgo.
--   * Las 50 personas y 61 credenciales existentes se conservan.
--   * Los 3 roles ya se llaman superadmin/administrador/estudiante.
--
-- Corre este script COMPLETO en el SQL Editor de Supabase.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1: Quitar el UNIQUE accidental en campaigns.title
-- ------------------------------------------------------------
-- Una campaña no debe tener título único a nivel global (distintas
-- instituciones pueden querer el mismo título de campaña).
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_title_key;


-- ------------------------------------------------------------
-- PASO 2: Recrear las 8 vistas con las correcciones
-- ------------------------------------------------------------
-- Se hace DROP + CREATE porque algunas vistas cambian el nombre u
-- orden de columnas (ej. vw_credential_info pasa de "role_name" a
-- "rol" y añade credential_id), y Postgres no permite CREATE OR
-- REPLACE en ese caso. Las vistas no contienen datos, recrearlas es
-- 100% seguro.
--
-- Correcciones aplicadas:
--   * vw_credential_info: expone credential_id y la columna del rol
--     se llama "rol" (el backend la lee con ese nombre exacto). ESTA
--     es la que hoy impediría el login, porque tu versión usa
--     "role_name" y el código espera "rol".
--   * vw_institutions_complete / vw_students_complete /
--     vw_campaign_enrollments / vw_campaigns_complete: JOIN -> LEFT
--     JOIN donde correspondía, para no perder instituciones sin
--     admin, estudiantes sin credencial ni egresados sin grado.

DROP VIEW IF EXISTS public.vw_campaign_enrollments;
DROP VIEW IF EXISTS public.vw_campaigns_complete;
DROP VIEW IF EXISTS public.vw_campaigns_criteria;
DROP VIEW IF EXISTS public.vw_campaigns_scope;
DROP VIEW IF EXISTS public.vw_credential_info;
DROP VIEW IF EXISTS public.vw_institutions_complete;
DROP VIEW IF EXISTS public.vw_students_complete;
DROP VIEW IF EXISTS public.vw_updates_history;


CREATE VIEW public.vw_campaign_enrollments AS
 SELECT c.title AS campaign,
    p.first_name,
    p.last_name,
    p.document_number,
    p.phone,
    i.institution_name,
    g.grade,
    ce.enrolled_at
   FROM (((((public.campaign_enrollments ce
     JOIN public.campaigns c ON ((c.id = ce.campaign_id)))
     JOIN public.student_profiles sp ON ((sp.id = ce.student_profile_id)))
     JOIN public.people p ON ((p.id = sp.people_id)))
     JOIN public.institutions i ON ((i.id = sp.institution_id)))
     LEFT JOIN public.grades g ON ((g.id = sp.grade_id)));

CREATE VIEW public.vw_campaigns_complete AS
 SELECT c.id AS campaign_id,
    c.title AS "nombre_campaña",
    c.type AS "tipo_campaña",
    c.description AS "descripcion_campaña",
    c.sponsor,
    c.start_date,
    c.end_date,
    cr.username AS usuario_creador,
    ur.name AS rol_creador,
    i.institution_name AS institucion_creadora
   FROM (((public.campaigns c
     LEFT JOIN public.credentials cr ON ((cr.id = c.created_by_credentials_id)))
     LEFT JOIN public.user_roles ur ON ((ur.id = cr.role_id)))
     LEFT JOIN public.institutions i ON ((i.credential_id = cr.id)));

CREATE VIEW public.vw_campaigns_criteria AS
 SELECT c.title AS campaign,
    g.name AS gender,
    cc.min_age,
    cc.max_age,
    gr.grade,
    s.status
   FROM ((((public.campaign_criteria cc
     JOIN public.campaigns c ON ((c.id = cc.campaign_id)))
     LEFT JOIN public.genders g ON ((g.id = cc.gender_id)))
     LEFT JOIN public.grades gr ON ((gr.id = cc.grade_id)))
     LEFT JOIN public.statuses s ON ((s.id = cc.status_id)));

CREATE VIEW public.vw_campaigns_scope AS
 SELECT c.title AS campaign,
    cs.scope_type,
    i.institution_name,
    n.name AS neighborhood,
    l.name AS locality
   FROM ((((public.campaign_scope cs
     JOIN public.campaigns c ON ((c.id = cs.campaign_id)))
     LEFT JOIN public.institutions i ON ((i.id = cs.institution_id)))
     LEFT JOIN public.neighborhoods n ON ((n.id = cs.neighborhood_id)))
     LEFT JOIN public.localities l ON ((l.id = cs.localities_id)));

CREATE VIEW public.vw_credential_info AS
 SELECT c.id AS credential_id,
    c.username,
    c.password,
    u.name AS rol
   FROM (public.credentials c
     JOIN public.user_roles u ON ((c.role_id = u.id)));

CREATE VIEW public.vw_institutions_complete AS
 SELECT i.id AS institution_id,
    i.institution_name,
    i.director,
    i.dane_code,
    c.username,
    ur.name AS role,
    n.name AS neighborhood,
    l.name AS locality
   FROM ((((public.institutions i
     LEFT JOIN public.credentials c ON ((c.id = i.credential_id)))
     LEFT JOIN public.user_roles ur ON ((ur.id = c.role_id)))
     JOIN public.neighborhoods n ON ((n.id = i.neighborhood_id)))
     JOIN public.localities l ON ((l.id = n.locality_id)));

CREATE VIEW public.vw_students_complete AS
 SELECT p.id AS people_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.document_number,
    c.username,
    ur.name AS role,
    i.institution_name,
    g.grade,
    s.status,
    n.name AS neighborhood,
    l.name AS locality
   FROM ((((((((public.student_profiles sp
     JOIN public.people p ON ((p.id = sp.people_id)))
     LEFT JOIN public.credentials c ON ((c.id = p.credential_id)))
     LEFT JOIN public.user_roles ur ON ((ur.id = c.role_id)))
     JOIN public.institutions i ON ((i.id = sp.institution_id)))
     LEFT JOIN public.grades g ON ((g.id = sp.grade_id)))
     JOIN public.statuses s ON ((s.id = sp.status_id)))
     JOIN public.neighborhoods n ON ((n.id = p.neighborhood_id)))
     JOIN public.localities l ON ((l.id = n.locality_id)));

CREATE VIEW public.vw_updates_history AS
 SELECT p.first_name,
    p.last_name,
    c.title AS campaign,
    u.updated_at
   FROM ((public.updates u
     JOIN public.people p ON ((p.id = u.people_id)))
     JOIN public.campaigns c ON ((c.id = u.campaign_id)));


-- ------------------------------------------------------------
-- PASO 3 (manual, fuera de este script):
-- ------------------------------------------------------------
-- Las 61 credenciales están en TEXTO PLANO. El login usa bcrypt, así
-- que hay que hashearlas o nadie podrá entrar. Esto NO se hace aquí:
-- se corre desde el backend, una sola vez, con:
--
--     cd backend
--     npm install
--     npm run migrate:hash-passwords
--
-- Ese script detecta las que ya están hasheadas y las salta, así que
-- es seguro correrlo más de una vez.
-- ============================================================

-- ============================================================
-- MIGRACIÓN 2026-07-19: perfil de institución (logo + banner)
-- Ejecutar en Supabase para habilitar la vista de perfil de institución.
-- URLs de imagen (no BLOB) para no inflar la base de datos.
-- ============================================================
ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS logo_url   VARCHAR(500),
    ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);
