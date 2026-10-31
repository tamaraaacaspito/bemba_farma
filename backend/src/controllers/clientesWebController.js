const { ClienteWeb, PedidoWeb } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

// ── REGISTRO ──────────────────────────────────────────────────────────────────
// POST /api/clientes-web/registro (PÚBLICO)
const registro = async (req, res, next) => {
    try {
        const { nombre_completo, entidad, ruc_dni, email, telefono, password, tipo } = req.body;

        if (!nombre_completo || !email || !password) {
            return res.status(400).json({ error: 'Nombre, Email y Contraseña son obligatorios.' });
        }

        const existe = await ClienteWeb.findOne({ where: { email } });
        if (existe) {
            return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo electrónico.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const cliente = await ClienteWeb.create({
            nombre_completo,
            entidad: entidad || null,
            ruc_dni: ruc_dni || null,
            email,
            telefono: telefono || null,
            password_hash,
            tipo: tipo || 'HOSPITAL'
        });

        const token = jwt.sign(
            { id: cliente.id, email: cliente.email, tipo: 'cliente_web' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        return res.status(201).json({
            mensaje: '¡Cuenta creada con éxito! Bienvenido al portal de Droguería EKA.',
            token,
            cliente: {
                id: cliente.id,
                nombre_completo: cliente.nombre_completo,
                entidad: cliente.entidad,
                email: cliente.email,
                tipo: cliente.tipo
            }
        });
    } catch (error) {
        next(error);
    }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
// POST /api/clientes-web/login (PÚBLICO)
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
        }

        const cliente = await ClienteWeb.findOne({ where: { email, activo: true } });
        if (!cliente) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        const valido = await bcrypt.compare(password, cliente.password_hash);
        if (!valido) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        await cliente.update({ ultimo_acceso: new Date() });

        const token = jwt.sign(
            { id: cliente.id, email: cliente.email, tipo: 'cliente_web' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        return res.json({
            mensaje: 'Sesión iniciada correctamente.',
            token,
            cliente: {
                id: cliente.id,
                nombre_completo: cliente.nombre_completo,
                entidad: cliente.entidad,
                email: cliente.email,
                tipo: cliente.tipo
            }
        });
    } catch (error) {
        next(error);
    }
};

// ── MIS PEDIDOS ───────────────────────────────────────────────────────────────
// GET /api/clientes-web/mis-pedidos (AUTENTICADO como cliente_web)
const misPedidos = async (req, res, next) => {
    try {
        const pedidos = await PedidoWeb.findAll({
            where: { cliente_web_id: req.clienteWeb.id },
            order: [['fecha_recepcion', 'DESC']]
        });
        return res.json({ data: pedidos });
    } catch (error) {
        next(error);
    }
};

// ── PERFIL ────────────────────────────────────────────────────────────────────
// GET /api/clientes-web/perfil
const perfil = async (req, res, next) => {
    try {
        const cliente = await ClienteWeb.findByPk(req.clienteWeb.id, {
            attributes: { exclude: ['password_hash'] }
        });
        return res.json({ data: cliente });
    } catch (error) {
        next(error);
    }
};

// ── LISTAR (ADMIN ERP) ────────────────────────────────────────────────────────
// GET /api/clientes-web (PRIVADO - ADMIN)
const listar = async (req, res, next) => {
    try {
        const clientes = await ClienteWeb.findAll({
            attributes: { exclude: ['password_hash'] },
            order: [['fecha_registro', 'DESC']]
        });
        return res.json({ data: clientes });
    } catch (error) {
        next(error);
    }
};

// ── ACTIVAR/DESACTIVAR (ADMIN ERP) ────────────────────────────────────────────
// PUT /api/clientes-web/:id/estado (PRIVADO - ADMIN)
const toggleEstado = async (req, res, next) => {
    try {
        const cliente = await ClienteWeb.findByPk(req.params.id);
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
        await cliente.update({ activo: !cliente.activo });
        return res.json({ mensaje: `Cliente ${cliente.activo ? 'activado' : 'desactivado'}.`, cliente });
    } catch (error) {
        next(error);
    }
};

module.exports = { registro, login, misPedidos, perfil, listar, toggleEstado };
