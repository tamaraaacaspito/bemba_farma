const iaService = require('../src/services/iaService');
require('dotenv').config();

async function test() {
    try {
        console.log('Probando context...');
        const ctx = await iaService.getInventoryContext();
        console.log('Contexto obtenido (longitud):', ctx.length);
        
        console.log('Probando chat...');
        const res = await iaService.askAzureGPT([{ role: 'user', content: 'hola' }], 'Contexto de prueba');
        console.log('Respuesta:', res);
    } catch (e) {
        console.error('Error en test:', e.message);
    }
}

test();
