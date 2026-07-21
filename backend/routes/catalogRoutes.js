import express from 'express';
import * as CatalogController from '../controllers/catalogController.js';
import authToken from '../middleware/authMiddleware.js';

const router = express.Router();

// Los catálogos son de solo lectura y los necesita cualquier rol
// (para poblar selects en formularios de creación/edición), por eso
// solo se exige estar autenticado, sin restricción de rol.
router.get('/genders', authToken, CatalogController.generos);
router.get('/grades', authToken, CatalogController.grados);
router.get('/statuses', authToken, CatalogController.estados);
router.get('/document-types', authToken, CatalogController.tiposDocumento);
router.get('/localities', authToken, CatalogController.localidades);
router.get('/neighborhoods', authToken, CatalogController.barrios);

export default router;
