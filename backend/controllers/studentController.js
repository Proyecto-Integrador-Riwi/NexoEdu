import * as StudentModel from '../models/studentModel.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

const CAMPOS_PERSONA_REQUERIDOS = [
    'first_name', 'last_name', 'gender_id', 'birth_date', 'email',
    'document_type_id', 'document_number', 'neighborhood_id'
];
const CAMPOS_PERFIL_REQUERIDOS = ['institution_id', 'status_id', 'start_date'];

function validarCamposFaltantes(body, campos) {
    return campos.filter((campo) => body[campo] === undefined || body[campo] === null || body[campo] === '');
}

// GET /api/students/me - el propio estudiante/egresado consulta sus datos
export async function obtenerMisDatos(req, res) {
    try {
        const peopleId = await StudentModel.obtenerPorUsername(req.user.username);
        if (!peopleId) {
            return res.status(404).json({ error: 'No se encontró un perfil de estudiante asociado a este usuario' });
        }
        const estudiante = await StudentModel.obtenerPorId(peopleId);
        res.json(estudiante);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener tus datos' });
    }
}

export async function listar(req, res) {
    try {
        const { status_id } = req.query;
        let { institution_id } = req.query;

        // Un admin institucional está forzado a ver solo SU institución,
        // sin importar qué institution_id envíe por query string.
        if (req.user.rol === 'administrador') {
            if (!req.user.institution_id) {
                return res.status(403).json({ error: 'El administrador no tiene una institución asignada' });
            }
            institution_id = req.user.institution_id;
        }

        const estudiantes = await StudentModel.obtenerTodos({ institution_id, status_id });
        res.json(estudiantes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener estudiantes' });
    }
}

export async function obtenerUno(req, res) {
    try {
        const estudiante = await StudentModel.obtenerPorId(req.params.id);
        if (!estudiante) {
            return res.status(404).json({ error: 'Persona no encontrada' });
        }
        res.json(estudiante);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la persona' });
    }
}

export async function crear(req, res) {
    const faltantesPersona = validarCamposFaltantes(req.body, CAMPOS_PERSONA_REQUERIDOS);
    const faltantesPerfil = validarCamposFaltantes(req.body, CAMPOS_PERFIL_REQUERIDOS);
    const faltantes = [...faltantesPersona, ...faltantesPerfil];

    if (faltantes.length > 0) {
        return res.status(400).json({ error: `Campos requeridos faltantes: ${faltantes.join(', ')}` });
    }

    // Credencial de acceso opcional: si el admin escribe usuario Y contraseña,
    // se crea la credencial de estudiante junto con el registro.
    const datos = { ...req.body };
    if (req.body.username && req.body.password) {
        datos.username = req.body.username;
        datos.password_hash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    }
    delete datos.password;

    try {
        const nuevo = await StudentModel.crear(datos);
        res.status(201).json(nuevo);
    } catch (error) {
        console.error(error);
        if (error.code === '23505') { // UNIQUE: email, document_number o username duplicado
            return res.status(409).json({ error: 'Ya existe un registro con ese email, documento o usuario' });
        }
        if (error.code === '23503') { // FK inválida: institution_id, gender_id, etc. no existen
            return res.status(404).json({ error: 'Alguna referencia (institución, género, grado, estado, etc.) no existe' });
        }
        res.status(500).json({ error: 'Error al crear el estudiante/egresado' });
    }
}

// GET /api/students/:id/credentials - usuario actual del estudiante (sin contraseña).
export async function obtenerCredenciales(req, res) {
    try {
        const cred = await StudentModel.obtenerCredencial(req.params.id);
        res.json(cred);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las credenciales' });
    }
}

// PUT /api/students/:id/credentials - crear o actualizar el acceso del estudiante.
// Body: { username?, password? }. La contraseña nunca se devuelve (va hasheada).
export async function gestionarCredenciales(req, res) {
    const { username, password } = req.body;
    try {
        const actual = await StudentModel.obtenerCredencial(req.params.id);
        const password_hash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

        let resultado;
        if (!actual.credential_id) {
            // Aún no tiene acceso: se requieren usuario y contraseña para crearlo.
            if (!username || !password) {
                return res.status(400).json({ error: 'Para crear el acceso se requieren usuario y contraseña' });
            }
            resultado = await StudentModel.crearCredencial(req.params.id, username, password_hash);
        } else {
            // Ya tiene acceso: se puede cambiar el usuario y/o restablecer la contraseña.
            if (!username && !password) {
                return res.status(400).json({ error: 'Indica un nuevo usuario o una nueva contraseña' });
            }
            resultado = await StudentModel.actualizarCredencial(actual.credential_id, {
                username: username || null,
                password_hash
            });
        }
        res.json({ credential_id: resultado.id, username: resultado.username });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso' });
        }
        res.status(500).json({ error: 'Error al gestionar las credenciales' });
    }
}

// Actualiza solo los datos personales (usado por el propio estudiante
// durante una campaña de actualización activa).
export async function actualizarDatosPersonales(req, res) {
    const faltantes = validarCamposFaltantes(req.body, CAMPOS_PERSONA_REQUERIDOS);
    if (faltantes.length > 0) {
        return res.status(400).json({ error: `Campos requeridos faltantes: ${faltantes.join(', ')}` });
    }

    try {
        const actualizado = await StudentModel.actualizarDatosPersonales(req.params.id, req.body);
        if (!actualizado) {
            return res.status(404).json({ error: 'Persona no encontrada' });
        }
        res.json(actualizado);
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Ya existe una persona con ese email o número de documento' });
        }
        if (error.code === '23503') {
            return res.status(404).json({ error: 'Alguna referencia (género, tipo de documento, barrio) no existe' });
        }
        res.status(500).json({ error: 'Error al actualizar los datos personales' });
    }
}

// Actualiza el estado académico (usado por el admin institucional: graduar,
// transferir, cambiar de grado o estado).
export async function actualizarPerfilAcademico(req, res) {
    const faltantes = validarCamposFaltantes(req.body, CAMPOS_PERFIL_REQUERIDOS);
    if (faltantes.length > 0) {
        return res.status(400).json({ error: `Campos requeridos faltantes: ${faltantes.join(', ')}` });
    }

    try {
        const actualizado = await StudentModel.actualizarPerfilAcademico(req.params.id, req.body);
        if (!actualizado) {
            return res.status(404).json({ error: 'Perfil de estudiante no encontrado para esa persona' });
        }
        res.json(actualizado);
    } catch (error) {
        console.error(error);
        if (error.code === '23503') {
            return res.status(404).json({ error: 'Alguna referencia (institución, grado, estado) no existe' });
        }
        res.status(500).json({ error: 'Error al actualizar el perfil académico' });
    }
}

export async function eliminar(req, res) {
    try {
        const eliminado = await StudentModel.eliminar(req.params.id);
        if (!eliminado) {
            return res.status(404).json({ error: 'Persona no encontrada' });
        }
        res.json({ message: 'Persona eliminada', persona: eliminado });
    } catch (error) {
        console.error(error);
        if (error.code === '23503') {
            return res.status(409).json({ error: 'No se puede eliminar: la persona tiene registros asociados (actualizaciones, inscripciones, etc.)' });
        }
        res.status(500).json({ error: 'Error al eliminar la persona' });
    }
}
