import express from 'express';
import { listar, crearAdmin, asignarInstitucion, eliminarAdmin } from '../controllers/adminController.js';
import authToken from '../middleware/authMiddleware.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

router.get('/', authToken, requireRole('superadmin'), listar);
router.post('/', authToken, requireRole('superadmin'), crearAdmin);
router.put('/:id/assign', authToken, requireRole('superadmin'), asignarInstitucion);
router.delete('/:id', authToken, requireRole('superadmin'), eliminarAdmin);

export default router;