import pool from '../db.js';

// Nota de diseño: people <-> student_profiles es una relación 1 a 1
// (uq_student_profile_people UNIQUE (people_id)). Un estudiante que se
// gradúa o cambia de institución ACTUALIZA su fila existente de
// student_profiles (status_id, institution_id, grade_id, end_date),
// no crea una fila nueva. Por eso todo aquí se maneja como "una persona
// con su perfil de estudiante", nunca como entidades independientes.

// Selecciona todos los estudiantes/egresados usando la vista ya corregida
// (LEFT JOIN en credentials/user_roles/grades para no perder egresados
// sin grado ni personas sin credencial creada).
export async function obtenerTodos({ institution_id, status_id } = {}) {
    const condiciones = [];
    const valores = [];

    if (institution_id) {
        valores.push(institution_id);
        condiciones.push(`sp.institution_id = $${valores.length}`);
    }
    if (status_id) {
        valores.push(status_id);
        condiciones.push(`sp.status_id = $${valores.length}`);
    }

    const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const resultado = await pool.query(
        `SELECT
            p.id AS people_id,
            p.first_name,
            p.last_name,
            p.email,
            p.phone,
            p.document_number,
            p.document_type_id,
            p.gender_id,
            p.birth_date,
            p.address,
            p.neighborhood_id,
            p.credential_id,
            sp.id AS student_profile_id,
            sp.institution_id,
            sp.grade_id,
            sp.status_id,
            sp.start_date,
            sp.end_date,
            (SELECT MAX(u.updated_at) FROM updates u WHERE u.people_id = p.id) AS ultima_actualizacion
        FROM student_profiles sp
        JOIN people p ON p.id = sp.people_id
        ${whereClause}
        ORDER BY p.last_name, p.first_name`,
        valores
    );
    return resultado.rows;
}

export async function obtenerPorId(peopleId) {
    const resultado = await pool.query(
        `SELECT
            p.id AS people_id,
            p.first_name,
            p.last_name,
            p.email,
            p.phone,
            p.document_number,
            p.document_type_id,
            p.gender_id,
            p.birth_date,
            p.address,
            p.neighborhood_id,
            p.credential_id,
            sp.id AS student_profile_id,
            sp.institution_id,
            sp.grade_id,
            sp.status_id,
            sp.start_date,
            sp.end_date,
            (SELECT MAX(u.updated_at) FROM updates u WHERE u.people_id = p.id) AS ultima_actualizacion,
            (SELECT username FROM credentials c WHERE c.id = p.credential_id) AS username
        FROM people p
        LEFT JOIN student_profiles sp ON sp.people_id = p.id
        WHERE p.id = $1`,
        [peopleId]
    );
    return resultado.rows[0];
}

