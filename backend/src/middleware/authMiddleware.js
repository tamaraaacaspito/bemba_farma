'use strict';

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado o inválido.' });
        }

        const token = authHeader.split(' ')[1];
        // Se valida la expiración: un token vencido es rechazado.
        const payload = jwt.verify(token, JWT_SECRET);

        req.usuario = payload;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Sesión expirada. Inicia sesión nuevamente.' });
        }
        return res.status(401).json({ error: 'Token inválido.' });
    }
};

const requireRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado.' });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ error: `Acceso denegado. Rol requerido: ${rolesPermitidos.join(', ')}` });
        }

        next();
    };
};

module.exports = {
    auth,
    requireRol,
    autenticar: auth,
    soloAdmin: requireRol('ADMIN'),
    adminOAlmacen: requireRol('ADMIN', 'ALMACEN')
};
