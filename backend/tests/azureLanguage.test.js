'use strict';
/**
 * Prueba de degradación elegante del servicio Azure Language.
 * Sin las variables AZURE_LANGUAGE_*, el módulo NO debe crashear al importarse
 * y analizarIntencion debe devolver intención neutra para que actúe el NLP local.
 */

describe('azureLanguageService (degradación elegante)', () => {

    beforeAll(() => {
        delete process.env.AZURE_LANGUAGE_ENDPOINT;
        delete process.env.AZURE_LANGUAGE_KEY;
        delete process.env.AZURE_LANGUAGE_PROJECT;
        delete process.env.AZURE_LANGUAGE_DEPLOYMENT;
    });

    test('importar el módulo sin credenciales NO lanza excepción', () => {
        expect(() => require('../src/services/azureLanguageService')).not.toThrow();
    });

    test('analizarIntencion devuelve intención "None" cuando CLU está deshabilitado', async () => {
        const azure = require('../src/services/azureLanguageService');
        const resultado = await azure.analizarIntencion('buscar paracetamol');
        expect(resultado).toEqual({ intent: 'None', entities: [] });
    });
});
