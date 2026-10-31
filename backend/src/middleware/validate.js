'use strict';
/**
 * src/middleware/validate.js
 * Wrapper de express-validator.
 * Ejecuta el array de validaciones y, si hay errores, responde con 400
 * antes de que el controlador siquiera se ejecute.
 *
 * Uso en rutas:
 *   const { body } = require('express-validator');
 *   const { validate } = require('../middleware/validate');
 *
 *   router.post('/',
 *     [ body('email').isEmail(), body('nombre').notEmpty() ],
 *     validate,
 *     controller.crear
 *   );
 */

const { validationResult } = require('express-validator');

/**
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validate(req, res, next) {
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
        // Formateamos la lista de errores para que sea clara en el frontend
        const lista = errores.array().map(e => ({
            campo  : e.path || e.param,
            mensaje: e.msg,
            valor  : e.value
        }));

        return res.status(400).json({
            error  : 'Error de validación en los datos enviados',
            errores: lista,
            codigo : 400
        });
    }

    next();
}

module.exports = { validate };
