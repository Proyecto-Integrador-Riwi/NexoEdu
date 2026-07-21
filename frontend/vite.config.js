import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        tailwindcss(),
    ],
    server: {
        // Puerto fijo: el CORS del backend permite exactamente este origin
        // (http://localhost:5173). strictPort evita que Vite cambie a otro
        // puerto en silencio si el 5173 está ocupado, lo que rompería CORS
        // de forma confusa; en su lugar falla con un mensaje claro.
        port: 5173,
        strictPort: true,
    },
})