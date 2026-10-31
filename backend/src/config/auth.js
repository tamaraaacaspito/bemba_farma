'use strict';
/**
 * src/config/auth.js
 * Helpers de JSON Web Token para autenticación local (desarrollo).
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// ── Secreto JWT único para toda la aplicación ────────────────────────────────
const DEV_FALLBACK_SECRET = 'clave_dev_eka_2026';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET es obligatorio en producción. Defínelo en las variables de entorno.');
}
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET no definido: usando clave de desarrollo. NO usar en producción.');
}

const JWT_SECRET     = process.env.JWT_SECRET     || DEV_FALLBACK_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function generarToken(payload) {
    return jwt.sign(
        { id: payload.id, email: payload.email, rol: payload.rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function verificarToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = { generarToken, verificarToken, JWT_SECRET, JWT_EXPIRES_IN };
