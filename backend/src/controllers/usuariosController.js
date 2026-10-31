'use strict';

const bcrypt = require('bcryptjs');
const { Usuario, Rol } = require('../models');

// GET /api/usuarios
const getUsuarios = async (req, res, next) => {
    try {
        const { rol, activo } = req.query;
        
        const whereUsuario = {};
        const whereRol = {};

        if (activo !== undefined) {
            // El modelo usa 'estado' en lugar de 'activo'
            whereUsuario.estado = activo === 'true';
        }

        if (rol) {
            whereRol.nombre = rol.toUpperCase();
        }

        const usuarios = await Usuario.findAll({
            where: whereUsuario,
            attributes: { exclude: ['password_hash'] },
            include: [{
                model: Rol,
                where: Object.keys(whereRol).length > 0 ? whereRol : undefined,
                attributes: ['nombre']
            }]
        });

        // Formatear respuesta para coincidir con la expectativa de frontend
        const data = usuarios.map(u => {
            const user = u.toJSON(); // Esto ya excluye password_hash por el prototype si está configurado
            user.rol = u.Rol ? u.Rol.nombre : null;
            user.activo = user.estado;
            delete user.estado;
            return user;
        });

        return res.json({ data });
    } catch (error) {
        next(error);
    }
};

// POST /api/usuarios
const crearUsuario = async (req, res, next) => {
    try {
        const { nombre, email, password, rol } = req.body;

        const existe = await Usuario.findOne({ where: { email } });
        
        if (existe) {
            return res.status(409).json({ error: 'El email ya esta registrado' });
        }

        let rolRecord;
        if (rol) {
            rolRecord = await Rol.findOne({ where: { nombre: rol.toUpperCase() } });
            if (!rolRecord) {
                return res.status(400).json({ error: 'Rol inválido' });
            }
        } else {
            // Default a ALMACEN si no viene
            rolRecord = await Rol.findOne({ where: { nombre: 'ALMACEN' } });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const nuevoUsuario = await Usuario.create({
            nombre,
            email,
            password_hash,
            rol_id: rolRecord.id,
            estado: true // "activo"
        });

        const usuarioRespuesta = nuevoUsuario.toJSON();
        delete usuarioRespuesta.password_hash;
        usuarioRespuesta.activo = usuarioRespuesta.estado;
        delete usuarioRespuesta.estado;
        usuarioRespuesta.rol = rolRecord.nombre;

        return res.status(201).json(usuarioRespuesta);
    } catch (error) {
        next(error);
    }
};

// PUT /api/usuarios/:id
const actualizarUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, email, rol } = req.body;

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (email && email !== usuario.email) {
            const existeEmail = await Usuario.findOne({ where: { email } });
            if (existeEmail) {
                return res.status(409).json({ error: 'El email ya esta registrado por otro usuario' });
            }
            usuario.email = email;
        }

        if (nombre) usuario.nombre = nombre;

        if (rol) {
            const rolRecord = await Rol.findOne({ where: { nombre: rol.toUpperCase() } });
            if (!rolRecord) {
                return res.status(400).json({ error: 'Rol inválido' });
            }
            usuario.rol_id = rolRecord.id;
        }

        await usuario.save();

        // Obtener con Rol para la respuesta
        const usuarioActualizado = await Usuario.findByPk(id, {
            include: [{ model: Rol, attributes: ['nombre'] }],
            attributes: { exclude: ['password_hash'] }
        });

        const usuarioRespuesta = usuarioActualizado.toJSON();
        usuarioRespuesta.activo = usuarioRespuesta.estado;
        delete usuarioRespuesta.estado;
        usuarioRespuesta.rol = usuarioRespuesta.Rol ? usuarioRespuesta.Rol.nombre : null;

        return res.json(usuarioRespuesta);
    } catch (error) {
        next(error);
    }
};

// PATCH /api/usuarios/:id/password
const actualizarPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nueva_password } = req.body;

        if (!nueva_password) {
            return res.status(400).json({ error: 'nueva_password es requerida' });
        }

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const salt = await bcrypt.genSalt(10);
        usuario.password_hash = await bcrypt.hash(nueva_password, salt);
        await usuario.save();

        return res.json({ message: 'Contrasena actualizada' });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/usuarios/:id/toggle-activo
const toggleActivo = async (req, res, next) => {
    try {
        const { id } = req.params;

        const usuario = await Usuario.findByPk(id, {
            include: [{ model: Rol, attributes: ['nombre'] }]
        });
        
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        usuario.estado = !usuario.estado;
        await usuario.save();

        const usuarioRespuesta = usuario.toJSON();
        delete usuarioRespuesta.password_hash;
        usuarioRespuesta.activo = usuarioRespuesta.estado;
        delete usuarioRespuesta.estado;
        usuarioRespuesta.rol = usuarioRespuesta.Rol ? usuarioRespuesta.Rol.nombre : null;

        return res.json(usuarioRespuesta);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsuarios,
    crearUsuario,
    actualizarUsuario,
    actualizarPassword,
    toggleActivo
};
