const { OrdenCompra, DetalleOrden, Proveedor, Usuario, EstadoOrden } = require('../models');

const listar = async (req, res, next) => {
    try {
        const ordenes = await OrdenCompra.findAll({
            include: [
                { model: Proveedor, attributes: ['razon_social', 'ruc'], required: false },
                { model: Usuario, attributes: ['nombre', 'email'] },
                { model: EstadoOrden, attributes: ['nombre'] }
            ],
            order: [['fecha_emision', 'DESC']]
        });
        return res.json({ data: ordenes });
    } catch (error) {
        next(error);
    }
};

const crear = async (req, res, next) => {
    try {
        const { proveedor_id, proveedor_nombre, numero_orden, fecha_emision, detalles } = req.body;

        if (!proveedor_id && !proveedor_nombre) {
            return res.status(400).json({ error: 'Indica un proveedor (registrado o por nombre).' });
        }

        let estado = await EstadoOrden.findOne({ where: { nombre: 'PENDIENTE' } });
        const estado_id = estado ? estado.id : 1;

        let total = null;
        if (Array.isArray(detalles) && detalles.some(d => d.precio_unitario)) {
            total = detalles.reduce((s, d) => s + (parseFloat(d.precio_unitario) || 0) * (parseFloat(d.cantidad) || 0), 0);
        }

        const nuevaOrden = await OrdenCompra.create({
            proveedor_id: proveedor_id || null,
            proveedor_nombre: proveedor_nombre || null,
            numero_orden: numero_orden || null,
            fecha_emision: fecha_emision || new Date(),
            estado_id,
            usuario_id: req.usuario ? req.usuario.id : 1,
            total
        });

        if (Array.isArray(detalles) && detalles.length > 0) {
            await DetalleOrden.bulkCreate(detalles.map(d => ({
                orden_compra_id: nuevaOrden.id,
                producto_id: d.producto_id || null,
                producto_nombre: d.producto_nombre || null,
                cantidad: d.cantidad,
                precio_unitario: (d.precio_unitario === '' || d.precio_unitario == null) ? null : d.precio_unitario
            })));
        }

        return res.status(201).json({ message: 'Orden generada correctamente', data: nuevaOrden });
    } catch (error) {
        next(error);
    }
};

module.exports = { listar, crear };
