import * as CampaignModel from '../models/campaignModel.js';
import * as StudentModel from '../models/studentModel.js';

const SCOPE_TYPES = ['LOCALITY', 'NEIGHBORHOOD', 'INSTITUTION', 'GLOBAL'];

// Valida que cada fila de scope tenga exactamente el campo que corresponde
// a su scope_type (mismo CHECK constraint que ya existe en la BD, pero
// validado antes para devolver un 400 claro en vez de un error 500 genérico
// de Postgres).
function validarScope(scope) {
    if (!Array.isArray(scope) || scope.length === 0) {
        return 'scope es requerido y debe tener al menos una fila (GLOBAL, LOCALITY, NEIGHBORHOOD o INSTITUTION)';
    }
    for (const s of scope) {
        if (!SCOPE_TYPES.includes(s.scope_type)) {
            return `scope_type inválido: ${s.scope_type}. Debe ser uno de ${SCOPE_TYPES.join(', ')}`;
        }
        // GLOBAL no requiere ningún id: la campaña aplica a toda la población.
        if (s.scope_type === 'LOCALITY' && (!s.localities_id || s.neighborhood_id || s.institution_id)) {
            return 'Para scope_type=LOCALITY solo debe venir localities_id';
        }
        if (s.scope_type === 'NEIGHBORHOOD' && (!s.neighborhood_id || s.localities_id || s.institution_id)) {
            return 'Para scope_type=NEIGHBORHOOD solo debe venir neighborhood_id';
        }
        if (s.scope_type === 'INSTITUTION' && (!s.institution_id || s.localities_id || s.neighborhood_id)) {
            return 'Para scope_type=INSTITUTION solo debe venir institution_id';
        }
    }
    return null;
}

function validarCriteria(criteria) {
    if (criteria === undefined) return null; // opcional: sin criteria = aplica a todos en el scope
    if (!Array.isArray(criteria)) return 'criteria debe ser un arreglo';
    for (const c of criteria) {
        // Las edades pueden llegar como string desde un cliente JSON. Hay que
        // compararlas como números: "9" > "10" es true en JS (comparación
        // lexicográfica), lo que rechazaría un rango 9-10 que sí es válido.
        const min = c.min_age != null && c.min_age !== '' ? Number(c.min_age) : null;
        const max = c.max_age != null && c.max_age !== '' ? Number(c.max_age) : null;

        if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) {
            return 'min_age y max_age deben ser números';
        }
        if (min !== null && max !== null && min > max) {
            return 'min_age no puede ser mayor que max_age en una fila de criteria';
        }
    }
    return null;
}

export async function listar(req, res) {
    try {
        // Anota cada campaña con si el usuario actual puede editarla: el
        // superadmin puede con todas; el admin solo con las que él creó.
        const anotar = (campanias) => campanias.map((c) => ({
            ...c,
            puede_editar: req.user.rol === 'superadmin'
                || c.created_by_credentials_id === req.user.credential_id
        }));

        if (req.user.rol === 'administrador') {
            if (!req.user.institution_id) {
                return res.status(403).json({ error: 'El administrador no tiene una institución asignada' });
            }
            const campanias = await CampaignModel.obtenerPorInstitucion(req.user.institution_id);
            return res.json(anotar(campanias));
        }
        const campanias = await CampaignModel.obtenerTodas();
        res.json(anotar(campanias));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener campañas' });
    }
}

export async function obtenerUna(req, res) {
    try {
        const campania = await CampaignModel.obtenerPorId(req.params.id);
        if (!campania) {
            return res.status(404).json({ error: 'Campaña no encontrada' });
        }
        res.json(campania);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la campaña' });
    }
}

export async function crear(req, res) {
    const { title, start_date, scope, criteria } = req.body;

    if (!title || !start_date) {
        return res.status(400).json({ error: 'title y start_date son requeridos' });
    }

    const errorScope = validarScope(scope);
    if (errorScope) return res.status(400).json({ error: errorScope });

    const errorCriteria = validarCriteria(criteria);
    if (errorCriteria) return res.status(400).json({ error: errorCriteria });

    // Un admin institucional solo puede crear campañas cuyo scope apunte a
    // su propia institución (no puede lanzar una campaña sobre otro colegio).
    if (req.user.rol === 'administrador') {
        if (!req.user.institution_id) {
            return res.status(403).json({ error: 'El administrador no tiene una institución asignada' });
        }
        // Un admin solo puede crear scope INSTITUTION de SU institución.
        // Esto excluye GLOBAL, LOCALITY y NEIGHBORHOOD, que quedan reservados
        // al superadmin.
        const scopeFueraDeInstitucion = scope.some(
            (s) => s.scope_type !== 'INSTITUTION' || Number(s.institution_id) !== Number(req.user.institution_id)
        );
        if (scopeFueraDeInstitucion) {
            return res.status(403).json({ error: 'Como administrador institucional, solo puedes crear campañas para tu propia institución (no globales ni de otro alcance)' });
        }
    }

    try {
        // credential_id viene en el JWT (ver payload en authController.login),
        // así que no hace falta consultarlo en cada creación.
        const nueva = await CampaignModel.crear({
            ...req.body,
            created_by_credentials_id: req.user.credential_id
        });
        res.status(201).json(nueva);
    } catch (error) {
        console.error(error);
        if (error.code === '23503') {
            return res.status(404).json({ error: 'Alguna referencia (institución, barrio, localidad, género, grado, estado) no existe' });
        }
        if (error.code === '23514') { // violación de CHECK constraint
            return res.status(400).json({ error: 'Datos de scope/criteria inválidos: ' + error.detail });
        }
        res.status(500).json({ error: 'Error al crear la campaña' });
    }
}

