import pool from '../db.js';

// ============================================================
// CRUD básico de campañas
// ============================================================

export async function obtenerTodas() {
    const resultado = await pool.query(
        `SELECT c.*,
            cr.username AS created_by_username,
            ur.name AS creador_rol,
            inst_cre.institution_name AS creador_institucion
         FROM campaigns c
         LEFT JOIN credentials cr ON cr.id = c.created_by_credentials_id
         LEFT JOIN user_roles ur ON ur.id = cr.role_id
         LEFT JOIN institutions inst_cre ON inst_cre.credential_id = cr.id
         ORDER BY c.start_date DESC`
    );
    return resultado.rows;
}

// Lista solo las campañas cuyo scope incluye la institución dada
// (usado para que un admin institucional vea las campañas que le aplican:
// las que apuntan directamente a su institución, a su barrio, o a su localidad).
export async function obtenerPorInstitucion(institutionId) {
    const resultado = await pool.query(
        `SELECT DISTINCT c.*,
            cr.username AS created_by_username,
            ur.name AS creador_rol,
            inst_cre.institution_name AS creador_institucion
         FROM campaigns c
         JOIN campaign_scope cs ON cs.campaign_id = c.id
         LEFT JOIN credentials cr ON cr.id = c.created_by_credentials_id
         LEFT JOIN user_roles ur ON ur.id = cr.role_id
         LEFT JOIN institutions inst_cre ON inst_cre.credential_id = cr.id
         WHERE
            cs.scope_type = 'GLOBAL'
            OR (cs.scope_type = 'INSTITUTION' AND cs.institution_id = $1)
            OR (cs.scope_type = 'NEIGHBORHOOD' AND cs.neighborhood_id = (
                SELECT i.neighborhood_id FROM institutions i WHERE i.id = $1
            ))
            OR (cs.scope_type = 'LOCALITY' AND cs.localities_id = (
                SELECT n.locality_id
                FROM institutions i
                JOIN neighborhoods n ON n.id = i.neighborhood_id
                WHERE i.id = $1
            ))
         ORDER BY c.start_date DESC`,
        [institutionId]
    );
    return resultado.rows;
}

export async function obtenerPorId(id) {
    const campaniaResult = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    const campania = campaniaResult.rows[0];
    if (!campania) return null;

    const scopeResult = await pool.query('SELECT * FROM campaign_scope WHERE campaign_id = $1', [id]);
    const criteriaResult = await pool.query('SELECT * FROM campaign_criteria WHERE campaign_id = $1', [id]);

    return { ...campania, scope: scopeResult.rows, criteria: criteriaResult.rows };
}

// Crea una campaña junto con sus filas de scope y criteria, todo en una
// sola transacción (si falla cualquier scope/criteria, no queda una
// campaña "huérfana" sin alcance definido).
export async function crear({
    title, type, description, sponsor, created_by_credentials_id,
    start_date, end_date, url_multimedia, scope, criteria
}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const campaniaResult = await client.query(
            `INSERT INTO campaigns
                (title, type, description, sponsor, created_by_credentials_id, start_date, end_date, url_multimedia)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [title, type, description, sponsor, created_by_credentials_id, start_date, end_date, url_multimedia]
        );
        const campania = campaniaResult.rows[0];

        const scopeFilas = [];
        for (const s of scope) {
            const r = await client.query(
                `INSERT INTO campaign_scope (scope_type, campaign_id, institution_id, neighborhood_id, localities_id)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [s.scope_type, campania.id, s.institution_id ?? null, s.neighborhood_id ?? null, s.localities_id ?? null]
            );
            scopeFilas.push(r.rows[0]);
        }

        const criteriaFilas = [];
        for (const c of (criteria ?? [])) {
            const r = await client.query(
                `INSERT INTO campaign_criteria (campaign_id, gender_id, min_age, max_age, grade_id, status_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [campania.id, c.gender_id ?? null, c.min_age ?? null, c.max_age ?? null, c.grade_id ?? null, c.status_id ?? null]
            );
            criteriaFilas.push(r.rows[0]);
        }

        await client.query('COMMIT');
        return { ...campania, scope: scopeFilas, criteria: criteriaFilas };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function actualizarDatosBasicos(id, { title, type, description, sponsor, start_date, end_date, url_multimedia }) {
    const resultado = await pool.query(
        `UPDATE campaigns
         SET title = $1, type = $2, description = $3, sponsor = $4,
             start_date = $5, end_date = $6, url_multimedia = $7
         WHERE id = $8
         RETURNING *`,
        [title, type, description, sponsor, start_date, end_date, url_multimedia, id]
    );
    return resultado.rows[0];
}

export async function eliminar(id) {
    // ON DELETE CASCADE en campaign_scope, campaign_criteria, campaign_enrollments
    // y ON DELETE CASCADE en updates.campaign_id se encargan del resto.
    const resultado = await pool.query('DELETE FROM campaigns WHERE id = $1 RETURNING *', [id]);
    return resultado.rows[0];
}

// ============================================================
// Elegibilidad
// ============================================================

/**
 * Determina si una campaña está vigente hoy (start_date <= hoy <= end_date,
 * o sin end_date = indefinida mientras no se cierre manualmente).
 */
export async function estaActiva(campaignId) {
    const resultado = await pool.query(
        `SELECT id FROM campaigns
         WHERE id = $1 AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
        [campaignId]
    );
    return resultado.rows.length > 0;
}

