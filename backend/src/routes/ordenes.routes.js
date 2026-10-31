const express = require('express');
const router = express.Router();
const ordenesController = require('../controllers/ordenesController');
const { autenticar } = require('../middleware/authMiddleware');

// Lectura de Órdenes a Proveedores
router.get('/', autenticar, ordenesController.listar);
// Crear nueva Orden a Proveedor
router.post('/', autenticar, ordenesController.crear);

module.exports = router;
