const axios = require('axios');
require('dotenv').config();

async function listAll() {
    const API_KEY = process.env.GEMINI_API_KEY;
    const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        console.log('Solicitando lista de modelos permitidos a Google...');
        const res = await axios.get(URL);
        console.log('[SUCCESS] Modelos encontrados:');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log(`[FAIL] No se pudo obtener la lista: ${e.response?.status} - ${e.message}`);
        if (e.response) console.log('Detalle:', JSON.stringify(e.response.data));
    }
}

listAll();