/**
 * Verifica si una persona (people_id) es elegible para una campaña dada,
 * aplicando exactamente la lógica de negocio acordada:
 *
 *   elegible = (scope_row1 OR scope_row2 OR ...)
 *              AND (sin criteria => todos | criteria_row1 OR criteria_row2 OR ...)
 *
 * El scope se evalúa contra la institución/barrio/localidad de la persona
 * (a través de su student_profile.institution_id -> institutions.neighborhood_id
 * -> neighborhoods.locality_id). El criteria se evalúa contra edad, género,
 * grado y status del student_profile de la persona.
 */
export async function esElegible(peopleId, campaignId) {
    const resultado = await pool.query(
        `WITH persona AS (
            SELECT
                p.id AS people_id,
                p.gender_id,
                DATE_PART('year', AGE(CURRENT_DATE, p.birth_date))::int AS edad,
                sp.institution_id,
                sp.grade_id,
                sp.status_id,
                i.neighborhood_id,
                n.locality_id
            FROM people p
            JOIN student_profiles sp ON sp.people_id = p.id
            JOIN institutions i ON i.id = sp.institution_id
            JOIN neighborhoods n ON n.id = i.neighborhood_id
            WHERE p.id = $1
        ),
        scope_ok AS (
            SELECT EXISTS (
                SELECT 1
                FROM campaign_scope cs, persona pe
                WHERE cs.campaign_id = $2
                  AND (
                      cs.scope_type = 'GLOBAL'
                      OR (cs.scope_type = 'INSTITUTION' AND cs.institution_id = pe.institution_id)
                      OR (cs.scope_type = 'NEIGHBORHOOD' AND cs.neighborhood_id = pe.neighborhood_id)
                      OR (cs.scope_type = 'LOCALITY' AND cs.localities_id = pe.locality_id)
                  )
            ) AS ok
        ),
        criteria_count AS (
            SELECT COUNT(*)::int AS total FROM campaign_criteria WHERE campaign_id = $2
        ),
        criteria_ok AS (
            SELECT EXISTS (
                SELECT 1
                FROM campaign_criteria cc, persona pe
                WHERE cc.campaign_id = $2
                  AND (cc.gender_id IS NULL OR cc.gender_id = pe.gender_id)
                  AND (cc.grade_id IS NULL OR cc.grade_id = pe.grade_id)
                  AND (cc.status_id IS NULL OR cc.status_id = pe.status_id)
                  AND (cc.min_age IS NULL OR pe.edad >= cc.min_age)
                  AND (cc.max_age IS NULL OR pe.edad <= cc.max_age)
            ) AS ok
        )
        SELECT
            (SELECT ok FROM scope_ok) AS scope_ok,
            CASE
                WHEN (SELECT total FROM criteria_count) = 0 THEN true
                ELSE (SELECT ok FROM criteria_ok)
            END AS criteria_ok`,
        [peopleId, campaignId]
    );

    const fila = resultado.rows[0];
    if (!fila) return false; // la persona no tiene student_profile
    return fila.scope_ok === true && fila.criteria_ok === true;
}

/**
 * Lista todas las campañas activas y elegibles para una persona.
 * Se usa en GET /api/campaigns/mine. Una sola query correlacionada,
 * sin iterar campaña por campaña en JS.
 */
