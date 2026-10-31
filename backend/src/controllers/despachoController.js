'use strict';
/**
 * despachoController.js
 * Despacho consolidado de un pedido web:
 *   1) Crea/vincula el Cliente (RUC) a partir de los datos del pedido.
 *   2) Registra las salidas de kardex (bloqueando lotes vencidos/rechazados).
 *   3) Genera la Factura o Boleta (borrador) con sus detalles.
 *   4) Genera la Guía de Remisión DESPACHO (borrador) vinculada a la factura.
 *   5) Marca el pedido como ATENDIDO.
 * Todo en una sola transacción: si un lote está vencido, no se despacha nada.
 */

const {
    PedidoWeb, ClienteWeb, Cliente, Producto, LoteProduccion, MovimientoKardex,
    Factura, DetalleFactura, GuiaRemision, DetalleGuia, Alerta, sequelize
} = require('../models');
const notificaciones = require('../services/notificaciones');
let emailService = null;
try { emailService = require('../services/emailService'); } catch (_) { /* opcional */ }

// Deriva/crea el Cliente (RUC) a partir del pedido y su cuenta web.
async function resolverCliente(pedido, transaction) {
    const cw = pedido.ClienteWeb || null;
    let ruc = ((cw && cw.ruc_dni) || '').replace(/\D/g, '').slice(0, 11);
    if (!ruc) ruc = ('PED' + String(pedido.id)).slice(0, 11); // placeholder editable
    const razon_social = pedido.entidad || pedido.nombre_completo || `Cliente pedido ${pedido.id}`;

    let cliente = await Cliente.findOne({ where: { ruc }, transaction });
    if (!cliente) {
        cliente = await Cliente.create({
            ruc,
            razon_social,
            tipo_entidad: 'PUBLICA',
            email: pedido.email || null,
            telefono: pedido.telefono || null
        }, { transaction });
    }
    return cliente;
}

