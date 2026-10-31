'use strict';
require('dotenv').config();
const sql = require('mssql');

const server   = process.env.DB_SERVER;
const database = process.env.DB_NAME;
const user     = process.env.DB_USER;
const password = process.env.DB_PASSWORD;

console.log('=== TEST DE CONEXIÓN A AZURE SQL ===');
console.log('Servidor :', server);
console.log('Base de datos:', database);
console.log('Usuario  :', user);
console.log('Password  :', password ? '*** (configurada)' : '❌ VACÍA');

const config = {
    server,
    database,
    port: 1433,
    user,
    password,
    options: {
        encrypt: true,              // Obligatorio en Azure
        trustServerCertificate: false
    },
    connectionTimeout: 15000
};

async function testConexion() {
    let pool;
    try {
        console.log('\n⏳ Intentando conectar...');
        pool = await sql.connect(config);
        console.log('\n✅ ¡CONEXIÓN EXITOSA a Azure SQL Database!');

        // Prueba básica
        const result = await pool.request().query('SELECT GETDATE() as fecha_servidor, DB_NAME() as base_datos');
        const row = result.recordset[0];
        console.log(`📅 Fecha del servidor Azure: ${row.fecha_servidor}`);
        console.log(`🗄️  Base de datos activa   : ${row.base_datos}`);

        // Contar tablas
        const tablas = await pool.request().query(`
            SELECT COUNT(*) as total FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);
        console.log(`📋 Tablas en la BD        : ${tablas.recordset[0].total}`);

    } catch (err) {
        console.error('\n❌ ERROR DE CONEXIÓN:');
        console.error('Mensaje:', err.message);
        if (err.message.includes('firewall')) {
            console.error('\n⚠️  SOLUCIÓN: Agrega tu IP en el firewall de Azure SQL:');
            console.error('   Portal Azure → SQL Server → Redes → Agregar IP del cliente');
        }
        if (err.message.includes('Login failed')) {
            console.error('\n⚠️  SOLUCIÓN: Verifica usuario y contraseña en .env');
        }
    } finally {
        if (pool) await pool.close();
    }
}

testConexion();
