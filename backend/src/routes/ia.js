'use strict';

/**
 * routes/ia.js
 * Endpoints para la integración de Inteligencia Artificial.
 */

const express = require('express');
const router = express.Router();
const azureLanguage = require('../services/azureLanguageService'); 
const chatbotIA = require('../services/chatbotIA'); // Motor local para consultas SQL
const { Alerta, Producto, TipoAlerta } = require('../models');
const { auth } = require('../middleware/authMiddleware');

/**
 * POST /api/ia/chat
 * Recibe un mensaje del usuario, detecta la intención con Azure CLU 
 * y delega la ejecución al motor NLP local para obtener datos de SQL Server.
 */
router.post('/chat', auth, async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'El historial de mensajes es obligatorio.' });
    }

    const ultimoMensaje = messages[messages.length - 1].content;

    try {
        console.log('[Azure CLU] Analizando intención del mensaje...');
        
        // 1. Preguntarle a Azure qué quiere hacer el usuario
        const { intent, entities } = await azureLanguage.analizarIntencion(ultimoMensaje);
        console.log(`[Motor Local] Ejecutando acción para la intención: ${intent}`);
        
        let textoRespuesta = "";

        // Palabras de comando a eliminar para extraer solo el nombre del producto
        const palabrasComando = [
            'buscar', 'busca', 'busqueda', 'stock', 'ver', 'revisar', 'consultar',
            'muestra', 'mostrar', 'dame', 'dime', 'quiero', 'necesito', 'hay',
            'inventario', 'de', 'del', 'el', 'la', 'los', 'las', 'un', 'una',
            'producto', 'medicamento', 'medicina', 'información', 'info', 'sobre'
        ];

        const limpiarNombreProducto = (texto) => {
            return texto
                .toLowerCase()
                .replace(/[¿?¡!]/g, '')
                .split(' ')
                .filter(p => p.length >= 2 && !palabrasComando.includes(p))
                .join(' ')
                .trim();
        };

        // 2. Conectar la intención con tu lógica local de base de datos
        if (intent === "buscar_producto") {
            // Primero intentar usar la entidad que extrajo Azure
            let producto = entities.length > 0 ? entities[0].text : "";

            // Si Azure no extrajo entidad, intentar limpiar el mensaje del usuario
            if (!producto) {
                producto = limpiarNombreProducto(ultimoMensaje);
            }

            if (producto) {
                // Llamar directamente a la búsqueda con el nombre limpio
                const nlpResult = await chatbotIA.procesarPregunta(`stock ${producto}`, messages);
                textoRespuesta = nlpResult.respuesta;

                // Si no encontró nada, puede ser que el mensaje sea sobre stock crítico general
                if (textoRespuesta.includes('No encontré el producto') && 
                    /mínimo|minimo|critico|crítico|bajo|agotado/i.test(ultimoMensaje)) {
                    const fallback = await chatbotIA.procesarPregunta("stock crítico", messages);
                    textoRespuesta = fallback.respuesta;
                }
            } else {
                textoRespuesta = "¿De qué medicamento o producto específico deseas consultar el inventario?";
            }

        } else if (intent === "stock_critico") {
            const nlpResult = await chatbotIA.procesarPregunta("stock crítico", messages);
            textoRespuesta = nlpResult.respuesta;

        } else {
            // Intención 'None' o no reconocida → dejar que el motor local lo intente
            const nlpResult = await chatbotIA.procesarPregunta(ultimoMensaje, messages);
            textoRespuesta = nlpResult.respuesta;
        }

        // 3. Enviar la respuesta a React / Android
        return res.json({ response: textoRespuesta });

    } catch (error) {
        console.error('--- ERROR EN /API/IA/CHAT ---');
        console.error('Detalle:', error.message);
        
        // 4. Fallback de emergencia: Si Azure se cae, el bot sigue funcionando localmente
        try {
            console.warn('[Chat] Falla en Azure CLU — usando motor NLP local como respaldo directo.');
            const nlpResult = await chatbotIA.procesarPregunta(ultimoMensaje, messages);
            
            return res.json({
                response: `⚠️ *[Modo de contingencia activo]*\n\n${nlpResult.respuesta}`,
                modo: 'NLP_LOCAL'
            });

        } catch (nlpError) {
            return res.status(500).json({
                error: 'Hubo un fallo crítico al procesar la consulta en el servidor.',
                detalle: nlpError.message
            });
        }
    }
});

/**
 * GET /api/ia/anomalias
 * Retorna alertas de anomalías y stock crítico no leídas.
 * (INTACTO - No requiere IA para funcionar)
 */
router.get('/anomalias', auth, async (req, res) => {
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
        return res.json(alertas);
    } catch (error) {
        console.error('Error obteniendo anomalías:', error.message);
        return res.status(500).json({ error: 'Error al cargar notificaciones.' });
    }
});

/**
 * PATCH /api/ia/anomalias/:id/leer
 * Marca una alerta como leída.
 */
router.patch('/anomalias/:id/leer', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await Alerta.update({ leida: true }, { where: { id } });
        return res.json({ mensaje: 'Alerta marcada como leída.' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al actualizar alerta.' });
    }
});

module.exports = router;