export async function obtenerCampaniasElegibles(peopleId) {
    const resultado = await pool.query(
        `WITH persona AS (
            SELECT
                p.id AS people_id,
                p.gender_id,
                DATE_PART('year', AGE(CURRENT_DATE, p.birth_date))::int AS edad,
                sp.institution_id,
                sp.grade_id,
                sp.status_id,
                i.neighborhood_id,
                n.locality_id
            FROM people p
            JOIN student_profiles sp ON sp.people_id = p.id
            JOIN institutions i ON i.id = sp.institution_id
            JOIN neighborhoods n ON n.id = i.neighborhood_id
            WHERE p.id = $1
        )
        SELECT c.*,
            cr.username AS created_by_username,
            ur.name AS creador_rol,
            inst_cre.institution_name AS creador_institucion,
            EXISTS (
                SELECT 1 FROM updates u
                WHERE u.campaign_id = c.id AND u.people_id = pe.people_id
            ) AS actualizada,
            (
                SELECT u.updated_at FROM updates u
                WHERE u.campaign_id = c.id AND u.people_id = pe.people_id
            ) AS updated_at
        FROM campaigns c
        LEFT JOIN credentials cr ON cr.id = c.created_by_credentials_id
        LEFT JOIN user_roles ur ON ur.id = cr.role_id
        LEFT JOIN institutions inst_cre ON inst_cre.credential_id = cr.id,
        persona pe
        WHERE c.start_date <= CURRENT_DATE
          AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
          AND EXISTS (
              SELECT 1 FROM campaign_scope cs
              WHERE cs.campaign_id = c.id
                AND (
                    cs.scope_type = 'GLOBAL'
                    OR (cs.scope_type = 'INSTITUTION' AND cs.institution_id = pe.institution_id)
                    OR (cs.scope_type = 'NEIGHBORHOOD' AND cs.neighborhood_id = pe.neighborhood_id)
                    OR (cs.scope_type = 'LOCALITY' AND cs.localities_id = pe.locality_id)
                )
          )
          AND (
              NOT EXISTS (SELECT 1 FROM campaign_criteria cc WHERE cc.campaign_id = c.id)
              OR EXISTS (
                  SELECT 1 FROM campaign_criteria cc
                  WHERE cc.campaign_id = c.id
                    AND (cc.gender_id IS NULL OR cc.gender_id = pe.gender_id)
                    AND (cc.grade_id IS NULL OR cc.grade_id = pe.grade_id)
                    AND (cc.status_id IS NULL OR cc.status_id = pe.status_id)
                    AND (cc.min_age IS NULL OR pe.edad >= cc.min_age)
                    AND (cc.max_age IS NULL OR pe.edad <= cc.max_age)
              )
          )
        ORDER BY c.start_date DESC`,
        [peopleId]
    );
    return resultado.rows;
}

// ============================================================
// Registro de actualización de datos dentro de una campaña
// ============================================================

/**
 * Registra (o actualiza, si ya existía) la fila de `updates` para una
 * persona en una campaña específica. uq_updates_people_campaign garantiza
 * que solo exista una fila por (people_id, campaign_id); si el estudiante
 * corrige datos de nuevo dentro de la misma campaña, se actualiza
 * `updated_at` en vez de crear una fila nueva (comportamiento confirmado).
 */
// Lista los estudiantes que YA actualizaron sus datos dentro de una campaña
// (una fila en `updates`). Se puede acotar a una institución (para el admin).
export async function obtenerEstudiantesActualizados(campaignId, { institution_id } = {}) {
    const valores = [campaignId];
    let filtroInst = '';
    if (institution_id) {
        valores.push(institution_id);
        filtroInst = `AND sp.institution_id = $${valores.length}`;
    }
    const resultado = await pool.query(
        `SELECT
            p.id AS people_id,
            p.first_name,
            p.last_name,
            p.email,
            sp.grade_id,
            sp.status_id,
            sp.institution_id,
            u.updated_at
         FROM updates u
         JOIN people p ON p.id = u.people_id
         JOIN student_profiles sp ON sp.people_id = p.id
         WHERE u.campaign_id = $1 ${filtroInst}
         ORDER BY u.updated_at DESC`,
        valores
    );
    return resultado.rows;
}

