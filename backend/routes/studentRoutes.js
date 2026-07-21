import express from 'express';
import * as StudentController from '../controllers/studentController.js';
import authToken from '../middleware/authMiddleware.js';
import requireRole from '../middleware/requireRole.js';
import requireSameInstitution, { requireSameInstitutionOnCreate } from '../middleware/requireSameInstitution.js';

const router = express.Router();

// El propio estudiante/egresado consulta SUS datos personales.
// Va antes que '/:id' para que Express no interprete "me" como un id.
router.get('/me', authToken, requireRole('estudiante'), StudentController.obtenerMisDatos);

// superadmin y administrador pueden listar/consultar estudiantes.
// El administrador solo ve los resultados filtrados por su institución
// (el filtro real se aplica también a nivel de query en el controller
// mediante institution_id, pero aquí garantizamos que no consulte otra
// institución vía el query param).
router.get('/', authToken, requireRole('superadmin', 'administrador'), StudentController.listar);
router.get('/:id', authToken, requireRole('superadmin', 'administrador'), requireSameInstitution, StudentController.obtenerUno);

// Crear estudiante: superadmin (cualquier institución) o administrador
// (forzado a su propia institución por requireSameInstitutionOnCreate).
router.post('/', authToken, requireRole('superadmin', 'administrador'), requireSameInstitutionOnCreate, StudentController.crear);

// Actualizar datos personales o perfil académico: mismo control de acceso.
router.put('/:id/personal', authToken, requireRole('superadmin', 'administrador'), requireSameInstitution, StudentController.actualizarDatosPersonales);
router.put('/:id/academico', authToken, requireRole('superadmin', 'administrador'), requireSameInstitution, StudentController.actualizarPerfilAcademico);

// Gestión de credenciales de acceso del estudiante (ver usuario / cambiar
// usuario / restablecer contraseña). La contraseña nunca se devuelve.
router.get('/:id/credentials', authToken, requireRole('superadmin', 'administrador'), requireSameInstitution, StudentController.obtenerCredenciales);
router.put('/:id/credentials', authToken, requireRole('superadmin', 'administrador'), requireSameInstitution, StudentController.gestionarCredenciales);

router.delete('/:id', authToken, requireRole('superadmin', 'administrador'), requireSameInstitution, StudentController.eliminar);

export default router;
