'use strict';

const express = require('express');
const router = express.Router();
const { login, registro } = require('../controllers/authController');
const { auth, requireRol } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/registro', auth, requireRol('ADMIN'), registro);

module.exports = router;
