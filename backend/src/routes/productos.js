'use strict';

const express = require('express');
const router = express.Router();
const { listar, stats, obtener, obtenerLotes, crear, actualizar, eliminar } = require('../controllers/productosController');
const { auth, requireRol } = require('../middleware/authMiddleware');

// ── RUTA PÚBLICA: Catálogo para la web institucional (sin auth) ────────────────
const { Categoria, Producto, LoteProduccion, MovimientoKardex, sequelize } = require('../models');
router.get('/catalogo', async (req, res) => {
    try {
        const { busqueda, categoria_id } = req.query;
        const { Op } = require('sequelize');
        let where = { estado: true };
        if (categoria_id) where.categoria_id = parseInt(categoria_id);
        if (busqueda) {
            where[Op.or] = [
                { nombre: { [Op.like]: `%${busqueda}%` } },
                { codigo: { [Op.like]: `%${busqueda}%` } }
            ];
        }
        const productos = await Producto.findAll({
            where,
            include: [
                { model: Categoria, as: 'Categoria', attributes: ['nombre'] },
                {
                    model: LoteProduccion,
                    attributes: ['id', 'numero_lote', 'fecha_produccion', 'fecha_vencimiento', 'cantidad_producida', 'estado_id'],
                    separate: true,
                    order: [['fecha_produccion', 'DESC']]
                }
            ],
            attributes: ['id', 'codigo', 'nombre', 'unidad_medida', 'stock_actual', 'stock_minimo', 'precio_unitario', 'categoria_id'],
            order: [['nombre', 'ASC']]
        });

        const salidasPorLote = await MovimientoKardex.findAll({
            attributes: [
                'lote_id',
                [sequelize.fn('SUM', sequelize.col('cantidad')), 'total_salida']
            ],
            where: { tipo_movimiento_id: 2, lote_id: { [Op.ne]: null } },
            group: ['lote_id'],
            raw: true
        });
        const mapSalidas = {};
        salidasPorLote.forEach(s => { mapSalidas[s.lote_id] = parseFloat(s.total_salida) || 0; });

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const data = productos.map(p => {
            const prod = p.toJSON();
            let stock_vigente = 0;
            let stock_vencido = 0;
            let tiene_lotes_vencidos = false;

            (prod.LoteProduccions || prod.LoteProduccion || []).forEach(lote => {
                const producido  = parseFloat(lote.cantidad_producida) || 0;
                const despachado = mapSalidas[lote.id] || 0;
                const disponible = Math.max(producido - despachado, 0);
                const vencido = lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) < hoy;
                const rechazado = lote.estado_id === 3;
                if (vencido || rechazado) {
                    if (vencido) tiene_lotes_vencidos = true;
                    stock_vencido += disponible;
                } else {
                    stock_vigente += disponible;
                }
            });

            const tieneLotes = (prod.LoteProduccions || prod.LoteProduccion || []).length > 0;
            const stock_disponible = tieneLotes ? stock_vigente : parseFloat(prod.stock_actual) || 0;

            const stock_minimo = parseFloat(prod.stock_minimo) || 0;
            let estado_stock = 'ACTIVO';
            if (stock_disponible <= 0) estado_stock = 'SIN_STOCK';
            else if (stock_disponible <= stock_minimo) estado_stock = 'CRITICO';

            return {
                ...prod,
                stock_disponible,
                stock_vencido,
                estado_stock,
                tiene_lotes_vencidos
            };
        });

        return res.json({ data });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al obtener el catálogo.' });
    }
});


// Validar que todas las rutas de productos exijan autenticación
router.use(auth);

// CUIDADO: Rutas estáticas deben ir antes que rutas con parámetros como /:id
router.get('/stats', stats);

router.get('/', listar);
router.get('/:id', obtener);
router.get('/:id/lotes', obtenerLotes);

// Rutas de administración exigen ADMIN
router.post('/', requireRol('ADMIN'), crear);
router.put('/:id', requireRol('ADMIN'), actualizar);
router.delete('/:id', requireRol('ADMIN'), eliminar);

module.exports = router;
