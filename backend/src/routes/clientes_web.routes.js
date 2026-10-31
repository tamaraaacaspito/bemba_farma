const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientesWebController');
const { autenticar } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

// Middleware de autenticación para clientes web (portal B2B)
const autenticarClienteWeb = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de sesión no proporcionado.' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.tipo !== 'cliente_web') {
            return res.status(403).json({ error: 'Acceso restringido al portal de clientes.' });
        }
        req.clienteWeb = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Sesión inválida o expirada.' });
    }
};

// ── Rutas PÚBLICAS (sin token) ─────────────────────────────────────────────────
router.post('/registro', ctrl.registro);
router.post('/login', ctrl.login);

// ── Rutas de CLIENTE WEB autenticado ──────────────────────────────────────────
router.get('/perfil', autenticarClienteWeb, ctrl.perfil);
router.get('/mis-pedidos', autenticarClienteWeb, ctrl.misPedidos);

// ── Rutas de ADMINISTRACIÓN ERP (personal interno) ────────────────────────────
router.get('/', autenticar, ctrl.listar);
router.put('/:id/estado', autenticar, ctrl.toggleEstado);

module.exports = router;
