/**
 * @openapi
 * tags:
 *   - name: Campaigns
 *     description: Campañas de actualización de datos (superadmin y administrador) y flujo del estudiante.
 */

/**
 * @openapi
 * /api/campaigns:
 *   get:
 *     summary: Lista las campañas visibles para el usuario
 *     description: El superadmin ve todas; el administrador ve las de su institución (incluidas las globales). Cada campaña incluye `creador_rol`, `creador_institucion` y `puede_editar`.
 *     tags: [Campaigns]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Lista de campañas }
 *       401: { description: No autorizado }
 *       500: { description: Error interno del servidor }
 *   post:
 *     summary: Crea una campaña con su alcance (scope) y criterios (criteria)
 *     tags: [Campaigns]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, start_date, scope]
 *             properties:
 *               title: { type: string, example: Actualización de datos 2026 }
 *               type: { type: string, example: Actualización de datos }
 *               sponsor: { type: string, example: Alcaldía de Barranquilla }
 *               description: { type: string }
 *               url_multimedia: { type: string, example: "https://..." }
 *               start_date: { type: string, format: date, example: 2026-07-20 }
 *               end_date: { type: string, format: date, example: 2026-08-20 }
 *               scope:
 *                 type: array
 *                 description: "Filas de alcance. scope_type: GLOBAL | LOCALITY | NEIGHBORHOOD | INSTITUTION"
 *                 items:
 *                   type: object
 *                   properties:
 *                     scope_type: { type: string, example: GLOBAL }
 *                     institution_id: { type: integer }
 *                     neighborhood_id: { type: integer }
 *                     localities_id: { type: integer }
 *               criteria:
 *                 type: array
 *                 description: Criterios de elegibilidad (opcional). Varias filas se combinan con OR.
 *                 items:
 *                   type: object
 *                   properties:
 *                     gender_id: { type: integer }
 *                     grade_id: { type: integer }
 *                     status_id: { type: integer }
 *                     min_age: { type: integer }
 *                     max_age: { type: integer }
 *     responses:
 *       201: { description: Campaña creada }
 *       400: { description: Datos de scope/criteria inválidos }
 *       403: { description: Un admin solo puede crear campañas de su institución }
 *       500: { description: Error interno del servidor }
 */

/**
 * @openapi
 * /api/campaigns/{id}:
 *   get:
 *     summary: Obtiene una campaña por su ID (con scope y criteria)
 *     tags: [Campaigns]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Campaña encontrada }
 *       404: { description: Campaña no encontrada }
 *   put:
 *     summary: Actualiza los datos básicos de una campaña
 *     description: Solo el creador (o superadmin) puede editarla. No modifica scope/criteria.
 *     tags: [Campaigns]
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
 *             required: [title, start_date]
 *             properties:
 *               title: { type: string }
 *               type: { type: string }
 *               sponsor: { type: string }
 *               description: { type: string }
 *               url_multimedia: { type: string }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *     responses:
 *       200: { description: Campaña actualizada }
 *       403: { description: No eres el propietario de la campaña }
 *       404: { description: Campaña no encontrada }
 *   delete:
 *     summary: Elimina una campaña (y sus datos asociados en cascada)
 *     tags: [Campaigns]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Campaña eliminada }
 *       403: { description: No eres el propietario de la campaña }
 *       404: { description: Campaña no encontrada }
 */

/**
 * @openapi
 * /api/campaigns/{id}/metrics:
 *   get:
 *     summary: Métricas de actualización de una campaña
 *     description: El administrador ve las de su institución (forma plana); el superadmin ve el desglose global (con `totales` y `por_institucion`).
 *     tags: [Campaigns]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "Métricas: total_elegibles, total_actualizados, total_pendientes" }
 *       403: { description: Campaña no visible para tu institución }
 *       500: { description: Error interno del servidor }
 */

/**
 * @openapi
 * /api/campaigns/{id}/updates:
 *   get:
 *     summary: Estudiantes que ya actualizaron sus datos en la campaña
 *     description: El administrador ve solo los de su institución; el superadmin, todos. Devuelve nombre, grado, estado y fecha de actualización.
 *     tags: [Campaigns]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista de estudiantes actualizados }
 *       403: { description: Campaña no visible para tu institución }
 *       500: { description: Error interno del servidor }
 */

/**
 * @openapi
 * /api/campaigns/mine:
 *   get:
 *     summary: (Estudiante) Campañas activas para las que es elegible
 *     description: Incluye el flag `actualizada` y `creador_rol`/`creador_institucion`.
 *     tags: [Campaigns]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Campañas elegibles }
 *       401: { description: No autorizado }
 */

/**
 * @openapi
 * /api/campaigns/{id}/update-my-data:
 *   put:
 *     summary: (Estudiante) Actualiza sus datos dentro de una campaña activa
 *     description: Valida que la campaña esté activa y que el estudiante sea elegible antes de aplicar el cambio.
 *     tags: [Campaigns]
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
 *             required: [first_name, last_name, gender_id, birth_date, email, document_type_id, document_number, neighborhood_id]
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               gender_id: { type: integer }
 *               birth_date: { type: string, format: date }
 *               email: { type: string }
 *               document_type_id: { type: integer }
 *               document_number: { type: string }
 *               neighborhood_id: { type: integer }
 *     responses:
 *       200: { description: Datos actualizados y registrados }
 *       403: { description: Campaña inactiva o estudiante no elegible }
 *       409: { description: Email o documento duplicado }
 */
