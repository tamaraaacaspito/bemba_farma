const { ConversationAnalysisClient } = require("@azure/ai-language-conversations");
const { AzureKeyCredential } = require("@azure/core-auth");
require('dotenv').config();

// 1. Traer las credenciales de tu "caja fuerte" (.env)
const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT;
const apiKey = process.env.AZURE_LANGUAGE_KEY;
const projectName = process.env.AZURE_LANGUAGE_PROJECT;
const deploymentName = process.env.AZURE_LANGUAGE_DEPLOYMENT;

// Azure CLU solo se activa si TODAS las variables están configuradas.
// Si falta alguna, el servicio degrada de forma elegante (no crashea el server)
// y el chatbot cae automáticamente al motor NLP local.
const azureHabilitado = Boolean(endpoint && apiKey && projectName && deploymentName);

// 2. Instanciar el cliente de Azure de forma perezosa (lazy) y segura.
let client = null;
if (azureHabilitado) {
    try {
        client = new ConversationAnalysisClient(endpoint, new AzureKeyCredential(apiKey), {
            apiVersion: "2023-04-01" // Forzamos a usar la API moderna estable
        });
    } catch (err) {
        console.warn('[Azure AI] No se pudo inicializar el cliente CLU:', err.message);
        client = null;
    }
} else {
    console.warn('[Azure AI] Variables de entorno incompletas — CLU deshabilitado; se usará el motor NLP local.');
}

/**
 * Envía el mensaje del usuario a Azure CLU y devuelve la intención detectada.
 */
async function analizarIntencion(textoUsuario) {
    // Si Azure CLU no está configurado, devolvemos intención neutra
    // para que el motor NLP local se encargue de la consulta.
    if (!client) {
        return { intent: "None", entities: [] };
    }
    try {
        // Estructura obligatoria que pide Microsoft
        const peticion = {
            kind: "Conversation",
            analysisInput: {
                conversationItem: {
                    id: "1", // Un ID genérico para la petición
                    participantId: "Usuario",
                    text: textoUsuario
                }
            },
            parameters: {
                projectName: projectName,
                deploymentName: deploymentName,
                stringIndexType: "Utf16CodeUnit", // Requerido para procesar español correctamente
            }
        };

        // Enviar la petición a la nube
        const respuesta = await client.analyzeConversation(peticion);
        const resultado = respuesta.result.prediction;

        // Extraer lo que nos importa
        const topIntent = resultado.topIntent;
        const entities = resultado.entities;

        console.log(`[Azure AI] Intención detectada: ${topIntent}`);

        return {
            intent: topIntent,
            entities: entities
        };

    } catch (error) {
        console.error("[Azure AI] Error de conexión con Language Studio:", error);
        // Fallback de seguridad para que el bot no se caiga
        return { intent: "None", entities: [] };
    }
}

module.exports = {
    analizarIntencion
};
