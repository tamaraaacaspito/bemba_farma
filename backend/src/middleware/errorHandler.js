'use strict';
/**
 * src/middleware/errorHandler.js
 * Manejador global de errores de Express.
 * Se registra como ÚLTIMO middleware en server.js: app.use(errorHandler)
 *
 * Captura cualquier error que llegue con next(err) desde controladores o middlewares.
 * Devuelve una respuesta JSON estandarizada.
 */

/**
 * @param {Error} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function errorHandler(err, req, res, _next) {   // eslint-disable-line no-unused-vars
    // Log completo del error para el equipo de desarrollo
    console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err);

    // ------------------------------------------------------------------
    // Clasificación de errores con sus códigos HTTP adecuados
    // ------------------------------------------------------------------

    // Error de validación de express-validator (lanzado por validate.js)
    if (err.status === 400 || err.name === 'ValidationError') {
        return res.status(400).json({
            error  : 'Datos inválidos',
            detalle: err.message || err.errors,
            codigo : 400
        });
    }

    // Token JWT inválido o expirado
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error  : 'Token de autenticación inválido o expirado',
            detalle: err.message,
            codigo : 401
        });
    }

    // Sin permisos suficientes (rol inadecuado)
    if (err.status === 403) {
        return res.status(403).json({
            error  : 'No tienes permiso para realizar esta acción',
            detalle: err.message,
            codigo : 403
        });
    }

    // Recurso no encontrado
    if (err.status === 404) {
        return res.status(404).json({
            error  : 'Recurso no encontrado',
            detalle: err.message,
            codigo : 404
        });
    }

    // Error de negocio: stock insuficiente, datos duplicados, etc. (HTTP 422)
    if (err.status === 422) {
        return res.status(422).json({
            error  : 'No se puede procesar la solicitud',
            detalle: err.message,
            codigo : 422
        });
    }

    // Error de Sequelize: violación de unicidad (código 23000 MSSQL = 2627)
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            error  : 'Ya existe un registro con esos datos',
            detalle: err.errors?.map(e => e.message).join(', '),
            codigo : 409
        });
    }

    // Error de Sequelize: FK, CHECK constraint
    if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            error  : 'Error de integridad en la base de datos',
            detalle: err.original?.message || err.message,
            codigo : 400
        });
    }

    // Error genérico del servidor (500)
    const esProduccion = process.env.NODE_ENV === 'production';
    return res.status(500).json({
        error  : 'Error interno del servidor',
        // En producción ocultamos el detalle técnico por seguridad
        detalle: esProduccion ? 'Contacta al administrador del sistema' : err.message,
        codigo : 500
    });
}

module.exports = errorHandler;
