'use strict';

const { Op } = require('sequelize');
const { Producto, Categoria, MovimientoKardex, sequelize } = require('../models');

// GET /api/productos
const listar = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;

        const { categoria_id, busqueda, estado } = req.query;

        let where = { estado: true }; // Por defecto solo productos activos
        
        // Manejo de Filtros de Stock (CRITICO, AGOTADO, OK)
        if (estado) {
            if (estado === 'CRITICO') {
                where.stock_actual = { [Op.lte]: sequelize.col('stock_minimo'), [Op.gt]: 0 };
            } else if (estado === 'AGOTADO') {
                where.stock_actual = 0;
            } else if (estado === 'OK') {
                where.stock_actual = { [Op.gt]: sequelize.col('stock_minimo') };
            }
        }

        if (categoria_id) {
            where.categoria_id = parseInt(categoria_id);
        }

        if (busqueda) {
            where[Op.or] = [
                { codigo: { [Op.like]: `%${busqueda}%` } },
                { nombre: { [Op.like]: `%${busqueda}%` } }
            ];
        }

        const { count, rows } = await Producto.findAndCountAll({
            where,
            include: [{ model: Categoria, as: 'Categoria', attributes: ['nombre'] }],
            limit,
            offset,
            order: [['nombre', 'ASC']]
        });

        return res.json({
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/productos/stats
const stats = async (req, res, next) => {
    try {
        const total_activos = await Producto.count({ where: { estado: true } });
        
        const total_criticos = await Producto.count({
            where: {
                estado: true,
                stock_actual: {
                    [Op.lte]: sequelize.col('stock_minimo'),
                    [Op.gt]: 0
                }
            }
        });

        const total_agotados = await Producto.count({
            where: {
                estado: true,
                stock_actual: 0
            }
        });

        return res.json({ total_activos, total_criticos, total_agotados });
    } catch (error) {
        next(error);
    }
};

// GET /api/productos/:id
const obtener = async (req, res, next) => {
    try {
        const producto = await Producto.findOne({
            where: { id: req.params.id, estado: true },
            include: [{ model: Categoria, as: 'Categoria', attributes: ['nombre'] }]
        });

        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        return res.json(producto);
    } catch (error) {
        next(error);
    }
};

// POST /api/productos
const crear = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { codigo, nombre, categoria_id, unidad_medida, stock_inicial, stock_minimo, cod_rs, fecha_venc_rs } = req.body;

        if (stock_inicial < 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'El stock inicial debe ser >= 0' });
        }

        const existe = await Producto.findOne({ where: { codigo } });
        if (existe) {
            await transaction.rollback();
            return res.status(400).json({ error: 'El código del producto ya existe' });
        }

        const producto = await Producto.create({
            codigo,
            nombre,
            categoria_id,
            cod_rs,
            fecha_venc_rs,
            unidad_medida,
            stock_actual: stock_inicial || 0,
            stock_minimo,
            estado: true
        }, { transaction });

        // Insertar en Kardex si el stock inicial es > 0
        if (stock_inicial > 0) {
            await MovimientoKardex.create({
                producto_id: producto.id,
                usuario_id: req.usuario ? req.usuario.id : 1,
                tipo_movimiento_id: 1, // 1 = ENTRADA
                cantidad: stock_inicial,
                stock_anterior: 0,
                stock_nuevo: stock_inicial,
                motivo: 'Stock inicial',
                referencia_tipo: 'AJUSTE'
            }, { transaction });
        }

        await transaction.commit();
        
        // Retornar detalle completo
        const productoCreado = await Producto.findByPk(producto.id, {
            include: [{ model: Categoria, as: 'Categoria', attributes: ['nombre'] }]
        });
        
        return res.status(201).json(productoCreado);
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// PUT /api/productos/:id
const actualizar = async (req, res, next) => {
    try {
        const { nombre, categoria_id, unidad_medida, stock_minimo, cod_rs, fecha_venc_rs } = req.body;
        
        const producto = await Producto.findOne({ where: { id: req.params.id, estado: true } });
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado o inactivo' });
        }

        // Se actualizan únicamente estos campos.
        await producto.update({
            nombre: nombre !== undefined ? nombre : producto.nombre,
            categoria_id: categoria_id !== undefined ? categoria_id : producto.categoria_id,
            unidad_medida: unidad_medida !== undefined ? unidad_medida : producto.unidad_medida,
            stock_minimo: stock_minimo !== undefined ? stock_minimo : producto.stock_minimo,
            cod_rs: cod_rs !== undefined ? cod_rs : producto.cod_rs,
            fecha_venc_rs: fecha_venc_rs !== undefined ? fecha_venc_rs : producto.fecha_venc_rs
        });

        // Retornar detalle actualizado
        const productoActualizado = await Producto.findByPk(producto.id, {
            include: [{ model: Categoria, as: 'Categoria', attributes: ['nombre'] }]
        });

        return res.json(productoActualizado);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/productos/:id
const eliminar = async (req, res, next) => {
    try {
        const producto = await Producto.findByPk(req.params.id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const movimientos = await MovimientoKardex.count({ where: { producto_id: producto.id } });
        
        if (movimientos > 0) {
            return res.status(409).json({ error: 'No se puede eliminar: tiene historial de movimientos' });
        }

        // Aplicamos el soft delete (Actualizar a false)
        await producto.update({ estado: false });
        
        return res.json({ mensaje: 'Producto eliminado correctamente' });
    } catch (error) {
        next(error);
    }
};

// GET /api/productos/:id/lotes
const obtenerLotes = async (req, res, next) => {
    try {
        const { LoteProduccion, MovimientoKardex, sequelize: seq } = require('../models');
        
        // Traer todos los lotes del producto
        const lotes = await LoteProduccion.findAll({
            where: { producto_id: req.params.id },
            order: [['fecha_vencimiento', 'ASC']]
        });

        if (lotes.length === 0) return res.json([]);

        // Calcular el stock real de cada lote sumando movimientos del kardex
        // Entradas: tipo_movimiento_id IN (1=ENTRADA, 4=REPOSICION, 5=CANJE_ENTRADA)
        // Salidas:  tipo_movimiento_id IN (2=SALIDA,  3=AJUSTE,    6=CANJE_SALIDA)
        const stockRows = await seq.query(`
            SELECT
                lote_id,
                SUM(CASE WHEN tipo_movimiento_id IN (1,4,5) THEN cantidad ELSE -cantidad END) AS stock_lote
            FROM movimientos_kardex
            WHERE lote_id IN (:loteIds)
            GROUP BY lote_id
        `, {
            replacements: { loteIds: lotes.map(l => l.id) },
            type: seq.QueryTypes.SELECT
        });

        // Crear mapa lote_id → stock
        const stockMap = {};
        const rows = Array.isArray(stockRows) ? stockRows : [];
        rows.forEach(row => {
            if (row && row.lote_id != null) {
                stockMap[row.lote_id] = parseFloat(row.stock_lote) || 0;
            }
        });

        // Adjuntar stock_actual calculado a cada lote
        const result = lotes.map(l => ({
            ...l.toJSON(),
            stock_actual: stockMap[l.id] ?? 0
        }));

        return res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = { listar, stats, obtener, obtenerLotes, crear, actualizar, eliminar };
