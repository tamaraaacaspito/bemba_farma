'use strict';

const express = require('express');
const router = express.Router();
const { Categoria } = require('../models');
const { auth } = require('../middleware/authMiddleware');

/**
 * GET /api/categorias
 * Retorna la lista completa de categorías disponibles para el filtrado.
 */
router.get('/', auth, async (req, res, next) => {
    try {
        const categorias = await Categoria.findAll({
            order: [['nombre', 'ASC']]
        });
        return res.json(categorias);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
