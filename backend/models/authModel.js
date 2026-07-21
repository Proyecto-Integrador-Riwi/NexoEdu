// Modelo de autenticación: busca credenciales por username (vía la vista
// vw_credential_info) y la institución asociada a un admin.
import pool from '../db.js';

// Función para buscar un usuario por su username en la base de datos
export async function buscarPorUsername(username) {
    // Realiza la consulta a la base de datos para obtener la información del usuario
    const resultado = await pool.query(
        'SELECT * FROM vw_credential_info WHERE username = $1',
        [username]
    );
    // Devuelve el primer resultado de la consulta, que corresponde al usuario encontrado
    return resultado.rows[0];
}

// Busca la institución asociada a una credencial (solo aplica a admins
// institucionales, cuyo institutions.credential_id apunta a su credential).
// Se usa para incluir institution_id en el payload del JWT, y así poder
// restringir sus operaciones a los estudiantes de su propia institución.
export async function buscarInstitucionPorUsername(username) {
    const resultado = await pool.query(
        `SELECT i.id AS institution_id
         FROM institutions i
         JOIN credentials c ON c.id = i.credential_id
         WHERE c.username = $1`,
        [username]
    );
    return resultado.rows[0]?.institution_id ?? null;
}