// POST /api/pedidos-web/:id/despachar
const despacharPedido = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { tipo_documento, numero_documento, generar_guia } = req.body;
        const productos = Array.isArray(req.body.productos) ? req.body.productos : [];

        const pedido = await PedidoWeb.findByPk(id, {
            include: [{ model: ClienteWeb, as: 'ClienteWeb', required: false }],
            transaction: t
        });
        if (!pedido) {
            await t.rollback();
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        if (productos.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'No hay productos para despachar.' });
        }

        // 1) Cliente
        const cliente = await resolverCliente(pedido, t);

        // 2) Salidas de kardex + validaciones
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const detalles = [];
        const alertas = [];
        let total = 0;

        for (const item of productos) {
            const producto_id = item.producto_id || item.id;
            const cantidad = parseFloat(item.cantidad);
            const precio = parseFloat(item.precio_unitario);
            const lote_id = item.lote_id;

            if (!producto_id || !cantidad || cantidad <= 0 || !lote_id) {
                await t.rollback();
                return res.status(400).json({ error: 'Cada producto requiere producto, cantidad y lote.' });
            }
            if (isNaN(precio) || precio <= 0) {
                await t.rollback();
                return res.status(400).json({ error: 'Cada producto requiere un precio de venta mayor a 0.' });
            }

            const producto = await Producto.findOne({
                where: { id: producto_id, estado: true },
                lock: t.LOCK.UPDATE, transaction: t
            });
            if (!producto) {
                await t.rollback();
                return res.status(404).json({ error: `Producto ID ${producto_id} no encontrado.` });
            }

            const lote = await LoteProduccion.findByPk(lote_id, { transaction: t });
            if (!lote) {
                await t.rollback();
                return res.status(404).json({ error: `Lote ID ${lote_id} no encontrado.` });
            }
            if (lote.estado_id === 3) {
                await t.rollback();
                return res.status(409).json({ error: `El lote ${lote.numero_lote || lote_id} de "${producto.nombre}" está RECHAZADO.`, codigo: 'LOTE_RECHAZADO' });
            }
            if (lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) < hoy) {
                await t.rollback();
                return res.status(409).json({
                    error: `No se puede despachar el lote ${lote.numero_lote || lote_id} de "${producto.nombre}": venció el ${new Date(lote.fecha_vencimiento).toISOString().slice(0, 10)}.`,
                    codigo: 'LOTE_VENCIDO'
                });
            }

            const stock_actual = parseFloat(producto.stock_actual);
            if (cantidad > stock_actual) {
                await t.rollback();
                return res.status(422).json({ error: `Stock insuficiente para "${producto.nombre}". Disponible: ${stock_actual}, solicitado: ${cantidad}` });
            }
            const stock_nuevo = stock_actual - cantidad;

            await MovimientoKardex.create({
                producto_id,
                usuario_id: req.usuario ? req.usuario.id : 1,
                tipo_movimiento_id: 2, // SALIDA
                cantidad,
                precio_unitario: precio,
                stock_anterior: stock_actual,
                stock_nuevo,
                referencia_tipo: 'PEDIDO_WEB',
                referencia_id: pedido.id,
                lote_id,
                motivo: `Despacho pedido web #REQ-${String(pedido.id).padStart(4, '0')} — ${cliente.razon_social}`
            }, { transaction: t });

            await producto.update({ stock_actual: stock_nuevo }, { transaction: t });

            if (stock_nuevo <= parseFloat(producto.stock_minimo || 0)) {
                await Alerta.create({
                    tipo_id: stock_nuevo === 0 ? 2 : 1,
                    producto_id,
                    mensaje: `Stock en riesgo tras despacho: ${producto.nombre}. Quedan ${stock_nuevo} uds.`
                }, { transaction: t });
                alertas.push({ producto, stock_nuevo });
            }

            detalles.push({ producto_id, lote_id, cantidad, precio_unitario: precio });
            total += precio * cantidad;
        }

        // 3) Factura / Boleta (borrador)
        const factura = await Factura.create({
            cliente_id: cliente.id,
            usuario_id: req.usuario ? req.usuario.id : 1,
            tipo_documento: (tipo_documento === 'BOLETA') ? 'BOLETA' : 'FACTURA',
            numero_factura: numero_documento || null,
            fecha_emision: new Date(),
            total,
            estado_id: 1 // BORRADOR
        }, { transaction: t });

        await DetalleFactura.bulkCreate(detalles.map(d => ({ ...d, factura_id: factura.id })), { transaction: t });

        // 4) Guía de Remisión DESPACHO (borrador) vinculada a la factura
        let guia = null;
        if (generar_guia !== false) {
            guia = await GuiaRemision.create({
                cliente_id: cliente.id,
                usuario_id: req.usuario ? req.usuario.id : 1,
                numero_guia: null,
                fecha_emision: new Date(),
                estado_id: 1, // PENDIENTE
                factura_id: factura.id,
                tipo_guia: 'DESPACHO'
            }, { transaction: t });

            await DetalleGuia.bulkCreate(detalles.map(d => ({
                guia_id: guia.id,
                producto_id: d.producto_id,
                lote_id: d.lote_id,
                cantidad: d.cantidad,
                precio_unitario: d.precio_unitario
            })), { transaction: t });
        }

        // 5) Pedido → ATENDIDO
        await pedido.update({ estado: 'ATENDIDO' }, { transaction: t });

        await t.commit();

        // Notificaciones (best-effort, fuera de la transacción)
        alertas.forEach(a => {
            if (notificaciones?.enviarPushStockCritico) {
                notificaciones.enviarPushStockCritico(a.producto, a.stock_nuevo).catch(e => console.error('[Push]', e.message));
            }
        });
        if (emailService?.notificarEstadoPedido) {
            emailService.notificarEstadoPedido({
                email: pedido.email,
                nombre: pedido.nombre_completo,
                estado: 'ATENDIDO',
                pedidoId: pedido.id,
                productos: pedido.productos_cotizados
            }).catch(e => console.error('[Email]', e.message));
        }

        return res.status(201).json({
            mensaje: 'Despacho procesado.',
            cliente: { id: cliente.id, razon_social: cliente.razon_social, ruc: cliente.ruc },
            factura: { id: factura.id, tipo_documento: factura.tipo_documento, total },
            guia: guia ? { id: guia.id, tipo_guia: guia.tipo_guia } : null
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

module.exports = { despacharPedido };
