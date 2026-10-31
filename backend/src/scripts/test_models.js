'use strict';
const axios = require('axios');
require('dotenv').config();

async function listModels() {
    const API_KEY = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    console.log('--- DIAGNÓSTICO DE MODELOS GEMINI ---');
    console.log('Usando API KEY:', API_KEY.substring(0, 10) + '...');
    
    try {
        const response = await axios.get(url);
        console.log('\n✅ MODELOS DISPONIBLES EN TU CUENTA:');
        response.data.models.forEach(m => {
            console.log(`- ${m.name.replace('models/', '')} [${m.supportedGenerationMethods.join(', ')}]`);
        });
    } catch (error) {
        console.error('\n❌ ERROR AL LISTAR MODELOS:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        } else {
            console.error('Mensaje:', error.message);
        }
    }
}

listModels();
