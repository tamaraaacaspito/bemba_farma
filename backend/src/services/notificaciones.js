'use strict';

const { NotificationHubsClient, createFcmV1Notification } = require('@azure/notification-hubs');
require('dotenv').config();

const connectionString = process.env.AZURE_NH_CONNECTION_STRING;
const hubName = process.env.AZURE_NH_NAME;

let nhClient = null;

// El cliente se crea si hay credenciales (en cualquier entorno). Si faltan,
// el servicio degrada de forma elegante (modo mock) sin romper el servidor.
if (connectionString && hubName) {
    try {
        nhClient = new NotificationHubsClient(connectionString, hubName);
    } catch (err) {
        console.warn('[Azure NH] No se pudo inicializar el cliente:', err.message);
        nhClient = null;
    }
} else {
    console.warn('⚠️ AZURE_NH_CONNECTION_STRING o AZURE_NH_NAME no definidos — push en modo MOCK (solo logs).');
}

const registrarDispositivo = async (fcmToken, installationId, tags = ['almacen']) => {
    if (!fcmToken) {
        throw new Error('fcmToken es obligatorio para registrar el dispositivo.');
    }

    const installation = {
        installationId: installationId || `eka-${Buffer.from(fcmToken).toString('base64').slice(0, 24)}`,
        platform: 'fcmv1',
        pushChannel: fcmToken,
        tags
    };

    if (!nhClient) {
        console.log('\n[NH MOCK] Registro de dispositivo (no se envió a Azure):');
        console.log(JSON.stringify({ installationId: installation.installationId, tags }, null, 2));
        return { ok: true, mock: true };
    }

    try {
        await nhClient.createOrUpdateInstallation(installation);
        console.log(`[Azure NH] Dispositivo registrado: ${installation.installationId} (tags: ${tags.join(', ')})`);
        return { ok: true };
    } catch (error) {
        console.error('[Azure NH] Error registrando dispositivo:', error.message);
        throw error;
    }
};

const enviarPushStockCritico = async (producto, stockActual) => {
    const payload = {
        message: {
            notification: {
                title: '⚠️ Stock Crítico — Droguería EKA',
                body: `${producto.nombre} [${producto.codigo}]: ${stockActual} unidades`
            },
            data: { productoId: String(producto.id), tipo: 'STOCK_CRITICO' }
        }
    };

    if (!nhClient) {
        console.log('[NOTIFICACIÓN MOCK - SIN CREDENCIALES NH]', JSON.stringify(payload.message));
        return;
    }

    try {
        const notification = createFcmV1Notification(payload);
        await nhClient.sendNotification(notification, { tags: ['almacen'] });
        console.log(`[Azure NH] Notificación Stock Crítico enviada - Producto: ${producto.codigo}`);
    } catch (error) {
        console.error('[Azure NH] Error enviando alerta de Stock Crítico:', error);
    }
};

const enviarPushAnomaliaDetectada = async (producto, descripcion) => {
    const payload = {
        message: {
            notification: {
                title: '🔍 Anomalía detectada en inventario',
                body: descripcion
            },
            data: { productoId: String(producto.id), tipo: 'ANOMALIA' }
        }
    };

    if (!nhClient) {
        console.log('[NOTIFICACIÓN MOCK - SIN CREDENCIALES NH]', JSON.stringify(payload.message));
        return;
    }

    try {
        const notification = createFcmV1Notification(payload);
        await nhClient.sendNotification(notification, { tags: ['almacen'] });
        console.log(`[Azure NH] Notificación Anomalía enviada - Producto: ${producto.codigo}`);
    } catch (error) {
        console.error('[Azure NH] Error enviando alerta de Anomalía:', error);
    }
};

module.exports = {
    registrarDispositivo,
    enviarPushStockCritico,
    enviarPushAnomaliaDetectada
};
