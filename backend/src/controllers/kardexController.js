'use strict';

const { Op } = require('sequelize');
const { Producto, MovimientoKardex, Usuario, TipoMovimiento, Alerta, LoteProduccion, sequelize } = require('../models');
const notificaciones = require('../services/notificaciones');

const entrada = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { producto_id, cantidad, lote_id, referencia_tipo, referencia_id, motivo } = req.body;
        if (!producto_id || cantidad === undefined || cantidad <= 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Producto y cantidad validos son requeridos.' });
        }
        const producto = await Producto.findOne({ where: { id: producto_id, estado: true }, lock: transaction.LOCK.UPDATE, transaction });
        if (!producto) throw new Error('Producto no encontrado o inactivo.');
        const cantFloat = parseFloat(cantidad);
        const stock_anterior = parseFloat(producto.stock_actual);
        const stock_nuevo = stock_anterior + cantFloat;
        const fechaVenc = req.body.fecha_vencimiento || null;
        let valid_lote_id = lote_id || null;
        if (!valid_lote_id && req.body.codigo_lote) {
            let loteExistente = await LoteProduccion.findOne({ where: { producto_id, numero_lote: req.body.codigo_lote }, transaction });
            if (loteExistente) {
                valid_lote_id = loteExistente.id;
                await loteExistente.update({
                    cantidad_producida: parseFloat(loteExistente.cantidad_producida) + cantFloat,
                    // Si el lote no tenía vencimiento y ahora lo envían, se completa
                    fecha_vencimiento: loteExistente.fecha_vencimiento || fechaVenc
                }, { transaction });
            } else {
                const nuevoLote = await LoteProduccion.create({
                    producto_id, numero_lote: req.body.codigo_lote, cantidad_producida: cantFloat,
                    fecha_produccion: new Date(),
                    fecha_vencimiento: fechaVenc,
                    estado_id: 2, registrado_por: req.usuario ? req.usuario.id : 1
                }, { transaction });
                valid_lote_id = nuevoLote.id;
            }
        }
        const movimiento = await MovimientoKardex.create({
            producto_id, usuario_id: req.usuario ? req.usuario.id : 1, tipo_movimiento_id: 1,
            cantidad: cantFloat, stock_anterior, stock_nuevo,
            referencia_tipo: referencia_tipo || 'ORDEN', referencia_id: referencia_id || null,
            lote_id: valid_lote_id, motivo: motivo || 'Entrada de producto'
        }, { transaction });
        await producto.update({ stock_actual: stock_nuevo }, { transaction });
        await transaction.commit();
        return res.status(201).json({ movimiento, stock_nuevo });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

const salida = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { producto_id, cantidad, referencia_tipo, referencia_id, motivo } = req.body;
        let loteReal = null;
        if (req.body.codigo_lote) {
            loteReal = await LoteProduccion.findOne({ where: { numero_lote: req.body.codigo_lote }, transaction });
        } else if (req.body.lote_id) {
            loteReal = await LoteProduccion.findByPk(req.body.lote_id, { transaction });
        }
        if (!loteReal) {
            await transaction.rollback();
            return res.status(422).json({ error: 'No se puede registrar salida sin especificar un número de lote válido.' });
        }
        const valid_lote_id = loteReal.id;
        if (!producto_id || cantidad === undefined || cantidad <= 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Producto y cantidad son requeridos.' });
        }
        const producto = await Producto.findOne({ where: { id: producto_id, estado: true }, lock: transaction.LOCK.UPDATE, transaction });
        if (!producto) throw new Error('Producto no encontrado.');
        const numCantidad = parseFloat(cantidad);
        const stock_actual = parseFloat(producto.stock_actual);
        if (numCantidad > stock_actual) {
            await transaction.rollback();
            return res.status(422).json({ error: 'Stock insuficiente', stock_disponible: stock_actual, cantidad_solicitada: numCantidad });
        }
        const stock_nuevo = stock_actual - numCantidad;
        const movimiento = await MovimientoKardex.create({
            producto_id, usuario_id: req.usuario ? req.usuario.id : 1, tipo_movimiento_id: 2,
            cantidad: numCantidad, stock_anterior: stock_actual, stock_nuevo,
            referencia_tipo: referencia_tipo || 'GUIA', referencia_id: referencia_id || null,
            lote_id: valid_lote_id, motivo: motivo || 'Salida de producto'
        }, { transaction });
        await producto.update({ stock_actual: stock_nuevo }, { transaction });
        let alerta_generada = null;
        if (stock_nuevo <= parseFloat(producto.stock_minimo)) {
            const tipo_id = stock_nuevo === 0 ? 2 : 1;
            alerta_generada = await Alerta.create({ tipo_id, producto_id, mensaje: `Atención: Stock Riesgo ${producto.nombre}. Quedan ${stock_nuevo} uds.` }, { transaction });
            if (notificaciones && notificaciones.enviarPushStockCritico) {
                notificaciones.enviarPushStockCritico(producto, stock_nuevo).catch(e => console.error(e));
            }
        }
        await transaction.commit();
        return res.status(201).json({ movimiento, stock_nuevo, alerta_generada });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

