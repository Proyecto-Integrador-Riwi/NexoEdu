// Modelo de catálogos de solo lectura: géneros, grados, estados, tipos de
// documento, localidades y barrios (usados para poblar formularios).
import pool from '../db.js';

// Todos los catálogos del sistema son de solo lectura en el MVP: el equipo
// los administra directamente en la base de datos. Este modelo centraliza
// las consultas para evitar repetir el mismo patrón SELECT * FROM x en
// seis archivos casi idénticos.

export async function obtenerGeneros() {
    const resultado = await pool.query('SELECT id, name FROM genders ORDER BY name');
    return resultado.rows;
}

export async function obtenerGrados() {
    const resultado = await pool.query('SELECT id, grade FROM grades ORDER BY id');
    return resultado.rows;
}

export async function obtenerEstados() {
    const resultado = await pool.query('SELECT id, status FROM statuses ORDER BY id');
    return resultado.rows;
}

export async function obtenerTiposDocumento() {
    const resultado = await pool.query('SELECT id, abbreviation, name FROM document_types ORDER BY name');
    return resultado.rows;
}

export async function obtenerLocalidades() {
    const resultado = await pool.query('SELECT id, name FROM localities ORDER BY name');
    return resultado.rows;
}

// Los barrios se consultan casi siempre en el contexto de una localidad
// (para poblar un segundo <select> dependiente en el frontend), por eso
// se soporta el filtro opcional localityId.
export async function obtenerBarrios(localityId) {
    if (localityId) {
        const resultado = await pool.query(
            'SELECT id, name, locality_id FROM neighborhoods WHERE locality_id = $1 ORDER BY name',
            [localityId]
        );
        return resultado.rows;
    }
    const resultado = await pool.query('SELECT id, name, locality_id FROM neighborhoods ORDER BY name');
    return resultado.rows;
}
