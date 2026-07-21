// Modelo de instituciones: CRUD sobre la tabla `institutions`
// (incluye logo_url y banner_url para el perfil de la institución).
import pool from '../db.js';

export async function obtenerTodas() {
    const resultado = await pool.query('SELECT * FROM institutions ORDER BY institution_name');
    return resultado.rows;
}

export async function obtenerPorId(id) {
    const resultado = await pool.query('SELECT * FROM institutions WHERE id = $1', [id]);
    return resultado.rows[0];
}

export async function crear({ institution_name, director, address, neighborhood_id, dane_code, logo_url, banner_url }) {
    const resultado = await pool.query(
        `INSERT INTO institutions (institution_name, director, address, neighborhood_id, dane_code, logo_url, banner_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [institution_name, director, address, neighborhood_id, dane_code, logo_url ?? null, banner_url ?? null]
    );
    return resultado.rows[0];
}

export async function actualizar(id, { institution_name, director, address, neighborhood_id, dane_code, logo_url, banner_url }) {
    const resultado = await pool.query(
        `UPDATE institutions
        SET institution_name = $1, director = $2, address = $3, neighborhood_id = $4, dane_code = $5,
            logo_url = $6, banner_url = $7
        WHERE id = $8 RETURNING *`,
        [institution_name, director, address, neighborhood_id, dane_code, logo_url ?? null, banner_url ?? null, id]
    );
    return resultado.rows[0];
}

export async function eliminar(id) {
    const resultado = await pool.query('DELETE FROM institutions WHERE id = $1 RETURNING *', [id]);
    return resultado.rows[0];
}