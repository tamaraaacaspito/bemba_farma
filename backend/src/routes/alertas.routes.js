'use strict';
/**
 * src/routes/alertas.routes.js
 * Alias de compatibilidad para la app Android.
 *
 * La app llama:
 *   GET   /api/alertas            → lista de alertas no leídas
 *   PATCH /api/alertas/:id/leer   → marcar alerta como leída
 *
 * Estos endpoints son equivalentes a /api/ia/anomalias, pero la app espera
 * la respuesta envuelta en { data: [...] } (ver AlertasListResponse.kt).
 */

const express = require('express');
const router  = express.Router();
const { Alerta, Producto, TipoAlerta } = require('../models');
const { auth } = require('../middleware/authMiddleware');

/**
 * GET /api/alertas
 * Retorna alertas de anomalías y stock crítico no leídas.
 * Respuesta: { data: [...] } para coincidir con AlertasListResponse (Android).
 */
router.get('/', auth, async (_req, res) => {
    try {
        const alertas = await Alerta.findAll({
            where: { leida: false },
            include: [
                { model: Producto, attributes: ['nombre', 'codigo'] },
                { model: TipoAlerta, attributes: ['nombre'] }
            ],
            order: [['fecha_creacion', 'DESC']],
            limit: 20
        });
        return res.json({ data: alertas });
    } catch (error) {
        console.error('Error obteniendo alertas:', error.message);
        return res.status(500).json({ error: 'Error al cargar alertas.' });
    }
});

/**
 * PATCH /api/alertas/:id/leer
 * Marca una alerta como leída.
 */
router.patch('/:id/leer', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await Alerta.update({ leida: true }, { where: { id } });
        return res.json({ mensaje: 'Alerta marcada como leída.' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al actualizar alerta.' });
    }
});

module.exports = router;
