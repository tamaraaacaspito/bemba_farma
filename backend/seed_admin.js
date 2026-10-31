/**
 * seed_admin.js — Regenera el hash bcrypt del administrador en DrogueriaEKA_DB
 * 
 * Ejecutar DESPUÉS de correr init.sql en SSMS:
 *   node seed_admin.js
 * 
 * Requiere: bcryptjs, tedious (ya incluidos en package.json del backend)
 */
'use strict';

require('dotenv').config({ path: '.env' });
const bcrypt    = require('bcryptjs');
const { Connection, Request, TYPES } = require('tedious');

// La contraseña de la BD y la del admin se leen del entorno (.env), nunca del código.
if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD no está definida. Configúrala en el .env antes de sembrar el admin.');
}
if (!process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD no está definida. Configúrala en el .env antes de sembrar el admin.');
}

// ── Configuración de conexión local ──────────────────────────────────────────
const config = {
    server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
    authentication: {
        type    : 'default',
        options : {
            userName : process.env.DB_USER     || 'sa',
            password : process.env.DB_PASSWORD
        }
    },
    options: {
        database              : process.env.DB_NAME || 'DrogueriaEKA_DB',
        encrypt               : true,   // true en Azure SQL
        trustServerCertificate: true,
        port                  : 1433
    }
};

// ── Hash de la contraseña del administrador ───────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'admin@drogueria-eka.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SALT_ROUNDS    = 10;

async function actualizarHashAdmin() {
    console.log('🔐 Generando hash bcrypt para el usuario administrador...');

    const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    console.log(`✅ Hash generado: ${hash}`);

    return new Promise((resolve, reject) => {
        const connection = new Connection(config);

        connection.on('connect', (err) => {
            if (err) {
                console.error('❌ Error al conectar con SQL Server:', err.message);
                return reject(err);
            }

            console.log('🔗 Conectado a DrogueriaEKA_DB...');

            const sql = `
                UPDATE usuarios
                SET    password_hash = @hash
                WHERE  email = @email
            `;

            const request = new Request(sql, (err, rowCount) => {
                if (err) {
                    console.error('❌ Error al actualizar el hash:', err.message);
                    connection.close();
                    return reject(err);
                }
                if (rowCount === 0) {
                    console.warn(`⚠️  No se encontró el usuario ${ADMIN_EMAIL}.`);
                    console.warn('    Asegúrate de haber ejecutado init.sql primero.');
                } else {
                    console.log(`✅ Hash actualizado para ${ADMIN_EMAIL} (${rowCount} fila).`);
                    console.log('');
                    console.log('👤 Credenciales del administrador:');
                    console.log(`   Email    : ${ADMIN_EMAIL}`);
                    console.log(`   Password : ${ADMIN_PASSWORD}`);
                    console.log(`   Hash     : ${hash}`);
                }
                connection.close();
                resolve();
            });

            request.addParameter('hash',  TYPES.NVarChar, hash);
            request.addParameter('email', TYPES.NVarChar, ADMIN_EMAIL);
            connection.execSql(request);
        });

        connection.connect();
    });
}

// ── Ejecutar ──────────────────────────────────────────────────────────────────
actualizarHashAdmin()
    .then(() => {
        console.log('');
        console.log('🎉 Seeding de administrador completado.');
        console.log('   Ahora puedes hacer POST /api/auth/login con esas credenciales.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Fallo en seed_admin:', err);
        process.exit(1);
    });
