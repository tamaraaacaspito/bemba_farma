'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario, Rol } = require('../models');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/auth');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const usuario = await Usuario.findOne({
            where: { email },
            include: [{ model: Rol, attributes: ['nombre'] }]
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Email no encontrado.' });
        }

        if (!usuario.estado) {
            return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
        }

        const passCorrecto = await bcrypt.compare(password, usuario.password_hash);
        if (!passCorrecto) {
            return res.status(401).json({ error: 'Password incorrecto.' });
        }

        const payload = {
            id: usuario.id,
            email: usuario.email,
            rol: usuario.Rol.nombre
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        return res.json({
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.Rol.nombre
            }
        });
    } catch (error) {
        next(error);
    }
};

const registro = async (req, res, next) => {
    try {
        const { nombre, email, password, rol_id } = req.body;

        const existe = await Usuario.findOne({ where: { email } });
        if (existe) {
            return res.status(400).json({ error: 'El email ya está registrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const nuevoUsuario = await Usuario.create({
            nombre,
            email,
            password_hash,
            rol_id,
            estado: true
        });

        return res.status(201).json(nuevoUsuario);
    } catch (error) {
        next(error);
    }
};

module.exports = { login, registro };
