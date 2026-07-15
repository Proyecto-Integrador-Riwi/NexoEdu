import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import cookieParser from 'cookie-parser'
import authToken from './middleware/authMiddleware.js'
import protectedRoute from './routes/protectedRoutes.js';
import requireRole from './controllers/requireRole.js';

// Crea una instancia de la aplicación Express
const app = express();
// Configura CORS y el middleware para parsear JSON en las solicitudes entrantes
app.use(cors());
app.use(express.json());
app.use(cookieParser())

// Define la ruta base para las rutas de autenticación, que se manejarán en authRoutes
app.use('/api/auth', authRoutes);
app.get('/api/logout', (req, res) => {
    res
        .clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000
        })
        .json({ message: 'Sesión cerrada correctamente.' })
})

app.get('/dashboard-general', authToken, requireRole('SUPERADMIN'), protectedRoute('dashboard-general'))
app.get('/gestion-eventos', authToken, requireRole('SUPERADMIN'), protectedRoute('gestion-eventos'))
app.get('/gestion-escuelas', authToken, requireRole('SUPERADMIN'), protectedRoute('gestion-escuelas'))

app.get('/dashboard-escuela', authToken, requireRole('ADMIN'), protectedRoute('dashboard-escuela'))
app.get('/gestion-estudiantes', authToken, requireRole('ADMIN'), protectedRoute('gestion-estudiantes'))
app.get('/eventos-propios', authToken, requireRole('ADMIN'), protectedRoute('eventos-propios'))

app.get('/ver-eventos', authToken, requireRole('ESTUDIANTE'), protectedRoute('ver-eventos'))

// Inicia el servidor en el puerto especificado en las variables de entorno y muestra un mensaje en la consola
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));