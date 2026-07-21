import express from 'express';
import * as InstitutionController from '../controllers/institutionController.js';
import authToken from '../middleware/authMiddleware.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// La lista completa solo la necesitan superadmin y administrador (para
// selectores de gestión). Un estudiante no tiene motivo de negocio para
// enumerar todas las instituciones.
router.get('/', authToken, requireRole('superadmin', 'administrador'), InstitutionController.listar);
// La consulta individual queda abierta a cualquier usuario autenticado:
// el estudiante la usa para ver el nombre de SU propia institución en su perfil.
router.get('/:id', authToken, InstitutionController.obtenerUna);
router.post('/', authToken, requireRole('superadmin'), InstitutionController.crear);
router.put('/:id', authToken, requireRole('superadmin'), InstitutionController.actualizar);
router.delete('/:id', authToken, requireRole('superadmin'), InstitutionController.eliminar);

export default router;