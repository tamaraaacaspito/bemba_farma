'use strict';
/**
 * src/routes/guias.routes.js
 * Guías de remisión (despacho / reposición).
 */

const express = require('express');
const router  = express.Router();
const { auth, requireRol } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/guiasController');

router.use(auth);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireRol('ADMIN', 'ALMACEN'), ctrl.crear);
router.patch('/:id/anular', requireRol('ADMIN', 'ALMACEN'), ctrl.anular);

module.exports = router;
