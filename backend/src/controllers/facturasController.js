'use strict';
/**
 * facturasController.js
 * Facturas y Boletas de venta a clientes (entidades con RUC).
 * tipo_documento: 'FACTURA' | 'BOLETA'.
 */

const { Op } = require('sequelize');
const {
    Factura, DetalleFactura, Cliente, EstadoFactura, Producto, LoteProduccion, sequelize
} = require('../models');

// Serializa una factura agregando el nombre de estado como string.
function serializar(f) {
    const obj = f.toJSON ? f.toJSON() : f;
    obj.estado = obj.EstadoFactura?.nombre || 'BORRADOR';
    return obj;
}

// GET /api/facturas?busqueda=&estado=&tipo_documento=&page=&limit=
const listar = async (req, res, next) => {
    try {
        const page  = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;
        const { busqueda, estado, tipo_documento } = req.query;

        const where = {};
        if (tipo_documento) where.tipo_documento = tipo_documento;
        if (busqueda) {
            where[Op.or] = [{ numero_factura: { [Op.like]: `%${busqueda}%` } }];
        }

        // Filtro por estado (nombre) vía include
        const includeEstado = { model: EstadoFactura, attributes: ['nombre'] };
        if (estado) {
            includeEstado.where = { nombre: estado };
            includeEstado.required = true;
        }

        const { count, rows } = await Factura.findAndCountAll({
            where,
            include: [
                { model: Cliente, attributes: ['razon_social', 'ruc'] },
                includeEstado
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

// GET /api/facturas/:id
const obtener = async (req, res, next) => {
    try {
        const factura = await Factura.findByPk(req.params.id, {
            include: [
                { model: Cliente, attributes: ['razon_social', 'ruc', 'direccion'] },
                { model: EstadoFactura, attributes: ['nombre'] },
                {
                    model: DetalleFactura,
                    include: [
                        { model: Producto, attributes: ['nombre', 'codigo'] },
                        { model: LoteProduccion, attributes: ['numero_lote'] }
                    ]
                }
            ]
        });
        if (!factura) return res.status(404).json({ error: 'Factura no encontrada.' });
        return res.json({ data: serializar(factura) });
    } catch (error) {
        next(error);
    }
};

// POST /api/facturas
// { cliente_id, tipo_documento, numero_factura, fecha_emision, detalles:[{producto_id, lote_id, cantidad, precio_unitario}] }
const crear = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { cliente_id, tipo_documento, numero_factura, fecha_emision, detalles } = req.body;

        if (!cliente_id) {
            await t.rollback();
            return res.status(400).json({ error: 'El cliente es obligatorio.' });
        }
        const cliente = await Cliente.findByPk(cliente_id, { transaction: t });
        if (!cliente) {
            await t.rollback();
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }

        const items = Array.isArray(detalles) ? detalles : [];
        // Validación: cada línea necesita precio ingresado por el ingeniero de ventas (R1).
        for (const d of items) {
            if (!d.precio_unitario || parseFloat(d.precio_unitario) <= 0) {
                await t.rollback();
                return res.status(400).json({ error: 'Cada producto requiere un precio de venta mayor a 0.' });
            }
        }
        const total = items.reduce((acc, d) => acc + parseFloat(d.precio_unitario) * parseFloat(d.cantidad || 0), 0);

        const factura = await Factura.create({
            cliente_id,
            usuario_id: req.usuario ? req.usuario.id : 1,
            tipo_documento: (tipo_documento === 'BOLETA') ? 'BOLETA' : 'FACTURA',
            numero_factura: numero_factura || null,
            fecha_emision: fecha_emision || new Date(),
            total,
            estado_id: 1 // BORRADOR
        }, { transaction: t });

        if (items.length > 0) {
            await DetalleFactura.bulkCreate(items.map(d => ({
                factura_id: factura.id,
                producto_id: d.producto_id,
                lote_id: d.lote_id,
                cantidad: d.cantidad,
                precio_unitario: d.precio_unitario
            })), { transaction: t });
        }

        await t.commit();
        return res.status(201).json({ data: { id: factura.id, ...factura.toJSON() } });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

// PATCH /api/facturas/:id/anular
const anular = async (req, res, next) => {
    try {
        const factura = await Factura.findByPk(req.params.id);
        if (!factura) return res.status(404).json({ error: 'Factura no encontrada.' });
        await factura.update({ estado_id: 4 }); // ANULADA
        return res.json({ mensaje: 'Factura anulada.', motivo: req.body?.motivo || null });
    } catch (error) {
        next(error);
    }
};

module.exports = { listar, obtener, crear, anular };
