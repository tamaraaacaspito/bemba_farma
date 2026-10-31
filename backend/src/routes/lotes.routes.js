'use strict';
const express = require('express');
const router = express.Router();
const { listar } = require('../controllers/lotesController');
const { auth } = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', listar);

module.exports = router;
