const express = require('express');
const router = express.Router();
const pedidosWebController = require('../controllers/pedidosWebController');
const { despacharPedido } = require('../controllers/despachoController');
const { autenticar, requireRol } = require('../middleware/authMiddleware');

router.post('/', pedidosWebController.crearDesdeWeb);

router.get('/', autenticar, pedidosWebController.listar);
router.get('/stats', autenticar, pedidosWebController.stats);
router.get('/cliente/:clienteId', autenticar, pedidosWebController.historialPorCliente);
router.put('/:id/estado', autenticar, pedidosWebController.actualizarEstado);
router.post('/:id/despachar', autenticar, requireRol('ADMIN', 'ALMACEN'), despacharPedido);

module.exports = router;