export async function actualizar(req, res) {
    const { title, start_date } = req.body;
    if (!title || !start_date) {
        return res.status(400).json({ error: 'title y start_date son requeridos' });
    }
    try {
        const actualizada = await CampaignModel.actualizarDatosBasicos(req.params.id, req.body);
        if (!actualizada) {
            return res.status(404).json({ error: 'Campaña no encontrada' });
        }
        res.json(actualizada);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar la campaña' });
    }
}

export async function eliminar(req, res) {
    try {
        const eliminada = await CampaignModel.eliminar(req.params.id);
        if (!eliminada) {
            return res.status(404).json({ error: 'Campaña no encontrada' });
        }
        res.json({ message: 'Campaña eliminada', campania: eliminada });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar la campaña' });
    }
}

// GET /api/campaigns/mine - campañas activas y elegibles para el estudiante logueado
export async function misCampanias(req, res) {
    try {
        const peopleId = await StudentModel.obtenerPorUsername(req.user.username);
        if (!peopleId) {
            return res.status(404).json({ error: 'No se encontró un perfil de estudiante asociado a este usuario' });
        }
        const campanias = await CampaignModel.obtenerCampaniasElegibles(peopleId);
        res.json(campanias);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener tus campañas' });
    }
}

// PUT /api/campaigns/:id/update-my-data - el formulario real de actualización.
// Valida: campaña activa + estudiante elegible, antes de aplicar el cambio.
export async function actualizarMisDatosEnCampania(req, res) {
    const CAMPOS_PERSONA_REQUERIDOS = [
        'first_name', 'last_name', 'gender_id', 'birth_date', 'email',
        'document_type_id', 'document_number', 'neighborhood_id'
    ];
    const faltantes = CAMPOS_PERSONA_REQUERIDOS.filter(
        (campo) => req.body[campo] === undefined || req.body[campo] === null || req.body[campo] === ''
    );
    if (faltantes.length > 0) {
        return res.status(400).json({ error: `Campos requeridos faltantes: ${faltantes.join(', ')}` });
    }

    try {
        const campaignId = req.params.id;

        const activa = await CampaignModel.estaActiva(campaignId);
        if (!activa) {
            return res.status(403).json({ error: 'Esta campaña no está activa actualmente' });
        }

        const peopleId = await StudentModel.obtenerPorUsername(req.user.username);
        if (!peopleId) {
            return res.status(404).json({ error: 'No se encontró un perfil de estudiante asociado a este usuario' });
        }

        const elegible = await CampaignModel.esElegible(peopleId, campaignId);
        if (!elegible) {
            return res.status(403).json({ error: 'No eres elegible para actualizar tus datos en esta campaña' });
        }

        const actualizado = await StudentModel.actualizarDatosPersonales(peopleId, req.body);
        const registro = await CampaignModel.registrarActualizacion(peopleId, campaignId);

        res.json({ persona: actualizado, update: registro });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Ya existe una persona con ese email o número de documento' });
        }
        if (error.code === '23503') {
            return res.status(404).json({ error: 'Alguna referencia (género, tipo de documento, barrio) no existe' });
        }
        res.status(500).json({ error: 'Error al actualizar tus datos en esta campaña' });
    }
}

// GET /api/campaigns/:id/updates - estudiantes que actualizaron en la campaña.
// El admin ve solo los de su institución; el superadmin, todos.
export async function estudiantesActualizados(req, res) {
    try {
        const campaignId = req.params.id;
        let institution_id;
        if (req.user.rol === 'administrador') {
            if (!req.user.institution_id) {
                return res.status(403).json({ error: 'El administrador no tiene una institución asignada' });
            }
            institution_id = req.user.institution_id;
        }
        const estudiantes = await CampaignModel.obtenerEstudiantesActualizados(campaignId, { institution_id });
        res.json(estudiantes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los estudiantes actualizados' });
    }
}

// GET /api/campaigns/:id/metrics
export async function metricas(req, res) {
    try {
        const campaignId = req.params.id;

        if (req.user.rol === 'administrador') {
            if (!req.user.institution_id) {
                return res.status(403).json({ error: 'El administrador no tiene una institución asignada' });
            }
            const m = await CampaignModel.metricasPorInstitucion(campaignId, req.user.institution_id);
            return res.json(m);
        }

        const m = await CampaignModel.metricasGlobales(campaignId);
        res.json(m);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener métricas de la campaña' });
    }
}
