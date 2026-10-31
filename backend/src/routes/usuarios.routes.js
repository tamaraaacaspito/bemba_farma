'use strict';

const express = require('express');
const router = express.Router();
const { auth, requireRol } = require('../middleware/authMiddleware');
const usuariosController = require('../controllers/usuariosController');

// Todos los endpoints de gestión de usuarios requieren ADMIN
router.use(auth, requireRol('ADMIN'));

router.get('/', usuariosController.getUsuarios);
router.post('/', usuariosController.crearUsuario);
router.put('/:id', usuariosController.actualizarUsuario);
router.patch('/:id/password', usuariosController.actualizarPassword);
router.patch('/:id/toggle-activo', usuariosController.toggleActivo);

module.exports = router;
