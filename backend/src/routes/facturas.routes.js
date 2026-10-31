'use strict';
/**
 * src/routes/facturas.routes.js
 * Facturas y boletas de venta.
 */

const express = require('express');
const router  = express.Router();
const { auth, requireRol } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/facturasController');

router.use(auth);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireRol('ADMIN', 'ALMACEN'), ctrl.crear);
router.patch('/:id/anular', requireRol('ADMIN', 'ALMACEN'), ctrl.anular);

module.exports = router;
