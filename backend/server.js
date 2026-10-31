'use strict';
/**
 * server.js — Entry Point de la API REST de Droguería EKA S.A.C.
 *
 * Orden de inicio:
 *  1. Cargar variables de entorno (.env)
 *  2. Conectar a la base de datos (SQL Server)
 *  3. Sincronizar modelos Sequelize (solo en desarrollo)
 *  4. Configurar middlewares globales
 *  5. Montar rutas
 *  6. Montar Swagger UI
 *  7. Manejador global de errores
 *  8. Escuchar en PORT
 */

// ── 1. Variables de entorno (debe ser lo primero) ────────────────────────────
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const path         = require('path');

const { conectarDB }          = require('./src/config/db');
const { sincronizarModelos }  = require('./src/models/index');
const { configurarSwagger }   = require('./src/config/swagger');
const errorHandler            = require('./src/middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 2. Middlewares de seguridad y logging ────────────────────────────────────

// Helmet agrega headers HTTP de seguridad (Content-Security-Policy, HSTS, etc.)
// En dev relajamos las restricciones para que Swagger UI funcione sin problemas
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// CORS: lista de orígenes permitidos (frontend React + web institucional)
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.INSTITUCIONAL_URL || 'http://localhost:5174',
    'http://localhost:5173',   // Frontend React (desarrollo)
    'http://localhost:5174',   // Web institucional Vite (desarrollo)
    'http://localhost:8080',   // Web institucional Docker (producción)
    'http://192.168.18.65:5173', // Web app desde Wi-Fi
    'http://181.64.105.30:5173', // Web app desde IP Pública
    'http://10.81.13.251:5173'   // Web app desde VPN/Virtual
];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origin (Postman, curl, móvil)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS bloqueado para origen: ${origin}`));
        }
    },
    methods    : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

// Logger de requests HTTP (formato dev: coloreado con tiempos de respuesta)
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Parseo de JSON y URL-encoded bodies (máximo 10 MB para documentos)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Archivos estáticos: carpeta uploads (documentos subidos en desarrollo local)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── 3. Rutas de la API ────────────────────────────────────────────────────────
/**
 * Todas las rutas del sistema están bajo el prefijo /api
 * El router central (src/routes/index.js) las distribuye internamente:
 *   /api/health      → ping del sistema
 *   /api/auth        → autenticación (login, register)
 *   /api/usuarios    → CRUD de usuarios (solo ADMIN)
 *   /api/productos   → catálogo de dispositivos médicos
 *   /api/kardex      → movimientos de inventario
 *   /api/ordenes     → órdenes de compra a proveedores
 *   /api/documentos  → gestión de archivos (Blob Storage / uploads local)
 *   /api/reportes    → reportes en JSON, Excel y PDF
 *   /api/ia          → anomalías y chatbot GPT-4
 */
app.use('/api', require('./src/routes/index'));

// ── 4. Swagger UI ─────────────────────────────────────────────────────────────
// Solo disponible en desarrollo para no exponer la documentación en producción
if (process.env.NODE_ENV !== 'production') {
    configurarSwagger(app);
}

// ── 5. Ruta 404 para endpoints inexistentes ───────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        error  : 'Endpoint no encontrado',
        detalle: 'Consulta /api/docs para ver los endpoints disponibles',
        codigo : 404
    });
});

// ── 6. Manejador global de errores (debe ser el ÚLTIMO middleware) ─────────────
app.use(errorHandler);

// ── 7. Iniciar servidor ────────────────────────────────────────────────────────
async function iniciar() {
    try {
        // 1. Conectar a SQL Server antes de aceptar peticiones
        await conectarDB();

        // 2. Cargar modelos Sequelize y definir asociaciones
        //    alter:false → no modifica el esquema, solo verifica
        await sincronizarModelos();

        // 3. Iniciar CRON JOBS (R8, etc)
        const { iniciarCronJobs } = require('./src/scripts/cronJobs');
        iniciarCronJobs();

        app.listen(PORT, () => {
            console.log('');
            console.log('╔══════════════════════════════════════════════════╗');
            console.log('║   🏥 Droguería EKA S.A.C. — API en línea        ║');
            console.log('╠══════════════════════════════════════════════════╣');
            console.log(`║  Puerto   : http://localhost:${PORT}               ║`);
            console.log(`║  Entorno  : ${(process.env.NODE_ENV || 'development').padEnd(37)}║`);
            console.log(`║  Docs     : http://localhost:${PORT}/api/docs       ║`);
            console.log(`║  Health   : http://localhost:${PORT}/api/health     ║`);
            console.log('╚══════════════════════════════════════════════════╝');
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error fatal al iniciar el servidor:', error);
        process.exit(1);
    }
}

iniciar();

module.exports = app; // para tests con Jest/Supertest
