'use strict';
require('dotenv').config(); 
const { Sequelize } = require('sequelize');

const createDB = async () => {
    // Tomamos sus credenciales
    const {
        DB_SERVER = 'localhost\\SQLEXPRESS',
        DB_USER = 'sa',
        DB_PASSWORD,
        DB_NAME = 'DrogueriaEKA_DB'
    } = process.env;

    if (!DB_PASSWORD) {
        throw new Error('DB_PASSWORD no está definida. Configúrala en el archivo .env antes de ejecutar este script.');
    }

    console.log(`Intentando conectar a master en ${DB_SERVER} para crear BD ${DB_NAME}...`);

    try {
        const sequelize = new Sequelize('master', DB_USER, DB_PASSWORD, {
            host: DB_SERVER,
            dialect: 'mssql',
            dialectOptions: {
                options: {
                    trustServerCertificate: true,
                    encrypt: false
                }
            },
            logging: console.log
        });

        await sequelize.authenticate();
        console.log('✅ Conectado al Master DB. Ejecutando CREATE DATABASE...');
        
        await sequelize.query(`CREATE DATABASE ${DB_NAME} COLLATE Latin1_General_CI_AS;`);
        console.log(`✔️ ¡Base de datos ${DB_NAME} creada satisfactoriamente!`);
        
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log(`⚠️ La base de datos ${DB_NAME} ya existe.`);
        } else {
            console.error('❌ Error crítico creando BD:', error.message);
        }
    } finally {
        process.exit(0);
    }
};

createDB();
