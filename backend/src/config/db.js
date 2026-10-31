'use strict';
/**
 * src/config/db.js
 * Conexión centralizada a SQL Server mediante Sequelize + driver tedious.
 *
 * En desarrollo (NODE_ENV=development): SQL Server Express local.
 * En producción: Azure SQL Database (mismas variables, distintos valores en .env).
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// ── Lectura de variables de entorno ──────────────────────────────────────────
const {
    DB_SERVER   = 'localhost\\SQLEXPRESS',
    DB_NAME     = 'DrogueriaEKA_DB',
    DB_USER     = 'sa',
    DB_PASSWORD,
    DB_PORT     = '1433',
    NODE_ENV    = 'development'
} = process.env;

// La contraseña de la BD nunca se define en el código: debe venir del entorno (.env).
if (!DB_PASSWORD) {
    throw new Error('DB_PASSWORD no está definida. Configúrala en el archivo .env antes de iniciar.');
}

const esDev = NODE_ENV === 'development';

// ── Instancia de Sequelize ────────────────────────────────────────────────────
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host   : DB_SERVER,
    port   : parseInt(DB_PORT, 10),
    dialect: 'mssql',

    dialectOptions: {
        options: {
            // Azure SQL requiere cifrado obligatorio
            encrypt              : DB_SERVER.includes('database.windows.net') || !esDev,
            // Certificados en Azure son válidos, no autofirmados
            trustServerCertificate: false,
            // Nombre de la base de datos destino
            database             : DB_NAME,
            // Mantiene la conexión TCP viva entre peticiones (crítico para Azure)
            enableArithAbort     : true,
            requestTimeout       : 30000
        }
    },

    // Pool de conexiones: optimizado para Azure SQL (latencia de red ~100-200ms)
    pool: {
        max    : 10,    // máximo de conexiones simultáneas
        min    : 2,     // mantener 2 conexiones siempre vivas → evita reconexión en frío
        acquire: 60000, // ms antes de lanzar error de timeout al adquirir conexión
        idle   : 600000 // 10 min → Azure no cierra conexiones ociosas tan rápido
    },

    // Desactivar logs SQL en producción; activarlos en dev para debugging
    logging: esDev ? (msg) => console.log(`[SQL] ${msg}`) : false,

    // Deshabilitar timestamps automáticos (los campos están definidos manualmente en cada tabla)
    define: {
        timestamps    : false,
        underscored   : false,
        freezeTableName: true    // Sequelize NO pluralizará los nombres de tabla
    }
});

/**
 * Verifica la conexión con la base de datos.
 * Se llama desde server.js al arrancar.
 * @returns {Promise<void>}
 */
async function conectarDB() {
    try {
        await sequelize.authenticate();
        console.log(`✅ Conexión a SQL Server establecida → ${DB_NAME} (${NODE_ENV})`);
    } catch (error) {
        console.error('❌ No se pudo conectar a SQL Server:', error.message);
        // En un error de BD fatal, detenemos el proceso para no arrancar con estado roto
        process.exit(1);
    }
}

module.exports = { sequelize, conectarDB };
