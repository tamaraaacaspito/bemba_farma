'use strict';
/**
 * guiasController.js
 * Guías de Remisión. tipo_guia: 'DESPACHO' | 'REPOSICION'.
 * - DESPACHO: entrega estándar, normalmente vinculada a una factura.
 * - REPOSICION: corrección de faltantes; la factura es opcional.
 */

const { Op } = require('sequelize');
const {
    GuiaRemision, DetalleGuia, Cliente, Factura, EstadoGuia, Producto, LoteProduccion, sequelize
} = require('../models');

function serializar(g) {
    const obj = g.toJSON ? g.toJSON() : g;
    obj.estado = obj.EstadoGuia?.nombre || 'PENDIENTE';
    return obj;
}

// GET /api/guias?busqueda=&tipo_guia=&page=&limit=
const listar = async (req, res, next) => {
    try {
        const page  = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;
        const { busqueda, tipo_guia } = req.query;

        const where = {};
        if (tipo_guia) where.tipo_guia = tipo_guia;
        if (busqueda) where[Op.or] = [{ numero_guia: { [Op.like]: `%${busqueda}%` } }];

        const { count, rows } = await GuiaRemision.findAndCountAll({
            where,
            include: [
                { model: Cliente, attributes: ['razon_social', 'ruc'] },
                { model: Factura, attributes: ['numero_factura', 'tipo_documento'] },
                { model: EstadoGuia, attributes: ['nombre'] }
            ],
            order: [['fecha_emision', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        return res.json({
            data: rows.map(serializar),
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/guias/:id
const obtener = async (req, res, next) => {
    try {
        const guia = await GuiaRemision.findByPk(req.params.id, {
            include: [
                { model: Cliente, attributes: ['razon_social', 'ruc', 'direccion'] },
                { model: Factura, attributes: ['numero_factura', 'tipo_documento'] },
                { model: EstadoGuia, attributes: ['nombre'] },
                {
                    model: DetalleGuia,
                    include: [
                        { model: Producto, attributes: ['nombre', 'codigo'] },
                        { model: LoteProduccion, attributes: ['numero_lote'] }
                    ]
                }
            ]
        });
        if (!guia) return res.status(404).json({ error: 'Guía no encontrada.' });
        return res.json({ data: serializar(guia) });
    } catch (error) {
        next(error);
    }
};

// POST /api/guias
// { cliente_id, tipo_guia, numero_guia, fecha_emision, factura_id?, detalles? }
const crear = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { cliente_id, tipo_guia, numero_guia, fecha_emision, factura_id, detalles } = req.body;

        if (!cliente_id) {
            await t.rollback();
            return res.status(400).json({ error: 'El cliente es obligatorio para la guía.' });
        }
        const tipo = (tipo_guia === 'REPOSICION') ? 'REPOSICION' : 'DESPACHO';

        const guia = await GuiaRemision.create({
            cliente_id,
            usuario_id: req.usuario ? req.usuario.id : 1,
            numero_guia: numero_guia || null,
            fecha_emision: fecha_emision || new Date(),
            estado_id: 1, // PENDIENTE
            factura_id: factura_id || null,
            tipo_guia: tipo
        }, { transaction: t });

        const items = Array.isArray(detalles) ? detalles : [];
        if (items.length > 0) {
            await DetalleGuia.bulkCreate(items.map(d => ({
                guia_id: guia.id,
                producto_id: d.producto_id,
                lote_id: d.lote_id,
                cantidad: d.cantidad,
                precio_unitario: d.precio_unitario ?? null
            })), { transaction: t });
        }

        await t.commit();
        return res.status(201).json({ data: guia });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

// PATCH /api/guias/:id/anular
const anular = async (req, res, next) => {
    try {
        const guia = await GuiaRemision.findByPk(req.params.id);
        if (!guia) return res.status(404).json({ error: 'Guía no encontrada.' });
        await guia.update({ estado_id: 4 }); // ANULADA
        return res.json({ mensaje: 'Guía anulada.', motivo: req.body?.motivo || null });
    } catch (error) {
        next(error);
    }
};

module.exports = { listar, obtener, crear, anular };
