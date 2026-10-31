'use strict';
/**
 * src/config/azure.js
 * Stubs de servicios Azure — se activan cuando NODE_ENV=production.
 * En desarrollo local todo devuelve respuestas simuladas para no depender de la nube.
 */

const esDev = process.env.NODE_ENV !== 'production';

// ── Azure Blob Storage ────────────────────────────────────────────────────────
/**
 * Sube un archivo a Azure Blob Storage.
 * En dev: simula la URL y no sube nada.
 * @param {Buffer} buffer Contenido del archivo
 * @param {string} nombreArchivo Nombre con extensión
 * @returns {Promise<string>} URL pública del blob
 */
async function subirBlob(buffer, nombreArchivo) {
    if (esDev) {
        console.log(`[AZURE-STUB] subirBlob → ${nombreArchivo} (sin subida real en dev)`);
        return `http://localhost:3000/uploads/${nombreArchivo}`;
    }
    // TODO Sprint 4: implementar con @azure/storage-blob
    // const { BlobServiceClient } = require('@azure/storage-blob');
    throw new Error('Azure Blob Storage no configurado en producción aún.');
}

// ── Azure Anomaly Detector ────────────────────────────────────────────────────
/**
 * Envía una serie temporal al servicio Anomaly Detector de Azure.
 * En dev: devuelve datos de prueba.
 * @param {Array<{timestamp: string, value: number}>} series
 * @returns {Promise<object>} resultado del análisis
 */
async function detectarAnomalias(series) {
    if (esDev) {
        console.log('[AZURE-STUB] detectarAnomalias → devolviendo datos simulados');
        return { isAnomaly: false, expectedValue: series[series.length - 1]?.value || 0, stub: true };
    }
    // TODO Sprint 5: implementar con @azure/ai-anomaly-detector
    throw new Error('Azure Anomaly Detector no configurado en producción aún.');
}

// ── Azure OpenAI / GPT-4 ──────────────────────────────────────────────────────
/**
 * Envía un mensaje al chatbot GPT-4 de Azure OpenAI.
 * En dev: devuelve una respuesta hardcodeada.
 * @param {string} mensajeUsuario
 * @returns {Promise<string>} respuesta del asistente
 */
async function preguntarChatbot(mensajeUsuario) {
    if (esDev) {
        console.log(`[AZURE-STUB] chatbot recibió: "${mensajeUsuario}"`);
        return 'Hola, soy el asistente de Droguería EKA. En modo desarrollo solo respondo con datos de prueba.';
    }
    // TODO Sprint 5: implementar con openai SDK apuntando a Azure endpoint
    throw new Error('Azure OpenAI no configurado en producción aún.');
}

module.exports = { subirBlob, detectarAnomalias, preguntarChatbot };
