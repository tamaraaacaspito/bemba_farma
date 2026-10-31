const axios = require('axios');
require('dotenv').config();

async function testV1() {
    const API_KEY = process.env.GEMINI_API_KEY;
    const MODEL = 'gemini-1.5-flash';
    // USANDO V1 EN LUGAR DE V1BETA
    const URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${API_KEY}`;

    try {
        console.log(`Probando V1 Estable con modelo: ${MODEL}...`);
        const res = await axios.post(URL, {
            contents: [{ parts: [{ text: 'hola' }] }]
        });
        console.log('[SUCCESS] ¡V1 RESPONDIÓ!');
        console.log('Respuesta:', res.data.candidates[0].content.parts[0].text);
    } catch (e) {
        console.log(`[FAIL] V1 también falló: ${e.response?.status} - ${e.message}`);
        if (e.response) console.log('Detalle:', JSON.stringify(e.response.data));
    }
}

testV1();
