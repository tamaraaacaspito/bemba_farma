const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // La SDK de JS no tiene un método directo listModels() tan simple, 
        // pero podemos intentar inicializar los comunes para ver cuál responde.
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
        
        console.log('--- DIAGNÓSTICO DE MODELOS ---');
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent('hi');
                console.log(`[OK] Modelo '${m}' está disponible.`);
            } catch (e) {
                console.log(`[FAIL] Modelo '${m}' falló: ${e.message}`);
            }
        }
    } catch (err) {
        console.error('Error general:', err.message);
    }
}

listModels();
