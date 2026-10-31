'use strict';
/**
 * src/routes/dispositivos.routes.js
 * Registro de dispositivos móviles para notificaciones push (Azure Notification Hubs).
 *
 *   POST /api/dispositivos/registrar  → registra el token FCM del dispositivo
 *
 * El cuerpo espera: { token, installationId?, tags? }
 * El token se asocia al tag 'almacen' para recibir alertas de stock/anomalías.
 */

const express = require('express');
const router  = express.Router();
const { auth } = require('../middleware/authMiddleware');
const notificaciones = require('../services/notificaciones');

router.post('/registrar', auth, async (req, res) => {
    try {
        const { token, installationId, tags } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'El token FCM es obligatorio.' });
        }
        const resultado = await notificaciones.registrarDispositivo(
            token,
            installationId,
            Array.isArray(tags) && tags.length ? tags : ['almacen']
        );
        return res.json({ mensaje: 'Dispositivo registrado para notificaciones.', ...resultado });
    } catch (error) {
        console.error('[Dispositivos] Error registrando:', error.message);
        return res.status(500).json({ error: 'No se pudo registrar el dispositivo.' });
    }
});

module.exports = router;
