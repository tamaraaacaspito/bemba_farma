'use strict';

const { LoteProduccion, Producto, EstadoLote, sequelize } = require('../models');

// GET /api/lotes
const listar = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;

        const { busqueda, estado, producto_id } = req.query;
        
        const stockQuery = `(SELECT COALESCE(SUM(CASE WHEN tipo_movimiento_id IN (1,4,5) THEN cantidad ELSE -cantidad END), 0) FROM movimientos_kardex WHERE lote_id = LoteProduccion.id)`;

        let whereConditions = [];
        if (estado === '0') {
            whereConditions.push(sequelize.where(sequelize.literal(stockQuery), '<=', 0));
        } else if (estado === 'VENCIDO') {
            whereConditions.push(sequelize.where(sequelize.literal(stockQuery), '>', 0));
            whereConditions.push({ fecha_vencimiento: { [require('sequelize').Op.lt]: new Date() } });
        } else if (estado === '1' || estado === undefined) {
            whereConditions.push(sequelize.where(sequelize.literal(stockQuery), '>', 0));
        }

        if (producto_id) {
            whereConditions.push({ producto_id: parseInt(producto_id) });
        }
        if (busqueda) {
            whereConditions.push({ numero_lote: { [require('sequelize').Op.like]: `%${busqueda}%` } });
        }

        const where = { [require('sequelize').Op.and]: whereConditions };

        const { count, rows } = await LoteProduccion.findAndCountAll({
            where,
            include: [
                { model: Producto, attributes: ['id', 'codigo', 'nombre', 'stock_actual', 'stock_minimo', 'unidad_medida'] },
                { model: EstadoLote, attributes: ['nombre'] }
            ],
            attributes: {
                include: [
                    [sequelize.literal(stockQuery), 'stock_actual']
                ]
            },
            limit,
            offset,
            order: [['fecha_produccion', 'DESC']]
        });

        // Asegurarnos que el frontend reciba stock_actual
        const data = rows.map(r => {
            const raw = r.toJSON();
            raw.stock_actual = r.dataValues.stock_actual;
            return raw;
        });

        return res.json({
            data,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Error al listar lotes: ', error);
        next(error);
    }
};

module.exports = { listar };
