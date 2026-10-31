'use strict';
/**
 * src/routes/clientes.routes.js
 * CRUD de clientes (entidades con RUC) para facturación.
 */

const express = require('express');
const router  = express.Router();
const { auth, requireRol } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/clientesController');

router.use(auth);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireRol('ADMIN', 'ALMACEN'), ctrl.crear);
router.put('/:id', requireRol('ADMIN', 'ALMACEN'), ctrl.actualizar);

module.exports = router;
