/**
 * @openapi
 * tags:
 *   - name: Students
 *     description: Estudiantes y egresados, su perfil académico y sus credenciales de acceso.
 */

/**
 * @openapi
 * /api/students:
 *   get:
 *     summary: Lista estudiantes/egresados
 *     description: El administrador ve solo su institución; el superadmin puede filtrar por `institution_id`. Cada registro incluye `ultima_actualizacion`.
 *     tags: [Students]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: institution_id
 *         schema: { type: integer }
 *       - in: query
 *         name: status_id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista de estudiantes }
 *       401: { description: No autorizado }
 *   post:
 *     summary: Crea un estudiante (opcionalmente con credenciales de acceso)
 *     description: Si se envían `username` y `password`, se crea la credencial de acceso (rol estudiante) enlazada.
 *     tags: [Students]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, gender_id, birth_date, email, document_type_id, document_number, neighborhood_id, institution_id, status_id, start_date]
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               gender_id: { type: integer }
 *               birth_date: { type: string, format: date }
 *               email: { type: string }
 *               phone: { type: string }
 *               document_type_id: { type: integer }
 *               document_number: { type: string }
 *               address: { type: string }
 *               neighborhood_id: { type: integer }
 *               institution_id: { type: integer }
 *               status_id: { type: integer }
 *               grade_id: { type: integer }
 *               start_date: { type: string, format: date }
 *               username: { type: string, description: Opcional. Usuario de acceso. }
 *               password: { type: string, description: Opcional. Se guarda hasheada con bcrypt. }
 *     responses:
 *       201: { description: Estudiante creado }
 *       400: { description: Campos requeridos faltantes }
 *       409: { description: Email, documento o usuario duplicado }
 */

/**
 * @openapi
 * /api/students/me:
 *   get:
 *     summary: (Estudiante) Consulta sus propios datos
 *     tags: [Students]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Datos del estudiante autenticado }
 *       404: { description: No se encontró perfil de estudiante }
 */

/**
 * @openapi
 * /api/students/{id}:
 *   get:
 *     summary: Obtiene un estudiante por su ID
 *     tags: [Students]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Estudiante encontrado (incluye username si tiene acceso) }
 *       404: { description: No encontrado }
 *   delete:
 *     summary: Elimina un estudiante (y su credencial de acceso si tiene)
 *     tags: [Students]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Estudiante eliminado }
 *       404: { description: No encontrado }
 */

/**
 * @openapi
 * /api/students/{id}/personal:
 *   put:
 *     summary: Actualiza los datos personales del estudiante
 *     tags: [Students]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               gender_id: { type: integer }
 *               birth_date: { type: string, format: date }
 *               email: { type: string }
 *               phone: { type: string }
 *               document_type_id: { type: integer }
 *               document_number: { type: string }
 *               address: { type: string }
 *               neighborhood_id: { type: integer }
 *     responses:
 *       200: { description: Datos personales actualizados }
 *       404: { description: No encontrado }
 */

/**
 * @openapi
 * /api/students/{id}/academico:
 *   put:
 *     summary: Actualiza el perfil académico (grado, estado, fechas)
 *     tags: [Students]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               institution_id: { type: integer }
 *               status_id: { type: integer }
 *               grade_id: { type: integer }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *     responses:
 *       200: { description: Perfil académico actualizado }
 *       404: { description: No encontrado }
 */

/**
 * @openapi
 * /api/students/{id}/credentials:
 *   get:
 *     summary: Consulta el usuario de acceso del estudiante (nunca la contraseña)
 *     tags: [Students]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "{ credential_id, username } — credential_id null si no tiene acceso" }
 *   put:
 *     summary: Crea o actualiza las credenciales del estudiante
 *     description: Si no tiene acceso, requiere `username` y `password`. Si ya tiene, permite cambiar el usuario y/o restablecer la contraseña. La contraseña se guarda hasheada y nunca se devuelve.
 *     tags: [Students]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Credenciales actualizadas }
 *       400: { description: Faltan usuario/contraseña para crear el acceso }
 *       409: { description: El nombre de usuario ya está en uso }
 */
