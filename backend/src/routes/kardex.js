'use strict';

const express = require('express');
const router = express.Router();
const { entrada, salida, ajuste, listar, obtenerHistorial, listarAlmacenes, despachoPedidoWeb, reposicion, canje } = require('../controllers/kardexController');

const { auth, requireRol } = require('../middleware/authMiddleware');

router.use(auth);

router.post('/entrada', requireRol('ADMIN', 'ALMACEN'), entrada);
router.post('/salida', requireRol('ADMIN', 'ALMACEN'), salida);
router.post('/ajuste', requireRol('ADMIN'), ajuste);
router.post('/despacho-web', requireRol('ADMIN', 'ALMACEN'), despachoPedidoWeb);
router.post('/reposicion', requireRol('ADMIN', 'ALMACEN'), reposicion);
router.post('/canje', requireRol('ADMIN', 'ALMACEN'), canje);

router.get('/', listar);
router.get('/almacenes/listar', listarAlmacenes);
router.get('/producto/:producto_id', obtenerHistorial);
router.get('/:producto_id', obtenerHistorial);

module.exports = router;