const listar = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;
        const { producto_id, tipo_movimiento_id, fecha_inicio, fecha_fin } = req.query;
        let where = {};
        if (producto_id) where.producto_id = producto_id;
        if (tipo_movimiento_id) where.tipo_movimiento_id = tipo_movimiento_id;
        if (fecha_inicio || fecha_fin) {
            where.fecha_movimiento = {};
            if (fecha_inicio) where.fecha_movimiento[Op.gte] = new Date(fecha_inicio);
            if (fecha_fin) where.fecha_movimiento[Op.lte] = new Date(fecha_fin);
        }
        const { count, rows } = await MovimientoKardex.findAndCountAll({
            where,
            include: [
                { model: Producto, attributes: ['nombre', 'codigo'] },
                { model: Usuario, attributes: ['nombre'] },
                { model: TipoMovimiento, attributes: ['nombre', 'id'] },
                { model: LoteProduccion, attributes: ['numero_lote', 'fecha_produccion', 'fecha_vencimiento'] }
            ],
            limit, offset, order: [['fecha_movimiento', 'DESC']]
        });
        const data = rows.map(r => r.toJSON());
        return res.json({ data, total: count, page, totalPages: Math.ceil(count / limit) });
    } catch (error) {
        next(error);
    }
};

const obtenerHistorial = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;
        let where = { producto_id: req.params.producto_id };
        const { count, rows } = await MovimientoKardex.findAndCountAll({
            where,
            include: [
                { model: Producto, attributes: ['nombre', 'codigo'] },
                { model: Usuario, attributes: ['nombre'] },
                { model: TipoMovimiento, attributes: ['nombre', 'id'] },
                { model: LoteProduccion, attributes: ['numero_lote', 'fecha_produccion', 'fecha_vencimiento'] }
            ],
            limit, offset, order: [['fecha_movimiento', 'DESC']]
        });
        return res.json({ data: rows, total: count, page, totalPages: Math.ceil(count / limit) });
    } catch (error) {
        next(error);
    }
};

const listarAlmacenes = async (req, res, next) => { return res.json([]); };

const ajuste = async (req, res, next) => res.status(501).json({ error: 'Inhabilitado.' });

