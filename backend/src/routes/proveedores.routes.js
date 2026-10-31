'use strict';
/**
 * src/routes/proveedores.routes.js
 * Listado y registro simple de proveedores.
 */

const express = require('express');
const router  = express.Router();
const { auth, requireRol } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/proveedoresController');

router.use(auth);

router.get('/', ctrl.listar);
router.post('/', requireRol('ADMIN', 'ALMACEN'), ctrl.crear);

module.exports = router;
