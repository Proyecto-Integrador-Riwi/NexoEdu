// Modelo de administradores institucionales: consultas a `credentials` e
// `institutions` para crear/listar admins y asignarlos a una institución.
import pool from '../db.js';

// Lista todos los administradores institucionales (credentials cuyo rol es
// 'administrador'), junto con la institución que tienen asignada (si alguna).
// No se usa vw_institutions_complete directamente porque esa vista no
// expone credential_id, que la vista de gestión necesita para poder
// editar/eliminar un admin específico.
export async function obtenerTodos() {
    const resultado = await pool.query(
        `SELECT
            c.id AS credential_id,
            c.username,
            i.id AS institution_id,
            i.institution_name
         FROM credentials c
         JOIN user_roles ur ON ur.id = c.role_id
         LEFT JOIN institutions i ON i.credential_id = c.id
         WHERE ur.name = 'administrador'
         ORDER BY c.username`
    );
    return resultado.rows;
}

export async function existeUsername(username) {
    const resultado = await pool.query(
        'SELECT id FROM credentials WHERE username = $1',
        [username]
    );
    return resultado.rows.length > 0;
}

export async function existeInstitucion(id) {
    const resultado = await pool.query('SELECT id FROM institutions WHERE id = $1', [id]);
    return resultado.rows.length > 0;
}

export async function crearCredencial({ username, password, role_id }) {
    const resultado = await pool.query(
        `INSERT INTO credentials (username, password, role_id)
        VALUES ($1, $2, $3) RETURNING *`,
        [username, password, role_id]
    );
    return resultado.rows[0];
}

export async function asignarAInstitucion(credential_id, institution_id) {
    const resultado = await pool.query(
        `UPDATE institutions SET credential_id = $1 WHERE id = $2 RETURNING id, institution_name, credential_id`,
        [credential_id, institution_id]
    );
    return resultado.rows[0];
}

export async function eliminar(id, role_id) {
    const resultado = await pool.query(
        `DELETE FROM credentials WHERE id = $1 AND role_id = $2 RETURNING *`,
        [id, role_id]
    );
    return resultado.rows[0];
}