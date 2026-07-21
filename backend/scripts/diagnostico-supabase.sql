-- ============================================================
-- DIAGNÓSTICO DE SOLO LECTURA
-- No modifica nada. Corre esto en el SQL Editor de Supabase y
-- comparte los resultados de cada bloque.
-- ============================================================

-- 1. ¿La vista vw_credential_info ya expone credential_id?
--    (crítico: el login nuevo lo necesita)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'vw_credential_info'
ORDER BY ordinal_position;
-- Esperado tras la corrección: debe aparecer 'credential_id' en la lista.


-- 2. ¿Existe el UNIQUE accidental en campaigns.title?
SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.campaigns'::regclass
  AND contype = 'u';
-- Si aparece 'campaigns_title_key' => todavía tienes el UNIQUE que hay que quitar.


-- 3. Definición actual de las vistas que corregimos (para ver si usan JOIN o LEFT JOIN)
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
-- Solo lista las vistas existentes; con esto confirmamos que están las 8.


-- 4. ¿Hay campañas ya creadas? (y cuántas)
SELECT COUNT(*) AS total_campanias FROM campaigns;


-- 5. ¿Hay actualizaciones registradas? (tabla updates)
SELECT COUNT(*) AS total_updates FROM updates;


-- 6. Cuántas filas hay en las tablas principales (para saber qué NO se debe perder)
SELECT
    (SELECT COUNT(*) FROM institutions)    AS instituciones,
    (SELECT COUNT(*) FROM people)          AS personas,
    (SELECT COUNT(*) FROM student_profiles) AS perfiles,
    (SELECT COUNT(*) FROM credentials)     AS credenciales,
    (SELECT COUNT(*) FROM user_roles)      AS roles;


-- 7. ¿Cómo se llaman exactamente los roles? (para confirmar 'superadmin'/'administrador'/'estudiante')
SELECT id, name FROM user_roles ORDER BY id;


-- 8. ¿Las contraseñas están hasheadas con bcrypt o en texto plano?
--    (un hash bcrypt empieza con $2a$, $2b$ o $2y$)
SELECT
    username,
    CASE
        WHEN password LIKE '$2%' THEN 'hasheada (bcrypt)'
        ELSE 'TEXTO PLANO'
    END AS estado_password
FROM credentials
ORDER BY username;
