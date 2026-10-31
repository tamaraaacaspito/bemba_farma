'use strict';
/**
 * proveedoresController.js
 * Listado y registro simple de proveedores (para órdenes de compra).
 * El flujo también admite proveedor por texto libre en la orden.
 */

const { Op } = require('sequelize');
const { Proveedor } = require('../models');

// GET /api/proveedores
const listar = async (req, res, next) => {
    try {
        const { busqueda } = req.query;
        const where = {};
        if (busqueda) {
            where[Op.or] = [
                { razon_social: { [Op.like]: `%${busqueda}%` } },
                { ruc: { [Op.like]: `%${busqueda}%` } }
            ];
        }
        const proveedores = await Proveedor.findAll({ where, order: [['razon_social', 'ASC']] });
        return res.json({ data: proveedores });
    } catch (error) {
        next(error);
    }
};

// POST /api/proveedores
const crear = async (req, res, next) => {
    try {
        const { ruc, razon_social, direccion, telefono, email } = req.body;
        if (!ruc || !razon_social) {
            return res.status(400).json({ error: 'RUC y razón social son obligatorios.' });
        }
        const existe = await Proveedor.findOne({ where: { ruc } });
        if (existe) return res.status(409).json({ error: `Ya existe un proveedor con RUC ${ruc}.` });
        const proveedor = await Proveedor.create({
            ruc, razon_social,
            direccion: direccion || null,
            telefono: telefono || null,
            email: email || null
        });
        return res.status(201).json({ data: proveedor });
    } catch (error) {
        next(error);
    }
};

module.exports = { listar, crear };
