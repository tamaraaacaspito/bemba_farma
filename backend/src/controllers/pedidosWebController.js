const { PedidoWeb, ClienteWeb } = require('../models');
const { notificarEstadoPedido } = require('../services/emailService');


// POST /api/pedidos-web (PÚBLICO)
// Recibe datos desde el formulario HTML de la web institucional
const crearDesdeWeb = async (req, res, next) => {
    try {
        // ⚠️ BUGFIX: extraer cliente_web_id y productos_cotizados también
        const { nombre, entidad, email, telefono, mensaje, cliente_web_id, productos_cotizados } = req.body;
        
        if (!nombre || !email || !mensaje) {
            return res.status(400).json({ error: 'Nombre, Email y Mensaje son obligatorios.' });
        }

        const nuevoPedido = await PedidoWeb.create({
            nombre_completo:   nombre,
            entidad:           entidad || null,
            email,
            telefono:          telefono || null,
            mensaje_requerimiento: mensaje,
            estado:            'NUEVO',
            cliente_web_id:    cliente_web_id || null,
            productos_cotizados: productos_cotizados || null
        });

        return res.status(201).json({ 
            mensaje: 'Cotización enviada con éxito', 
            pedido: nuevoPedido 
        });
    } catch (error) {
        next(error);
    }
};


// GET /api/pedidos-web (PRIVADO - ADMIN/ALMACEN)
const listar = async (req, res, next) => {
    try {
        const estado = req.query.estado;
        let where = {};
        if (estado) {
            where.estado = estado;
        }

        const pedidos = await PedidoWeb.findAll({
            where,
            order: [['fecha_recepcion', 'DESC']]
        });

        return res.json({ data: pedidos });
    } catch (error) {
        next(error);
    }
};

// PUT /api/pedidos-web/:id/estado (PRIVADO)
const actualizarEstado = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const pedido = await PedidoWeb.findByPk(id, {
            include: [{ model: ClienteWeb, as: 'ClienteWeb', attributes: ['email', 'nombre_completo'], required: false }]
        });
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido Web no encontrado' });
        }

        await pedido.update({ estado });

        // Enviar notificación por email (asíncrono, no bloquea la respuesta)
        const emailDestino = pedido.ClienteWeb?.email || pedido.email;
        const nombreDestino = pedido.ClienteWeb?.nombre_completo || pedido.nombre_completo;
        if (emailDestino) {
            notificarEstadoPedido({
                email: emailDestino,
                nombre: nombreDestino,
                estado,
                pedidoId: pedido.id,
                productos: pedido.productos_cotizados
            }).catch(e => console.error('[EmailService]', e.message));
        }

        return res.json({ mensaje: 'Estado actualizado correctamente', pedido });
    } catch (error) {
        next(error);
    }
};


// GET /api/pedidos-web/stats
const stats = async (req, res, next) => {
    try {
        const porAtender = await PedidoWeb.count({ where: { estado: 'NUEVO' } });
        const total = await PedidoWeb.count();
        return res.json({ porAtender, total });
    } catch (error) {
        next(error);
    }
};

// GET /api/pedidos-web/cliente/:clienteId  (PRIVADO - ADMIN)
// Retorna el historial completo de un cliente B2B específico
const historialPorCliente = async (req, res, next) => {
    try {
        const { clienteId } = req.params;
        const pedidos = await PedidoWeb.findAll({
            where: { cliente_web_id: clienteId },
            order: [['fecha_recepcion', 'DESC']]
        });
        return res.json({ data: pedidos });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    crearDesdeWeb,
    listar,
    actualizarEstado,
    stats,
    historialPorCliente
};

