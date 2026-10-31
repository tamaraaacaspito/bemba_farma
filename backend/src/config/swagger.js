'use strict';
/**
 * src/config/swagger.js
 * Configuración de Swagger UI y swagger-jsdoc para documentación de la API.
 * Disponible en: GET /api/docs  (solo en NODE_ENV=development)
 */

const swaggerJsdoc       = require('swagger-jsdoc');
const swaggerUi          = require('swagger-ui-express');
const path               = require('path');

const opciones = {
    definition: {
        openapi: '3.0.0',
        info: {
            title      : 'Droguería EKA — API REST',
            version    : '1.0.0',
            description: 'Sistema de Gestión de Inventarios para Droguería EKA S.A.C. · Tesis SENATI 2026',
            contact    : {
                name : 'Equipo EKA · Deniss Figueroa / Tamara Solano',
                email: 'admin@drogueria-eka.com'
            }
        },
        servers: [
            { url: 'http://localhost:3000/api', description: 'Desarrollo local' },
            { url: 'https://api.drogueria-eka.com/api', description: 'Producción Azure' }
        ],
        // Esquema de seguridad JWT para el botón "Authorize" de Swagger UI
        components: {
            securitySchemes: {
                BearerAuth: {
                    type        : 'http',
                    scheme      : 'bearer',
                    bearerFormat: 'JWT',
                    description : 'Pega el token JWT obtenido de POST /api/auth/login'
                }
            }
        },
        security: [{ BearerAuth: [] }]
    },
    // Lee los comentarios JSDoc /** @swagger ... */ de todos los archivos de rutas
    apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../controllers/*.js')
    ]
};

const spec = swaggerJsdoc(opciones);

/**
 * Monta Swagger UI en la app de Express.
 * @param {import('express').Application} app
 */
function configurarSwagger(app) {
    // Redirigir raíz de /api/docs al index de Swagger
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
        customSiteTitle: 'EKA API Docs',
        swaggerOptions : { persistAuthorization: true }
    }));

    // Exponer el JSON del spec para clientes como Postman/Insomnia
    app.get('/api/docs.json', (_req, res) => res.json(spec));

    console.log('📄 Swagger UI disponible en http://localhost:3000/api/docs');
}

module.exports = { configurarSwagger };
