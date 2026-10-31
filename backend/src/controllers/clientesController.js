'use strict';
/**
 * clientesController.js
 * CRUD de clientes (entidades con RUC) — base para facturas y guías.
 */

const { Op } = require('sequelize');
const { Cliente } = require('../models');

// GET /api/clientes
const listar = async (req, res, next) => {
    try {
        const { busqueda, limit } = req.query;
        const where = {};
        if (busqueda) {
            where[Op.or] = [
                { razon_social: { [Op.like]: `%${busqueda}%` } },
                { ruc: { [Op.like]: `%${busqueda}%` } }
            ];
        }
        const clientes = await Cliente.findAll({
            where,
            order: [['razon_social', 'ASC']],
            limit: limit ? parseInt(limit) : undefined
        });
        return res.json({ data: clientes });
    } catch (error) {
        next(error);
    }
};

// GET /api/clientes/:id
const obtener = async (req, res, next) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
        return res.json({ data: cliente });
    } catch (error) {
        next(error);
    }
};

// POST /api/clientes
const crear = async (req, res, next) => {
    try {
        const { ruc, razon_social, tipo_entidad, direccion, telefono, email } = req.body;
        if (!ruc || !razon_social) {
            return res.status(400).json({ error: 'RUC y razón social son obligatorios.' });
        }
        const existe = await Cliente.findOne({ where: { ruc } });
        if (existe) {
            return res.status(409).json({ error: `Ya existe un cliente con RUC ${ruc}.` });
        }
        const cliente = await Cliente.create({
            ruc, razon_social,
            tipo_entidad: tipo_entidad || 'PUBLICA',
            direccion: direccion || null,
            telefono: telefono || null,
            email: email || null
        });
        return res.status(201).json({ data: cliente });
    } catch (error) {
        next(error);
    }
};

// PUT /api/clientes/:id
const actualizar = async (req, res, next) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
        const { razon_social, tipo_entidad, direccion, telefono, email } = req.body;
        await cliente.update({
            razon_social: razon_social ?? cliente.razon_social,
            tipo_entidad: tipo_entidad ?? cliente.tipo_entidad,
            direccion: direccion ?? cliente.direccion,
            telefono: telefono ?? cliente.telefono,
            email: email ?? cliente.email
        });
        return res.json({ data: cliente });
    } catch (error) {
        next(error);
    }
};

module.exports = { listar, obtener, crear, actualizar };
