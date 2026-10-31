const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-1.5-pro-latest',
        'gemini-pro'
    ];
    
    console.log('--- INICIANDO DIAGNÓSTICO PROFUNDO ---');
    for (const m of models) {
        try {
            console.log(`Probando: ${m}...`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent('test');
            const text = result.response.text();
            console.log(`[SUCCESS] Modelo '${m}' RESPONDIÓ: ${text.substring(0,10)}...`);
        } catch (e) {
            console.log(`[FAIL] Modelo '${m}' ERROR: ${e.message}`);
        }
    }
}

listModels();