// Crea una persona y su perfil de estudiante en una sola transacción.
// Si algo falla (ej. FK inválida en institution_id), no queda una
// persona huérfana sin perfil.
export async function crear({
    first_name, last_name, gender_id, birth_date, email, phone,
    document_type_id, document_number, address, neighborhood_id,
    institution_id, status_id, grade_id, start_date,
    // Credencial de acceso opcional. Si vienen ambos, se crea una credencial
    // con rol 'estudiante' y se enlaza a la persona (people.credential_id).
    username, password_hash
}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let credentialId = null;
        if (username && password_hash) {
            const rolRes = await client.query(
                `SELECT id FROM user_roles WHERE lower(name) = 'estudiante' LIMIT 1`
            );
            const roleId = rolRes.rows[0]?.id;
            const credRes = await client.query(
                `INSERT INTO credentials (username, password, role_id) VALUES ($1, $2, $3) RETURNING id`,
                [username, password_hash, roleId]
            );
            credentialId = credRes.rows[0].id;
        }

        const personaResult = await client.query(
            `INSERT INTO people
                (first_name, last_name, gender_id, birth_date, email, phone,
                 document_type_id, document_number, address, neighborhood_id, credential_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [first_name, last_name, gender_id, birth_date, email, phone,
             document_type_id, document_number, address, neighborhood_id, credentialId]
        );
        const persona = personaResult.rows[0];

        const perfilResult = await client.query(
            `INSERT INTO student_profiles
                (people_id, institution_id, status_id, grade_id, start_date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [persona.id, institution_id, status_id, grade_id, start_date]
        );
        const perfil = perfilResult.rows[0];

        await client.query('COMMIT');
        return { ...persona, student_profile: perfil };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Devuelve la credencial (id + username) asociada al estudiante, o
// { credential_id: null } si aún no tiene acceso creado.
export async function obtenerCredencial(peopleId) {
    const resultado = await pool.query(
        `SELECT c.id AS credential_id, c.username
         FROM people p
         LEFT JOIN credentials c ON c.id = p.credential_id
         WHERE p.id = $1`,
        [peopleId]
    );
    return resultado.rows[0] || { credential_id: null };
}

// Crea una credencial de estudiante y la enlaza a la persona (para un
// estudiante que se creó sin acceso y al que ahora se le asignan credenciales).
export async function crearCredencial(peopleId, username, password_hash) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const rolRes = await client.query(
            `SELECT id FROM user_roles WHERE lower(name) = 'estudiante' LIMIT 1`
        );
        const roleId = rolRes.rows[0]?.id;
        const credRes = await client.query(
            `INSERT INTO credentials (username, password, role_id) VALUES ($1, $2, $3) RETURNING id, username`,
            [username, password_hash, roleId]
        );
        await client.query(`UPDATE people SET credential_id = $1 WHERE id = $2`, [credRes.rows[0].id, peopleId]);
        await client.query('COMMIT');
        return credRes.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Actualiza username y/o contraseña (ya hasheada) de una credencial existente.
// Usa COALESCE para permitir cambios parciales (solo usuario o solo contraseña).
export async function actualizarCredencial(credentialId, { username, password_hash }) {
    const resultado = await pool.query(
        `UPDATE credentials
         SET username = COALESCE($1, username),
             password = COALESCE($2, password)
         WHERE id = $3
         RETURNING id, username`,
        [username ?? null, password_hash ?? null, credentialId]
    );
    return resultado.rows[0];
}

// Actualiza los datos personales (tabla people). Usado tanto por el
// admin como por el propio estudiante/egresado durante una campaña activa.
export async function actualizarDatosPersonales(peopleId, {
    first_name, last_name, gender_id, birth_date, email, phone,
    document_type_id, document_number, address, neighborhood_id
}) {
    const resultado = await pool.query(
        `UPDATE people
         SET first_name = $1, last_name = $2, gender_id = $3, birth_date = $4,
             email = $5, phone = $6, document_type_id = $7, document_number = $8,
             address = $9, neighborhood_id = $10
         WHERE id = $11
         RETURNING *`,
        [first_name, last_name, gender_id, birth_date, email, phone,
         document_type_id, document_number, address, neighborhood_id, peopleId]
    );
    return resultado.rows[0];
}

// Actualiza el estado académico (tabla student_profiles): institución,
// grado, status, fechas. Esto es lo que se usa para graduar a alguien
// (status_id -> egresado, end_date -> fecha de grado) o transferirlo
// de institución (institution_id nuevo).
export async function actualizarPerfilAcademico(peopleId, {
    institution_id, status_id, grade_id, start_date, end_date
}) {
    const resultado = await pool.query(
        `UPDATE student_profiles
         SET institution_id = $1, status_id = $2, grade_id = $3,
             start_date = $4, end_date = $5
         WHERE people_id = $6
         RETURNING *`,
        [institution_id, status_id, grade_id, start_date, end_date, peopleId]
    );
    return resultado.rows[0];
}

export async function eliminar(peopleId) {
    // ON DELETE CASCADE en student_profiles.people_id borra el perfil solo.
    // Además borramos la credencial de acceso asociada (si la tiene) para no
    // dejar un usuario huérfano ocupando ese username. Se hace en una
    // transacción: primero la persona (libera la FK people.credential_id) y
    // luego la credencial.
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query('DELETE FROM people WHERE id = $1 RETURNING *', [peopleId]);
        const persona = res.rows[0];
        if (persona?.credential_id) {
            await client.query('DELETE FROM credentials WHERE id = $1', [persona.credential_id]);
        }
        await client.query('COMMIT');
        return persona;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function obtenerPorUsername(username) {
    const resultado = await pool.query(
        `SELECT p.id AS people_id
         FROM people p
         JOIN credentials c ON c.id = p.credential_id
         WHERE c.username = $1`,
        [username]
    );
    return resultado.rows[0]?.people_id ?? null;
}

export async function existeEmail(email) {
    const resultado = await pool.query('SELECT id FROM people WHERE email = $1', [email]);
    return resultado.rows.length > 0;
}

export async function existeDocumento(document_number) {
    const resultado = await pool.query('SELECT id FROM people WHERE document_number = $1', [document_number]);
    return resultado.rows.length > 0;
}