export async function registrarActualizacion(peopleId, campaignId) {
    const resultado = await pool.query(
        `INSERT INTO updates (people_id, campaign_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT ON CONSTRAINT uq_updates_people_campaign
         DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [peopleId, campaignId]
    );
    return resultado.rows[0];
}

// ============================================================
// Métricas
// ============================================================

// CTE reutilizable: calcula, en una sola pasada, si cada student_profile
// existente es elegible para la campaña dada, aplicando la misma lógica
// de esElegible() pero para TODOS los estudiantes a la vez (evita el N+1
// de llamar esElegible() fila por fila desde JS).
const CTE_ELEGIBLES = `
    WITH personas AS (
        SELECT
            sp.id AS student_profile_id,
            sp.people_id,
            p.gender_id,
            DATE_PART('year', AGE(CURRENT_DATE, p.birth_date))::int AS edad,
            sp.institution_id,
            sp.grade_id,
            sp.status_id,
            i.neighborhood_id,
            n.locality_id
        FROM student_profiles sp
        JOIN people p ON p.id = sp.people_id
        JOIN institutions i ON i.id = sp.institution_id
        JOIN neighborhoods n ON n.id = i.neighborhood_id
    ),
    criteria_count AS (
        SELECT COUNT(*)::int AS total FROM campaign_criteria WHERE campaign_id = $1
    ),
    elegibles AS (
        SELECT pe.*
        FROM personas pe
        WHERE
            EXISTS (
                SELECT 1 FROM campaign_scope cs
                WHERE cs.campaign_id = $1
                  AND (
                      cs.scope_type = 'GLOBAL'
                      OR (cs.scope_type = 'INSTITUTION' AND cs.institution_id = pe.institution_id)
                      OR (cs.scope_type = 'NEIGHBORHOOD' AND cs.neighborhood_id = pe.neighborhood_id)
                      OR (cs.scope_type = 'LOCALITY' AND cs.localities_id = pe.locality_id)
                  )
            )
            AND (
                (SELECT total FROM criteria_count) = 0
                OR EXISTS (
                    SELECT 1 FROM campaign_criteria cc
                    WHERE cc.campaign_id = $1
                      AND (cc.gender_id IS NULL OR cc.gender_id = pe.gender_id)
                      AND (cc.grade_id IS NULL OR cc.grade_id = pe.grade_id)
                      AND (cc.status_id IS NULL OR cc.status_id = pe.status_id)
                      AND (cc.min_age IS NULL OR pe.edad >= cc.min_age)
                      AND (cc.max_age IS NULL OR pe.edad <= cc.max_age)
                )
            )
    )
`;

/**
 * Métricas de una campaña para una institución específica: cuántos
 * estudiantes/egresados de esa institución son elegibles, cuántos ya
 * actualizaron, y cuántos están pendientes. Una sola query agregada.
 */
export async function metricasPorInstitucion(campaignId, institutionId) {
    const resultado = await pool.query(
        `${CTE_ELEGIBLES}
        SELECT
            COUNT(*)::int AS total_elegibles,
            COUNT(u.id)::int AS total_actualizados
        FROM elegibles e
        LEFT JOIN updates u ON u.people_id = e.people_id AND u.campaign_id = $1
        WHERE e.institution_id = $2`,
        [campaignId, institutionId]
    );

    const { total_elegibles, total_actualizados } = resultado.rows[0];
    return {
        institution_id: institutionId,
        campaign_id: campaignId,
        total_elegibles,
        total_actualizados,
        total_pendientes: total_elegibles - total_actualizados
    };
}

/**
 * Métricas globales de una campaña, desglosadas por institución
 * (usado por el superadmin). Una sola query agregada con GROUP BY.
 */
export async function metricasGlobales(campaignId) {
    const resultado = await pool.query(
        `${CTE_ELEGIBLES}
        SELECT
            i.id AS institution_id,
            i.institution_name,
            COUNT(*)::int AS total_elegibles,
            COUNT(u.id)::int AS total_actualizados
        FROM elegibles e
        JOIN institutions i ON i.id = e.institution_id
        LEFT JOIN updates u ON u.people_id = e.people_id AND u.campaign_id = $1
        GROUP BY i.id, i.institution_name
        ORDER BY i.institution_name`,
        [campaignId]
    );

    const por_institucion = resultado.rows.map((fila) => ({
        institution_id: fila.institution_id,
        institution_name: fila.institution_name,
        total_elegibles: fila.total_elegibles,
        total_actualizados: fila.total_actualizados,
        total_pendientes: fila.total_elegibles - fila.total_actualizados
    }));

    const totales = por_institucion.reduce(
        (acc, d) => ({
            total_elegibles: acc.total_elegibles + d.total_elegibles,
            total_actualizados: acc.total_actualizados + d.total_actualizados,
            total_pendientes: acc.total_pendientes + d.total_pendientes
        }),
        { total_elegibles: 0, total_actualizados: 0, total_pendientes: 0 }
    );

    return { campaign_id: campaignId, totales, por_institucion };
}
