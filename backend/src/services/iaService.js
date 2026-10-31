'use strict';

const { Op } = require('sequelize');
const { Producto, LoteProduccion, MovimientoKardex, Usuario } = require('../models');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
let model;

if (process.env.GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
    } catch (error) {
        console.warn("⚠️ Advertencia: No se pudo inicializar Google Gemini.", error.message);
    }
}

async function getInventoryContext() {
    const hoy = new Date();
    const hoyMas90 = new Date();
    hoyMas90.setDate(hoy.getDate() + 90);

    const [productosCriticos, lotesProximos, ultimosMovimientos] = await Promise.all([
        Producto.findAll({
            where: {
                stock_actual: {
                    [Op.lt]: Producto.sequelize.col('stock_minimo')
                },
                estado: true
            },
            attributes: ['codigo', 'nombre', 'stock_actual', 'stock_minimo']
        }),
        LoteProduccion.findAll({
            where: {
                fecha_vencimiento: {
                    [Op.between]: [hoy, hoyMas90]
                },
                cantidad_producida: { [Op.gt]: 0 }
            },
            include: [{ model: Producto, attributes: ['nombre'] }],
            attributes: ['numero_lote', 'fecha_vencimiento', 'cantidad_producida']
        }),
        MovimientoKardex.findAll({
            include: [
                { model: Producto, attributes: ['nombre'] },
                { model: LoteProduccion, attributes: ['numero_lote'] },
                { model: Usuario, attributes: ['nombre'] }
            ],
            order: [['fecha_movimiento', 'DESC']],
            limit: 10
        })
    ]);

    // Formatear a string de contexto
    let contexto = "ESTADO ACTUAL DEL INVENTARIO (Contexto de sistema):\n\n";
    
    contexto += "1. PRODUCTOS CON STOCK CRÍTICO (Menor al mínimo):\n";
    if (productosCriticos.length === 0) contexto += "- Ninguno.\n";
    productosCriticos.forEach(p => {
        contexto += `- [${p.codigo}] ${p.nombre} - Stock Actual: ${p.stock_actual} (Mínimo: ${p.stock_minimo})\n`;
    });

    contexto += "\n2. LOTES PRÓXIMOS A VENCER (Próximos 90 días):\n";
    if (lotesProximos.length === 0) contexto += "- Ninguno.\n";
    lotesProximos.forEach(l => {
        contexto += `- Lote: ${l.numero_lote} | Producto: ${l.Producto?.nombre} | Vence: ${l.fecha_vencimiento} | Cantidad: ${l.cantidad_producida}\n`;
    });

    contexto += "\n3. ÚLTIMOS 10 MOVIMIENTOS DE KARDEX:\n";
    if (ultimosMovimientos.length === 0) contexto += "- Ninguno.\n";
    ultimosMovimientos.forEach(m => {
        const tipo = m.tipo_movimiento_id === 1 ? 'ENTRADA' : (m.tipo_movimiento_id === 2 ? 'SALIDA' : 'AJUSTE');
        const fechaFormat = m.fecha_movimiento ? m.fecha_movimiento.toISOString().split('T')[0] : 'Desconocida';
        contexto += `- Fecha: ${fechaFormat} | Producto: ${m.Producto?.nombre} | Tipo: ${tipo} | Cantidad: ${m.cantidad} | Usuario: ${m.Usuario?.nombre}\n`;
    });

    return contexto;
}

async function askAzureGPT(messages, context) {
    if (!model) throw new Error("IA no configurada. Verifica GEMINI_API_KEY en .env");
    
    const systemPrompt = `Eres el asistente inteligente de Drogueria EKA S.A.C. Tienes acceso al estado actual del inventario que se te proporciona. Responde en espanol, de forma profesional, concisa y directa. Si no tienes informacion suficiente, dilo claramente.\n\n${context}`;

    const chat = model.startChat({
        history: (messages || []).slice(-10).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })),
        generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
        },
    });

    const result = await chat.sendMessage(systemPrompt + "\n\nUsuario: " + (messages[messages.length - 1]?.content || "Hola"));
    const response = await result.response;
    return response.text();
}

module.exports = {
    getInventoryContext,
    askAzureGPT
};
