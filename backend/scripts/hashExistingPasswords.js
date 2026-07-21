/**
 * Script de migración ÚNICA para hashear contraseñas existentes en texto plano.
 *
 * Contexto: la tabla `credentials` fue creada guardando contraseñas en texto
 * plano (ver commit original de authController.js). Antes de activar
 * bcrypt.compare() en el login, hay que hashear cada contraseña ya guardada.
 *
 * SEGURO DE RE-EJECUTAR: si una fila ya tiene un hash bcrypt (empieza con
 * "$2a$", "$2b$" o "$2y$"), el script la salta. Esto evita hashear dos veces
 * un valor que ya es un hash, lo cual invalidaría el login de ese usuario.
 *
 * Uso:
 *   node scripts/hashExistingPasswords.js
 *
 * Requiere las mismas variables de entorno que el resto del backend
 * (SUPABASE_DB_URL en el .env).
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

const SALT_ROUNDS = 10;
const BCRYPT_HASH_REGEX = /^\$2[aby]\$/; // detecta si un valor ya es un hash bcrypt

async function main() {
    console.log('Buscando credenciales...');
    const { rows: credenciales } = await pool.query('SELECT id, username, password FROM credentials');

    if (credenciales.length === 0) {
        console.log('No hay credenciales en la tabla. Nada que migrar.');
        return;
    }

    let migradas = 0;
    let saltadas = 0;

    for (const credencial of credenciales) {
        if (BCRYPT_HASH_REGEX.test(credencial.password)) {
            console.log(`  [SALTADA] ${credencial.username} ya tiene un hash bcrypt.`);
            saltadas++;
            continue;
        }

        const hash = await bcrypt.hash(credencial.password, SALT_ROUNDS);
        await pool.query('UPDATE credentials SET password = $1 WHERE id = $2', [hash, credencial.id]);
        console.log(`  [MIGRADA] ${credencial.username}`);
        migradas++;
    }

    console.log('\n--- Resumen ---');
    console.log(`Migradas: ${migradas}`);
    console.log(`Saltadas (ya tenían hash): ${saltadas}`);
    console.log(`Total: ${credenciales.length}`);
}

main()
    .then(() => {
        console.log('\nMigración completada.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error durante la migración:', err);
        process.exit(1);
    });