const despachoPedidoWeb = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { producto_id, cantidad, precio_unitario, motivo, referencia_id, lote_id } = req.body;
        if (!producto_id || !cantidad || cantidad <= 0 || !lote_id) {
            await transaction.rollback();
            return res.status(400).json({ error: 'producto_id, cantidad y lote_id son requeridos obligatoriamente.' });
        }
        const numPrecio = parseFloat(precio_unitario);
        if (isNaN(numPrecio) || numPrecio <= 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'El precio de venta es obligatorio y debe ser mayor a 0.' });
        }
        const producto = await Producto.findOne({ where: { id: producto_id, estado: true }, lock: transaction.LOCK.UPDATE, transaction });
        if (!producto) {
            await transaction.rollback();
            return res.status(404).json({ error: `Producto ID ${producto_id} no encontrado.` });
        }
        const lote = await LoteProduccion.findByPk(lote_id, { transaction });
        if (!lote) {
            await transaction.rollback();
            return res.status(404).json({ error: `Lote ID ${lote_id} no encontrado.` });
        }
        if (lote.estado_id === 3) {
            await transaction.rollback();
            return res.status(409).json({ error: `El lote ${lote.numero_lote || lote_id} está RECHAZADO y no puede despacharse.`, codigo: 'LOTE_RECHAZADO' });
        }
        if (lote.fecha_vencimiento) {
            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            const venc = new Date(lote.fecha_vencimiento);
            if (venc < hoy) {
                await Alerta.create({ tipo_id: 3, producto_id, mensaje: `⛔ Intento de despacho BLOQUEADO: lote ${lote.numero_lote || lote_id} de "${producto.nombre}" venció el ${venc.toISOString().slice(0, 10)}.` }, { transaction });
                await transaction.commit();
                return res.status(409).json({ error: `No se puede despachar el lote ${lote.numero_lote || lote_id} de "${producto.nombre}": venció el ${venc.toISOString().slice(0, 10)}.`, codigo: 'LOTE_VENCIDO', fecha_vencimiento: venc.toISOString().slice(0, 10) });
            }
        }
        const numCantidad = parseFloat(cantidad);
        const stock_actual = parseFloat(producto.stock_actual);
        if (numCantidad > stock_actual) {
            await transaction.rollback();
            return res.status(422).json({ error: `Stock insuficiente para "${producto.nombre}". Disponible: ${stock_actual}, solicitado: ${numCantidad}` });
        }
        const stock_anterior = stock_actual;
        const stock_nuevo = stock_anterior - numCantidad;
        const movimiento = await MovimientoKardex.create({
            producto_id, usuario_id: req.usuario ? req.usuario.id : 1, tipo_movimiento_id: 2,
            cantidad: numCantidad, precio_unitario: numPrecio, stock_anterior, stock_nuevo,
            referencia_tipo: 'PEDIDO_WEB', referencia_id: referencia_id || null, lote_id: lote_id || null,
            motivo: motivo || 'Despacho pedido web'
        }, { transaction });
        await producto.update({ stock_actual: stock_nuevo }, { transaction });
        let alertaStock = false;
        if (stock_nuevo <= parseFloat(producto.stock_minimo || 0)) {
            const tipo_id = stock_nuevo === 0 ? 2 : 1;
            await Alerta.create({ tipo_id, producto_id, mensaje: `Stock en riesgo después de despacho web: ${producto.nombre}. Quedan ${stock_nuevo} uds.` }, { transaction });
            alertaStock = true;
        }
        await transaction.commit();
        if (alertaStock && notificaciones && notificaciones.enviarPushStockCritico) {
            notificaciones.enviarPushStockCritico(producto, stock_nuevo).catch(e => console.error('[Push]', e.message));
        }
        return res.status(201).json({ movimiento, stock_nuevo });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

