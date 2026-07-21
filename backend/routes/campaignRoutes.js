import express from 'express';
import * as CampaignController from '../controllers/campaignController.js';
import authToken from '../middleware/authMiddleware.js';
import requireRole from '../middleware/requireRole.js';
import { requireCampaignOwner, requireCampaignVisible } from '../middleware/requireCampaignAccess.js';

const router = express.Router();

// El estudiante/egresado consulta sus campañas elegibles y actualiza sus
// datos dentro de una de ellas. Van antes que '/:id' genérico.
router.get('/mine', authToken, requireRole('estudiante'), CampaignController.misCampanias);
router.put('/:id/update-my-data', authToken, requireRole('estudiante'), CampaignController.actualizarMisDatosEnCampania);

// Métricas: administrador ve las de su institución, superadmin ve el desglose global.
// requireCampaignVisible evita además que un admin consulte una campaña de otra institución.
router.get('/:id/metrics', authToken, requireRole('superadmin', 'administrador'), requireCampaignVisible, CampaignController.metricas);

// Estudiantes que ya actualizaron sus datos en la campaña (para el detalle).
router.get('/:id/updates', authToken, requireRole('superadmin', 'administrador'), requireCampaignVisible, CampaignController.estudiantesActualizados);

// Gestión de campañas. El rol por sí solo no basta: hay que validar también
// la propiedad del recurso (un admin no puede tocar campañas ajenas).
router.get('/', authToken, requireRole('superadmin', 'administrador'), CampaignController.listar);
router.get('/:id', authToken, requireRole('superadmin', 'administrador'), requireCampaignVisible, CampaignController.obtenerUna);
router.post('/', authToken, requireRole('superadmin', 'administrador'), CampaignController.crear);
router.put('/:id', authToken, requireRole('superadmin', 'administrador'), requireCampaignOwner, CampaignController.actualizar);
router.delete('/:id', authToken, requireRole('superadmin', 'administrador'), requireCampaignOwner, CampaignController.eliminar);

export default router;
