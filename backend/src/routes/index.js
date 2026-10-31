'use strict';
const express = require('express');
const router  = express.Router();

router.get('/health', (_req, res) => {
    res.json({ estado: 'OK', servicio: 'Droguería EKA API', version: '1.0.0', timestamp: new Date().toISOString() });
});

router.use('/auth',        require('./auth'));
router.use('/usuarios',    require('./usuarios.routes'));
router.use('/productos',   require('./productos'));
router.use('/categorias',  require('./categorias'));
router.use('/kardex',      require('./kardex'));
router.use('/ordenes',     require('./ordenes.routes'));
router.use('/pedidos-web', require('./pedidos_web.routes'));
router.use('/clientes-web', require('./clientes_web.routes'));
router.use('/clientes',    require('./clientes.routes'));
router.use('/proveedores', require('./proveedores.routes'));
router.use('/facturas',    require('./facturas.routes'));
router.use('/guias',       require('./guias.routes'));
router.use('/lotes',       require('./lotes.routes'));
router.use('/documentos',  require('./documentos.routes'));
router.use('/reportes',    require('./reportes'));
router.use('/ia',          require('./ia'));
router.use('/alertas',     require('./alertas.routes'));
router.use('/dispositivos', require('./dispositivos.routes'));

module.exports = router;