const reposicion = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { producto_id, cantidad, motivo, doc_guia_remision, doc_factura, doc_orden_compra, codigo_siaf } = req.body;
        let lote = null;
        if (req.body.codigo_lote) {
            lote = await LoteProduccion.findOne({ where: { numero_lote: req.body.codigo_lote }, transaction });
        } else if (req.body.lote_id) {
            lote = await LoteProduccion.findByPk(req.body.lote_id, { transaction });
        }
        if (!lote) {
            await transaction.rollback();
            return res.status(422).json({ error: 'Debe indicar un lote válido para la reposición.' });
        }
        if (!producto_id || cantidad === undefined || cantidad <= 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Producto y cantidad válidos son requeridos.' });
        }
        if (lote.estado_id === 3) {
            await transaction.rollback();
            return res.status(409).json({ error: `El lote ${lote.numero_lote || lote.id} está RECHAZADO.`, codigo: 'LOTE_RECHAZADO' });
        }
        if (lote.fecha_vencimiento) {
            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            if (new Date(lote.fecha_vencimiento) < hoy) {
                await transaction.rollback();
                return res.status(409).json({ error: `El lote ${lote.numero_lote || lote.id} está vencido.`, codigo: 'LOTE_VENCIDO' });
            }
        }
        const producto = await Producto.findOne({ where: { id: producto_id, estado: true }, lock: transaction.LOCK.UPDATE, transaction });
        if (!producto) throw new Error('Producto no encontrado.');
        const numCantidad = parseFloat(cantidad);
        const stock_actual = parseFloat(producto.stock_actual);
        if (numCantidad > stock_actual) {
            await transaction.rollback();
            return res.status(422).json({ error: 'Stock insuficiente', stock_disponible: stock_actual, cantidad_solicitada: numCantidad });
        }
        const stock_nuevo = stock_actual - numCantidad;
        const refs = [];
        if (doc_guia_remision) refs.push(`Guía:${doc_guia_remision}`);
        if (doc_factura) refs.push(`Fact:${doc_factura}`);
        if (doc_orden_compra) refs.push(`O.C.:${doc_orden_compra}`);
        if (codigo_siaf) refs.push(`SIAF:${codigo_siaf}`);
        const motivoFinal = [motivo || 'Reposición por faltante en entrega', refs.join(' ')].filter(Boolean).join(' — ');
        const movimiento = await MovimientoKardex.create({
            producto_id, usuario_id: req.usuario ? req.usuario.id : 1, tipo_movimiento_id: 2,
            cantidad: numCantidad, stock_anterior: stock_actual, stock_nuevo,
            referencia_tipo: 'REPOSICION', referencia_id: null, lote_id: lote.id, motivo: motivoFinal
        }, { transaction });
        await producto.update({ stock_actual: stock_nuevo }, { transaction });
        let alerta_generada = null;
        if (stock_nuevo <= parseFloat(producto.stock_minimo || 0)) {
            const tipo_id = stock_nuevo === 0 ? 2 : 1;
            alerta_generada = await Alerta.create({ tipo_id, producto_id, mensaje: `Atención: Stock Riesgo ${producto.nombre}. Quedan ${stock_nuevo} uds.` }, { transaction });
        }
        await transaction.commit();
        if (alerta_generada && notificaciones && notificaciones.enviarPushStockCritico) {
            notificaciones.enviarPushStockCritico(producto, stock_nuevo).catch(e => console.error('[Push]', e.message));
        }
        return res.status(201).json({ movimiento, stock_nuevo, alerta_generada });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

const canje = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { producto_id, cantidad, lote_defectuoso_id, lote_reemplazo_id, motivo, referencia_id } = req.body;
        if (!producto_id || cantidad <= 0 || !lote_defectuoso_id || !lote_reemplazo_id) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Faltan parámetros obligatorios para el canje.' });
        }
        const producto = await Producto.findOne({ where: { id: producto_id, estado: true }, lock: transaction.LOCK.UPDATE, transaction });
        if (!producto) throw new Error('Producto no encontrado.');
        const numCantidad = parseFloat(cantidad);
        const stock_actual = parseFloat(producto.stock_actual);
        const stock_intermedio = stock_actual + numCantidad;
        await MovimientoKardex.create({
            producto_id, usuario_id: req.usuario ? req.usuario.id : 1, tipo_movimiento_id: 4,
            cantidad: numCantidad, stock_anterior: stock_actual, stock_nuevo: stock_intermedio,
            referencia_tipo: 'CANJE', referencia_id: referencia_id || null, lote_id: lote_defectuoso_id,
            motivo: motivo || 'Entrada por lote defectuoso'
        }, { transaction });
        const stock_final = stock_intermedio - numCantidad;
        await MovimientoKardex.create({
            producto_id, usuario_id: req.usuario ? req.usuario.id : 1, tipo_movimiento_id: 5,
            cantidad: numCantidad, stock_anterior: stock_intermedio, stock_nuevo: stock_final,
            referencia_tipo: 'CANJE', referencia_id: referencia_id || null, lote_id: lote_reemplazo_id,
            motivo: motivo || 'Salida de lote de reemplazo'
        }, { transaction });
        await producto.update({ stock_actual: stock_final }, { transaction });
        await transaction.commit();
        return res.status(201).json({ mensaje: 'Canje procesado exitosamente en una sola transacción.' });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

module.exports = { entrada, salida, ajuste, listar, obtenerHistorial, listarAlmacenes, despachoPedidoWeb, reposicion, canje };
